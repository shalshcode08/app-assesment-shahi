"use client";

import { useMemo, useState } from "react";

import { EXAM_QUESTIONS } from "@/features/exam/constants/exam-questions";

export function useExamSession() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<number[]>([]);
  const [visitedQuestions, setVisitedQuestions] = useState<number[]>([
    EXAM_QUESTIONS[0].id,
  ]);

  const currentQuestion = EXAM_QUESTIONS[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const answeredQuestionIds = useMemo(
    () => new Set(Object.keys(answers).map(Number)),
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

  function showQuestion(index: number) {
    if (index < 0 || index >= EXAM_QUESTIONS.length) {
      return;
    }

    setCurrentQuestionIndex(index);
    setVisitedQuestions((current) => {
      const questionId = EXAM_QUESTIONS[index].id;

      return current.includes(questionId) ? current : [...current, questionId];
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectAnswer(optionId: string) {
    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: optionId,
    }));
  }

  function clearResponse() {
    setAnswers((current) => {
      const nextAnswers = { ...current };
      delete nextAnswers[currentQuestion.id];
      return nextAnswers;
    });
  }

  function goForward() {
    if (currentQuestionIndex < EXAM_QUESTIONS.length - 1) {
      showQuestion(currentQuestionIndex + 1);
      return;
    }

    const firstUnansweredIndex = EXAM_QUESTIONS.findIndex(
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
    markForReviewAndContinue,
    selectAnswer,
    showQuestion,
    visitedQuestionIds,
  };
}
