import type { AdminDashboard } from "@/features/admin/data/get-admin-dashboard";
import {
  EmptyPlot,
  Panel,
  VIZ,
} from "@/features/admin/components/dashboard-primitives";

export function HardestQuestions({
  questions,
}: {
  questions: AdminDashboard["hardestQuestions"];
}) {
  if (questions.length === 0) {
    return (
      <Panel
        title="Hardest questions"
        description="Lowest correct-answer rate across all attempts"
      >
        <EmptyPlot message="No answers recorded yet." />
      </Panel>
    );
  }

  return (
    <Panel
      title="Hardest questions"
      description="Lowest correct-answer rate across all attempts"
    >
      <ul className="flex flex-col gap-4">
        {questions.map((question) => {
          const rate = question.correctRate ?? 0;

          return (
            <li key={question.code}>
              <div className="flex items-baseline justify-between gap-3">
                <p
                  className="truncate text-xs text-foreground/85"
                  title={question.prompt}
                >
                  <span
                    className="mr-2 font-medium text-muted-foreground"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {question.code}
                  </span>
                  {question.prompt}
                </p>
                <span
                  className="shrink-0 text-xs font-medium text-foreground/85"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {rate}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ backgroundColor: VIZ.series, width: `${rate}%` }}
                  title={`${question.code}: ${rate}% correct across ${question.answered} answers`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
