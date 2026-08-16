import { CircleCheckIcon, CircleXIcon, Clock3Icon } from "lucide-react";

import type { AdminDashboard } from "@/features/admin/data/get-admin-dashboard";
import {
  EmptyPlot,
  Panel,
  VIZ,
} from "@/features/admin/components/dashboard-primitives";

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
 * Qualified state is carried by an icon and a word, never by colour alone --
 * green and red are the one pair that colour-blind readers cannot separate.
 */
function Outcome({
  qualified,
  status,
}: {
  qualified: boolean | null;
  status: string;
}) {
  if (status !== "submitted") {
    return (
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Clock3Icon aria-hidden="true" className="size-3.5" />
        {status === "in_progress" ? "In progress" : "Not submitted"}
      </span>
    );
  }

  return qualified ? (
    <span
      className="inline-flex items-center gap-2 font-medium"
      style={{ color: VIZ.good }}
    >
      <CircleCheckIcon aria-hidden="true" className="size-3.5" />
      Qualified
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-2 font-medium"
      style={{ color: VIZ.critical }}
    >
      <CircleXIcon aria-hidden="true" className="size-3.5" />
      Not qualified
    </span>
  );
}

export function RecentAttemptsTable({
  attempts,
}: {
  attempts: AdminDashboard["recentAttempts"];
}) {
  if (attempts.length === 0) {
    return (
      <Panel title="Recent attempts" description="Latest candidate activity">
        <EmptyPlot message="No attempts yet." />
      </Panel>
    );
  }

  return (
    <Panel
      title="Recent attempts"
      description="Latest candidate activity"
      className="overflow-hidden"
    >
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border/70 text-muted-foreground">
              <th scope="col" className="pb-2 pr-3 font-medium">
                Candidate
              </th>
              <th scope="col" className="pb-2 pr-3 font-medium">
                Location
              </th>
              <th scope="col" className="pb-2 pr-3 text-right font-medium">
                Score
              </th>
              <th scope="col" className="pb-2 pr-3 font-medium">
                Outcome
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                When
              </th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((attempt) => (
              <tr
                key={attempt.attemptId}
                className="border-b border-border/50 last:border-0"
              >
                <td className="py-2 pr-3">
                  <span className="block truncate font-medium text-foreground/90">
                    {attempt.name}
                  </span>
                  <span className="block truncate text-muted-foreground">
                    {attempt.email}
                  </span>
                </td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {attempt.region}
                  <span className="text-muted-foreground/60"> · </span>
                  {attempt.hub}
                </td>
                <td
                  className="py-2 pr-3 text-right font-medium text-foreground/90"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {attempt.scorePercentage === null
                    ? "—"
                    : `${attempt.scorePercentage}%`}
                </td>
                <td className="py-2 pr-3">
                  <Outcome
                    qualified={attempt.qualified}
                    status={attempt.status}
                  />
                </td>
                <td
                  className="py-2 text-right text-muted-foreground"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatWhen(attempt.submittedAt ?? attempt.startedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
