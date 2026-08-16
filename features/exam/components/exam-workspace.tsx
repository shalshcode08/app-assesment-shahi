"use client";

import { useCallback, useState, useTransition } from "react";
import { ClipboardCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { beginGuestAttempt } from "@/features/exam/actions/begin-guest-attempt";
import { submitGuestAttempt } from "@/features/exam/actions/update-guest-attempt";
import { CandidateSummary } from "@/features/exam/components/candidate-summary";
import { ExamBrand } from "@/features/exam/components/exam-brand";
import { ExamControls } from "@/features/exam/components/exam-controls";
import { ExamInstructionsDialog } from "@/features/exam/components/exam-instructions-dialog";
import { ExamTimer } from "@/features/exam/components/exam-timer";
import { MobileExamToolbar } from "@/features/exam/components/mobile-exam-toolbar";
import { QuestionNumberGrid } from "@/features/exam/components/question-number-grid";
import { QuestionOptions } from "@/features/exam/components/question-options";
import { QuestionStatusLegend } from "@/features/exam/components/question-status-legend";
import { QuestionStatusSummary } from "@/features/exam/components/question-status-summary";
import { SubmitAssessmentDialog } from "@/features/exam/components/submit-assessment-dialog";
import { useExamSession } from "@/features/exam/hooks/use-exam-session";
import { useAttemptMonitoring } from "@/features/exam/hooks/use-attempt-monitoring";
import type { GuestExamSession } from "@/features/exam/types";

export function ExamWorkspace({ session }: { session: GuestExamSession }) {
  const router = useRouter();
  const [hasStarted, setHasStarted] = useState(
    session.status === "in_progress",
  );
  const [timing, setTiming] = useState({
    expiresAt: session.expiresAt,
    serverNow: session.serverNow,
  });
  const [startError, setStartError] = useState<string>();
  const [expirySubmitError, setExpirySubmitError] = useState<string>();
  const [isStarting, startTransition] = useTransition();
  const [, startExpirySubmitTransition] = useTransition();
  const exam = useExamSession(session.questions, {
    answerRevisions: session.answerRevisions,
    answers: session.selectedOptionIds,
    flaggedQuestionIds: session.flaggedQuestionIds,
    visitedQuestionIds: session.visitedQuestionIds,
  });
  const completion = Math.round(
    (exam.answeredCount / session.questions.length) * 100,
  );
  const unansweredCount = [...exam.visitedQuestionIds].filter(
    (questionId) => !exam.answeredQuestionIds.has(questionId),
  ).length;
  const notVisitedCount =
    session.questions.length - exam.visitedQuestionIds.size;

  useAttemptMonitoring(hasStarted);

  const handleTimerExpiry = useCallback(() => {
    startExpirySubmitTransition(async () => {
      const result = await submitGuestAttempt();

      if (!result.ok) {
        setExpirySubmitError(result.message);
        return;
      }

      router.replace("/exam/result");
    });
  }, [router]);

  function handleProceed() {
    setStartError(undefined);
    startTransition(async () => {
      const result = await beginGuestAttempt();

      if (!result.ok) {
        setStartError(result.message);
        return;
      }

      setTiming({
        expiresAt: result.expiresAt,
        serverNow: result.serverNow,
      });
      setHasStarted(true);
    });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f5f6f8] lg:h-dvh lg:overflow-hidden">
      <header className="shrink-0 border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <ExamBrand />
          <CandidateSummary candidate={session.candidate} showLocation />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col bg-background lg:min-h-0">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4 sm:min-h-16 sm:items-center sm:gap-6 sm:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <ClipboardCheckIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-foreground/55 sm:size-5"
            />
            <h1 className="text-sm font-semibold text-foreground/90 sm:text-base">
              {session.title}
            </h1>
          </div>
          <ExamTimer
            key={timing.expiresAt ?? "ready"}
            className="shrink-0"
            durationSeconds={session.durationSeconds}
            expiresAt={timing.expiresAt}
            isRunning={hasStarted}
            onExpire={handleTimerExpiry}
            serverNow={timing.serverNow}
          />
        </div>

        <MobileExamToolbar
          answeredCount={exam.answeredCount}
          answeredQuestionIds={exam.answeredQuestionIds}
          completion={completion}
          currentQuestionIndex={exam.currentQuestionIndex}
          flaggedQuestionIds={exam.flaggedQuestionIds}
          notVisitedCount={notVisitedCount}
          onQuestionSelect={exam.showQuestion}
          questions={session.questions}
          reviewLaterCount={exam.flaggedQuestionIds.size}
          unansweredCount={unansweredCount}
          visitedQuestionIds={exam.visitedQuestionIds}
        />

        <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex min-w-0 flex-col lg:min-h-0">
            <div className="shrink-0 bg-neutral-600 px-4 py-1 sm:px-6">
              <h2 className="text-sm font-semibold text-white sm:text-sm">
                Single Choice Question
              </h2>
            </div>

            <div className="flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:min-h-0 lg:overflow-y-auto lg:px-12">
              <div className="mx-auto max-w-4xl">
                <h3 className="grid max-w-3xl grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 text-lg leading-7 font-medium text-foreground/90">
                  <span className="font-semibold text-foreground">
                    Q{exam.currentQuestionIndex + 1}.
                  </span>
                  <span>{exam.currentQuestion.prompt}</span>
                </h3>
                <div className="mt-7">
                  <QuestionOptions
                    question={exam.currentQuestion}
                    selectedOptionId={exam.answers[exam.currentQuestion.id]}
                    onClear={exam.clearResponse}
                    onSelect={exam.selectAnswer}
                  />
                </div>
                <p
                  aria-live="polite"
                  className={`mt-3 min-h-4 text-right text-[11px] ${
                    exam.syncError
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {expirySubmitError ??
                    exam.syncError ??
                    (exam.isSaving ? "Saving…" : "Saved")}
                </p>
              </div>
            </div>

            <ExamControls
              className="sticky bottom-0 z-20 shrink-0 border-t bg-background px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 lg:static lg:py-4"
              currentQuestionIndex={exam.currentQuestionIndex}
              isFlagged={exam.isCurrentQuestionFlagged}
              onMarkForReview={exam.markForReviewAndContinue}
              onNext={exam.goForward}
              onPrevious={() =>
                exam.showQuestion(exam.currentQuestionIndex - 1)
              }
              onQuestionNext={() =>
                exam.showQuestion(exam.currentQuestionIndex + 1)
              }
              totalQuestionCount={session.questions.length}
            />
          </section>

          <aside className="hidden min-h-0 flex-col bg-neutral-100 lg:flex lg:overflow-hidden lg:border-r lg:border-l">
            <div className="shrink-0 px-5 pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  <p className="text-sm font-semibold text-foreground/85">
                    Question status
                  </p>
                  <QuestionStatusSummary
                    answeredCount={exam.answeredCount}
                    notVisitedCount={notVisitedCount}
                    reviewLaterCount={exam.flaggedQuestionIds.size}
                    unansweredCount={unansweredCount}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {completion}% complete
                </span>
              </div>

              <div
                className="mt-2 h-2 overflow-hidden rounded-full border border-neutral-300 bg-background"
                role="progressbar"
                aria-label="Assessment completion"
                aria-valuemin={0}
                aria-valuemax={session.questions.length}
                aria-valuenow={exam.answeredCount}
              >
                <div
                  className="h-full bg-primary transition-[width] duration-200"
                  style={{ width: `${completion}%` }}
                />
              </div>

              <div aria-hidden="true" className="-mx-5 mt-5 border-t" />

              <div className="py-5">
                <QuestionStatusLegend />
              </div>

              <div aria-hidden="true" className="-mx-5 border-t" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              <QuestionNumberGrid
                className="grid-cols-5 lg:grid-cols-5"
                answeredQuestionIds={exam.answeredQuestionIds}
                currentQuestionIndex={exam.currentQuestionIndex}
                flaggedQuestionIds={exam.flaggedQuestionIds}
                onQuestionSelect={exam.showQuestion}
                questions={session.questions}
                visitedQuestionIds={exam.visitedQuestionIds}
              />
            </div>

            <div className="sticky bottom-0 z-10 shrink-0 border-t bg-neutral-100 p-5">
              <SubmitAssessmentDialog
                answeredCount={exam.answeredCount}
                notVisitedCount={notVisitedCount}
                reviewLaterCount={exam.flaggedQuestionIds.size}
                totalQuestionCount={session.questions.length}
                unansweredCount={unansweredCount}
              />
            </div>
          </aside>
        </div>
      </main>

      <ExamInstructionsDialog
        durationSeconds={session.durationSeconds}
        errorMessage={startError}
        isPending={isStarting}
        onProceed={handleProceed}
        open={!hasStarted}
        questionCount={session.questions.length}
        title={session.title}
      />
    </div>
  );
}
