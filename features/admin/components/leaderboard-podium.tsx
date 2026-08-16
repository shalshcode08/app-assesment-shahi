import Link from "next/link";
import { TrophyIcon } from "lucide-react";

import type { Leaderboard } from "@/features/admin/data/get-admin-leaderboard";
import { SURFACE } from "@/features/admin/components/dashboard-primitives";

// Medal colours are the one place rank is carried by hue; the numeral and the
// label always say it too.
const MEDALS = {
  1: { bg: "#fdf6e3", fg: "#8a6410", label: "Champion trainer", ring: "#e8c675" },
  2: { bg: "#f3f4f6", fg: "#4b5563", label: "Silver", ring: "#d1d5db" },
  3: { bg: "#fbf0e7", fg: "#92551f", label: "Bronze", ring: "#e3c0a1" },
} as const;

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function LeaderboardPodium({
  podium,
}: {
  podium: Leaderboard["podium"];
}) {
  if (podium.length === 0) {
    return null;
  }

  // Second place sits left of the champion, third to the right.
  const order = [2, 1, 3]
    .map((rank) => podium.find((entry) => entry.rank === rank))
    .filter((entry) => entry !== undefined);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {order.map((entry) => {
        const medal = MEDALS[entry.rank as 1 | 2 | 3];
        const isChampion = entry.rank === 1;

        return (
          <Link
            key={entry.attemptId}
            href={`/admin/trainers/${entry.attemptId}`}
            className={`${SURFACE} flex flex-col items-center p-5 text-center transition-colors hover:bg-muted/20`}
            style={
              isChampion
                ? { backgroundColor: medal.bg, borderColor: medal.ring }
                : undefined
            }
          >
            <span
              className="flex size-9 items-center justify-center rounded-lg text-sm font-semibold tabular-nums"
              style={{ backgroundColor: medal.bg, color: medal.fg }}
            >
              {entry.rank}
            </span>
            <span
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium"
              style={{ color: medal.fg }}
            >
              {isChampion ? (
                <TrophyIcon aria-hidden="true" className="size-3.5" />
              ) : null}
              {medal.label}
            </span>
            <span className="mt-2 text-base font-semibold text-foreground">
              {entry.name}
            </span>
            <span className="mt-0.5 text-xs text-muted-foreground">
              {entry.hub} · {entry.region}
            </span>
            <span className="mt-4 flex w-full items-center justify-between border-t border-border/60 pt-3 text-xs tabular-nums">
              <span className="font-medium text-foreground">
                {entry.scoreObtained ?? 0}/{entry.maximumScore ?? 0}
                <span className="ml-1 text-muted-foreground">
                  (
                  {entry.scorePercentage === null
                    ? "—"
                    : `${Math.round(entry.scorePercentage)}%`}
                  )
                </span>
              </span>
              <span className="text-muted-foreground">
                {formatClock(entry.durationSeconds)}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
