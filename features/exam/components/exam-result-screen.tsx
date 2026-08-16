import {
  CircleCheckIcon,
  Clock3Icon,
  TriangleAlertIcon,
} from "lucide-react";

import { ExamBrand } from "@/features/exam/components/exam-brand";
import { ResultAnswerReview } from "@/features/exam/components/result-answer-review";
import { ResultCandidateOverview } from "@/features/exam/components/result-candidate-overview";
import {
  EXAM_QUESTIONS,
  EXAM_TITLE,
} from "@/features/exam/constants/exam-questions";
import { EXAM_RESULT } from "@/features/exam/constants/exam-result";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function ExamResultScreen() {
  const correctAnswerCount = EXAM_QUESTIONS.reduce(
    (count, question) =>
      EXAM_RESULT.selectedOptionIds[question.id] ===
      EXAM_RESULT.correctOptionIds[question.id]
        ? count + 1
        : count,
    0,
  );
  const scorePercentage = Math.round(
    (correctAnswerCount / EXAM_QUESTIONS.length) * 100,
  );
  const isQualified = scorePercentage >= EXAM_RESULT.passingPercentage;

  const examDetails = [
    {
      label: "Exam duration",
      value: formatDuration(EXAM_RESULT.durationSeconds),
      supportingText: "30-minute assessment",
      icon: Clock3Icon,
      cardClassName: "bg-slate-100 text-slate-900",
      iconClassName: "text-slate-600",
    },
    {
      label: "Correct answers",
      value: `${correctAnswerCount} of ${EXAM_QUESTIONS.length}`,
      supportingText: `${scorePercentage}% accuracy`,
      icon: CircleCheckIcon,
      cardClassName: "bg-green-50 text-green-950",
      iconClassName: "text-green-700",
    },
    {
      label: "Tab switch warnings",
      value: EXAM_RESULT.tabSwitchWarnings.toString(),
      supportingText: "Recorded during this attempt",
      icon: TriangleAlertIcon,
      cardClassName: "bg-amber-50 text-amber-950",
      iconClassName: "text-amber-700",
    },
  ] as const;

  return (
    <div className="min-h-dvh bg-[#fafafa]">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center px-4 sm:px-6">
          <ExamBrand />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-4">
          <h1 className="text-xl font-semibold tracking-[-0.015em] sm:text-2xl">
            Assessment result
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{EXAM_TITLE}</p>
        </div>

        <ResultCandidateOverview
          correctAnswerCount={correctAnswerCount}
          isQualified={isQualified}
          passingPercentage={EXAM_RESULT.passingPercentage}
          scorePercentage={scorePercentage}
          totalQuestionCount={EXAM_QUESTIONS.length}
        />

        <section aria-labelledby="exam-details-title" className="mt-7 sm:mt-8">
          <h2 id="exam-details-title" className="mb-4 text-lg font-semibold">
            Exam details
          </h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            {examDetails.map((detail) => {
              const Icon = detail.icon;

              return (
                <div
                  key={detail.label}
                  className={`flex min-h-32 flex-col rounded-lg p-5 shadow-sm ${detail.cardClassName}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm font-medium opacity-70">
                      {detail.label}
                    </dt>
                    <Icon
                      aria-hidden="true"
                      className={`size-4 shrink-0 ${detail.iconClassName}`}
                    />
                  </div>
                  <dd className="mt-5">
                    <span className="block text-2xl font-semibold tracking-[-0.015em] tabular-nums">
                      {detail.value}
                    </span>
                    <span className="mt-1 block text-xs opacity-65">
                      {detail.supportingText}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>

        <ResultAnswerReview />
      </main>
    </div>
  );
}
