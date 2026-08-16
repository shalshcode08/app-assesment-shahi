import Link from "next/link";
import {
  ArrowLeftIcon,
  CircleCheckIcon,
  CircleXIcon,
  Clock3Icon,
  MinusCircleIcon,
} from "lucide-react";

import type { AttemptReport } from "@/features/admin/data/get-admin-attempt-report";
import {
  SURFACE,
  TINT,
  VIZ,
} from "@/features/admin/components/dashboard-primitives";

function formatDuration(totalSeconds: number | null) {
  if (totalSeconds === null) {
    return "—";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function formatWhen(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
}

/**
 * Each tile fades from a faint wash of its own meaning -- green for correct,
 * red for incorrect, neutral for the rest -- to the card surface. The starts
 * sit near 1.1:1 against white, so they read as depth, not as blocks of colour.
 */
function Stat({
  from,
  label,
  value,
}: {
  from: string;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`${SURFACE} p-4`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${from} 0%, var(--background) 62%)`,
      }}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}

export function AttemptReportView({ report }: { report: AttemptReport }) {
  const submitted = report.status === "submitted";
  const answeredCorrectly = new Set(
    report.questions
      .filter((q) => q.selectedOptionId === q.correctOptionId)
      .map((q) => q.id),
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/trainers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Back to trainers
        </Link>
      </div>

      <section className={`${SURFACE} min-w-0 p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-[-0.01em] text-foreground">
              {report.candidate.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {report.candidate.email}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">
                {report.candidate.region}
              </span>
              <span className="mx-1 text-muted-foreground/60">·</span>
              <span className="font-medium text-foreground/80">
                {report.candidate.hub}
              </span>
              <span className="mx-1 text-muted-foreground/60">·</span>
              {report.title}
            </p>
          </div>

          {submitted ? (
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold text-foreground tabular-nums">
                {report.scoreObtained ?? 0}/{report.maximumScore ?? 0}
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                  (
                  {report.scorePercentage === null
                    ? "—"
                    : `${Math.round(report.scorePercentage)}%`}
                  )
                </span>
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                style={
                  report.qualified
                    ? { backgroundColor: TINT.green.bg, color: VIZ.good }
                    : { backgroundColor: "#fbeaea", color: VIZ.critical }
                }
              >
                {report.qualified ? (
                  <CircleCheckIcon aria-hidden="true" className="size-3.5" />
                ) : (
                  <CircleXIcon aria-hidden="true" className="size-3.5" />
                )}
                {report.qualified ? "Qualified" : "Not qualified"}
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              <Clock3Icon aria-hidden="true" className="size-3.5" />
              {report.status === "in_progress" ? "In progress" : "Not submitted"}
            </span>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          from={TINT.green.bg}
          label="Correct"
          value={(report.correctCount ?? 0).toString()}
        />
        <Stat
          from="#fbeaea"
          label="Incorrect"
          value={(report.incorrectCount ?? 0).toString()}
        />
        <Stat
          from="#f2f4f7"
          label="Unanswered"
          value={(report.unansweredCount ?? 0).toString()}
        />
        <Stat
          from={TINT.blue.bg}
          label="Time taken"
          value={formatDuration(report.durationSeconds)}
        />
      </div>

      <section className={`${SURFACE} min-w-0 overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="text-sm font-medium text-foreground">
              Answer breakdown
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {report.questions.length} questions · pass mark{" "}
              {report.passingPercentage ?? 0}% · submitted{" "}
              {formatWhen(report.submittedAt)}
            </p>
          </div>
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground tabular-nums">
            {report.tabWarningCount} tab-switch{" "}
            {report.tabWarningCount === 1 ? "warning" : "warnings"}
          </span>
        </div>

        <div className="border-t border-border/60 p-5">
          <ol className="flex flex-col gap-3">
            {report.questions.map((question) => {
              const isCorrect = answeredCorrectly.has(question.id);
              const isUnanswered = question.selectedOptionId === null;

              return (
                <li
                  key={question.id}
                  className="rounded-xl border border-border/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-sm text-foreground">
                      <span className="mr-2 text-xs font-medium text-muted-foreground tabular-nums">
                        Q{question.position}
                      </span>
                      {question.prompt}
                    </p>
                    <span
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                      style={
                        isUnanswered
                          ? undefined
                          : isCorrect
                            ? { backgroundColor: TINT.green.bg, color: VIZ.good }
                            : { backgroundColor: "#fbeaea", color: VIZ.critical }
                      }
                    >
                      {isUnanswered ? (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <MinusCircleIcon
                            aria-hidden="true"
                            className="size-3.5"
                          />
                          Skipped
                        </span>
                      ) : isCorrect ? (
                        <>
                          <CircleCheckIcon
                            aria-hidden="true"
                            className="size-3.5"
                          />
                          Correct
                        </>
                      ) : (
                        <>
                          <CircleXIcon aria-hidden="true" className="size-3.5" />
                          Incorrect
                        </>
                      )}
                    </span>
                  </div>

                  <ul className="mt-3 flex flex-col gap-2">
                    {question.options.map((option) => {
                      const isAnswerKey = option.id === question.correctOptionId;
                      const isChosen = option.id === question.selectedOptionId;

                      return (
                        <li
                          key={option.id}
                          className="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs"
                          style={{
                            backgroundColor: isAnswerKey
                              ? TINT.green.bg
                              : isChosen
                                ? "#fbeaea"
                                : undefined,
                            borderColor: isAnswerKey
                              ? VIZ.good
                              : isChosen
                                ? VIZ.critical
                                : undefined,
                          }}
                        >
                          <span className="min-w-0 flex-1 text-foreground/85">
                            {option.label}
                          </span>
                          {isAnswerKey ? (
                            <span
                              className="shrink-0 font-medium"
                              style={{ color: VIZ.good }}
                            >
                              Correct
                            </span>
                          ) : null}
                          {isChosen && !isAnswerKey ? (
                            <span
                              className="shrink-0 font-medium"
                              style={{ color: VIZ.critical }}
                            >
                              Chosen
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </>
  );
}
