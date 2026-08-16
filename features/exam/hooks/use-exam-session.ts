"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import {
  saveGuestAnswer,
  setGuestQuestionState,
} from "@/features/exam/actions/update-guest-attempt";
import type { ExamQuestion } from "@/features/exam/types";

type InitialExamState = {
  answerRevisions: Record<string, number>;
  answers: Record<string, string>;
  flaggedQuestionIds: string[];
  visitedQuestionIds: string[];
};

export function useExamSession(
  questions: ExamQuestion[],
  initialState: InitialExamState,
) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(
    initialState.answers,
  );
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>(
    initialState.flaggedQuestionIds,
  );
  const [visitedQuestions, setVisitedQuestions] = useState<string[]>(() => {
    const firstQuestionId = questions[0]?.id;

    if (
      !firstQuestionId ||
      initialState.visitedQuestionIds.includes(firstQuestionId)
    ) {
      return initialState.visitedQuestionIds;
    }

    return [...initialState.visitedQuestionIds, firstQuestionId];
  });
  const answerRevisions = useRef({ ...initialState.answerRevisions });
  const [syncError, setSyncError] = useState<string>();
  const [isSaving, startSavingTransition] = useTransition();

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const answeredQuestionIds = useMemo(
    () => new Set(Object.keys(answers)),
    [answers],
  );
  const flaggedQuestionIds = useMemo(
    () => new Set(flaggedQuestions),
    [flaggedQuestions],
  );
  const visitedQuestionIds = useMemo(
    () => new Set(visitedQuestions),
    [visitedQuestions],
  );

  function persistQuestionState(
    questionId: string,
    state: { isFlagged?: boolean; isVisited?: boolean },
  ) {
    startSavingTransition(async () => {
      const result = await setGuestQuestionState({
        attemptQuestionId: questionId,
        ...state,
      });

      setSyncError(result.ok ? undefined : result.message);
    });
  }

  function persistAnswer(questionId: string, selectedOptionId: string | null) {
    const nextRevision = (answerRevisions.current[questionId] ?? 0) + 1;
    answerRevisions.current[questionId] = nextRevision;

    startSavingTransition(async () => {
      const result = await saveGuestAnswer({
        attemptQuestionId: questionId,
        revision: nextRevision,
        selectedOptionId,
      });

      setSyncError(result.ok ? undefined : result.message);
    });
  }

  function showQuestion(index: number) {
    if (index < 0 || index >= questions.length) {
      return;
    }

    setCurrentQuestionIndex(index);
    setVisitedQuestions((current) => {
      const questionId = questions[index].id;

      return current.includes(questionId) ? current : [...current, questionId];
    });
    persistQuestionState(questions[index].id, { isVisited: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectAnswer(optionId: string) {
    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: optionId,
    }));
    persistAnswer(currentQuestion.id, optionId);
  }

  function clearResponse() {
    setAnswers((current) => {
      const nextAnswers = { ...current };
      delete nextAnswers[currentQuestion.id];
      return nextAnswers;
    });
    persistAnswer(currentQuestion.id, null);
  }

  function goForward() {
    if (currentQuestionIndex < questions.length - 1) {
      showQuestion(currentQuestionIndex + 1);
      return;
    }

    const firstUnansweredIndex = questions.findIndex(
      (question) => !answers[question.id],
    );

    showQuestion(firstUnansweredIndex === -1 ? 0 : firstUnansweredIndex);
  }

  function markForReviewAndContinue() {
    setFlaggedQuestions((current) =>
      current.includes(currentQuestion.id)
        ? current
        : [...current, currentQuestion.id],
    );
    persistQuestionState(currentQuestion.id, {
      isFlagged: true,
      isVisited: true,
    });
    goForward();
  }

  return {
    answers,
    answeredCount,
    answeredQuestionIds,
    clearResponse,
    currentQuestion,
    currentQuestionIndex,
    flaggedQuestionIds,
    goForward,
    isCurrentQuestionFlagged: flaggedQuestionIds.has(currentQuestion.id),
    isSaving,
    markForReviewAndContinue,
    selectAnswer,
    showQuestion,
    syncError,
    visitedQuestionIds,
  };
}
