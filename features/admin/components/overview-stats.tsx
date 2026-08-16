import {
  AwardIcon,
  Building2Icon,
  MapPinIcon,
  TrendingUpIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import type { AdminDashboard } from "@/features/admin/data/get-admin-dashboard";
import { SURFACE, TINT } from "@/features/admin/components/dashboard-primitives";

type Tile = {
  icon: LucideIcon;
  label: string;
  tint: { bg: string; fg: string };
  tintValue?: boolean;
  value: string;
};


export function OverviewStats({
  coverage,
  summary,
}: {
  coverage: AdminDashboard["coverage"];
  summary: AdminDashboard["summary"];
}) {
  const tiles: Tile[] = [
    {
      icon: UsersIcon,
      label: "Assessed trainers",
      tint: TINT.blue,
      value: summary.assessedTrainers.toString(),
    },
    {
      icon: MapPinIcon,
      label: "Active states",
      tint: TINT.teal,
      value: coverage.activeStates.toString(),
    },
    {
      icon: Building2Icon,
      label: "Skill centres",
      tint: TINT.violet,
      value: coverage.skillCentres.toString(),
    },
    {
      icon: AwardIcon,
      label: "Overall pass rate",
      tint: TINT.green,
      tintValue: summary.passRate !== null,
      value: summary.passRate === null ? "—" : `${Math.round(summary.passRate)}%`,
    },
    {
      icon: TrendingUpIcon,
      label: "Avg knowledge score",
      tint: TINT.amber,
      tintValue: summary.averageScorePercentage !== null,
      value:
        summary.averageScorePercentage === null
          ? "—"
          : `${Math.round(summary.averageScorePercentage)}%`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => {
        const Icon = tile.icon;

        return (
          <div key={tile.label} className={`${SURFACE} p-5`}>
            <div className="flex items-center gap-2">
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: tile.tint.bg, color: tile.tint.fg }}
              >
                <Icon aria-hidden="true" className="size-3.5" />
              </span>
              <p className="truncate text-xs font-medium text-muted-foreground">
                {tile.label}
              </p>
            </div>
            <p
              className="mt-4 text-2xl font-semibold tracking-[-0.01em] text-foreground tabular-nums"
              style={tile.tintValue ? { color: tile.tint.fg } : undefined}
            >
              {tile.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
