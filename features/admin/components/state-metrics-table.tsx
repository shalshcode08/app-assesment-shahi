import {
  Building2Icon,
  CircleCheckIcon,
  GaugeIcon,
  MapPinIcon,
  TrendingUpIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import Link from "next/link";

import type { StateMetric } from "@/features/admin/data/get-admin-state-metrics";
import {
  SURFACE,
  TINT,
  VIZ,
} from "@/features/admin/components/dashboard-primitives";

function centresLabel(centres: string[]) {
  if (centres.length === 0) {
    return "No centres yet";
  }

  const shown = centres.slice(0, 2).join(", ");

  return centres.length > 2 ? `${shown} +${centres.length - 2} more` : shown;
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

function PassRateBar({ rate }: { rate: number | null }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        {rate === null || rate === 0 ? null : (
          <div
            className="h-full rounded-full"
            style={{ backgroundColor: VIZ.series, width: `${rate}%` }}
          />
        )}
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-medium text-foreground/80 tabular-nums">
        {rate === null ? "—" : `${Math.round(rate)}%`}
      </span>
    </div>
  );
}

export function StateMetricsTable({ states }: { states: StateMetric[] }) {
  const reporting = states.filter((state) => state.submitted > 0).length;

  return (
    <section className={`${SURFACE} min-w-0 overflow-hidden`}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.01em] text-foreground">
            <MapPinIcon
              aria-hidden="true"
              className="size-4 text-green-500"
            />
            State-wise trainer knowledge metrics
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Aggregated test scores, pass rates, and active skill centers organized by state.
          </p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground tabular-nums">
          {reporting} of {states.length} states reporting
        </span>
      </div>

      <div className="border-t border-border/60 p-5">
        <div className="min-w-0 overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40">
              <HeadCell
                align="left"
                icon={MapPinIcon}
                label="State / region"
                className="px-5"
              />
              <HeadCell icon={Building2Icon} label="Centres" />
              <HeadCell icon={UsersIcon} label="Trainers" />
              <HeadCell icon={CircleCheckIcon} label="Passed / failed" />
              <HeadCell icon={TrendingUpIcon} label="Avg score" />
              <HeadCell icon={GaugeIcon} label="Pass rate" />
              <HeadCell icon={UsersIcon} label="Action" className="px-5" />
            </tr>
          </thead>
          <tbody>
            {states.map((state) => (
              <tr
                key={state.region}
                className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
              >
                <td className="px-5 py-4">
                  <span className="block font-medium text-foreground">
                    {state.region}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {centresLabel(state.centres)}
                  </span>
                </td>
                <td className="px-3 py-4 text-center text-foreground/80 tabular-nums">
                  {state.centreCount}
                </td>
                <td className="px-3 py-4 text-center text-foreground/80 tabular-nums">
                  {state.trainers}
                </td>
                <td className="px-3 py-4 text-center tabular-nums">
                  <span
                    className="font-medium"
                    style={state.passed > 0 ? { color: VIZ.good } : undefined}
                  >
                    {state.passed}
                  </span>
                  <span className="mx-1 text-muted-foreground/60">/</span>
                  <span
                    className="font-medium"
                    style={
                      state.failed > 0 ? { color: VIZ.critical } : undefined
                    }
                  >
                    {state.failed}
                  </span>
                </td>
                <td className="px-3 py-4 text-center font-medium text-foreground tabular-nums">
                  {state.averageScorePercentage === null
                    ? "—"
                    : `${Math.round(state.averageScorePercentage)}%`}
                </td>
                <td className="px-3 py-4">
                  <PassRateBar rate={state.passRate} />
                </td>
                <td className="px-5 py-4 text-center">
                  <Link
                    href={`/admin/trainers?state=${state.regionId}`}
                    style={{
                      backgroundColor: TINT.blue.bg,
                      color: TINT.blue.fg,
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                  >
                    <UsersIcon aria-hidden="true" className="size-3.5" />
                    View trainers
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
}
