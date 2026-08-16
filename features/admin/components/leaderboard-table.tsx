import Link from "next/link";
import {
  Building2Icon,
  EyeIcon,
  HashIcon,
  TargetIcon,
  TimerIcon,
  TriangleAlertIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";

import type { LeaderboardRow } from "@/features/admin/data/get-admin-leaderboard";
import { TINT, VIZ } from "@/features/admin/components/dashboard-primitives";

const RANK_TINT = {
  1: { bg: "#fdf6e3", fg: "#8a6410" },
  2: { bg: "#f3f4f6", fg: "#4b5563" },
  3: { bg: "#fbf0e7", fg: "#92551f" },
} as const;

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function HeadCell({
  align = "center",
  className,
  icon: Icon,
  label,
}: {
  align?: "left" | "center";
  className?: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <th
      scope="col"
      className={`py-3 text-xs font-semibold text-foreground/75 ${className ?? "px-3"}`}
    >
      <span
        className={`flex items-center gap-1.5 ${align === "center" ? "justify-center" : ""}`}
      >
        <Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />
        {label}
      </span>
    </th>
  );
}

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-border/60 text-sm text-muted-foreground">
        No assessments match these filters.
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full min-w-[940px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40">
            <HeadCell icon={HashIcon} label="Rank" className="px-5" />
            <HeadCell align="left" icon={UserRoundIcon} label="Trainer" />
            <HeadCell align="left" icon={Building2Icon} label="State & centre" />
            <HeadCell icon={TargetIcon} label="Score" />
            <HeadCell icon={TimerIcon} label="Time" />
            <HeadCell icon={TriangleAlertIcon} label="Warnings" />
            <HeadCell icon={EyeIcon} label="Report" className="px-5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const medal = RANK_TINT[row.rank as 1 | 2 | 3];

            return (
              <tr
                key={row.attemptId}
                className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
              >
                <td className="px-5 py-4 text-center">
                  <span
                    className="inline-flex size-7 items-center justify-center rounded-lg text-xs font-semibold tabular-nums"
                    style={
                      medal
                        ? { backgroundColor: medal.bg, color: medal.fg }
                        : { backgroundColor: "var(--muted)" }
                    }
                  >
                    {row.rank}
                  </span>
                </td>
                <td className="px-3 py-4">
                  <span className="block font-medium text-foreground">
                    {row.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {row.email}
                  </span>
                </td>
                <td className="px-3 py-4">
                  <span className="block text-foreground/80">{row.hub}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {row.region}
                  </span>
                </td>
                <td className="px-3 py-4 text-center">
                  <span className="block font-medium text-foreground tabular-nums">
                    {row.scoreObtained ?? 0}
                    <span className="text-muted-foreground">
                      /{row.maximumScore ?? 0}
                    </span>
                  </span>
                  <span
                    className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums"
                    style={
                      row.qualified
                        ? { backgroundColor: TINT.green.bg, color: VIZ.good }
                        : { backgroundColor: "#fbeaea", color: VIZ.critical }
                    }
                  >
                    {row.scorePercentage === null
                      ? "—"
                      : `${Math.round(row.scorePercentage)}%`}
                    <span aria-hidden="true">·</span>
                    {row.qualified ? "Pass" : "Fail"}
                  </span>
                </td>
                <td className="px-3 py-4 text-center text-foreground/80 tabular-nums">
                  {formatClock(row.durationSeconds)}
                </td>
                <td className="px-3 py-4 text-center tabular-nums">
                  {row.tabWarningCount === 0 ? (
                    <span className="text-muted-foreground">0</span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: "#fbeaea", color: VIZ.critical }}
                    >
                      <TriangleAlertIcon
                        aria-hidden="true"
                        className="size-3"
                      />
                      {row.tabWarningCount}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-center">
                  <Link
                    href={`/admin/trainers/${row.attemptId}`}
                    style={{
                      backgroundColor: TINT.blue.bg,
                      color: TINT.blue.fg,
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                  >
                    <EyeIcon aria-hidden="true" className="size-3.5" />
                    Details
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
