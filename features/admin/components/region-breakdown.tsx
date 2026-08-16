import type { AdminDashboard } from "@/features/admin/data/get-admin-dashboard";
import {
  EmptyPlot,
  Panel,
  VIZ,
} from "@/features/admin/components/dashboard-primitives";

export function RegionBreakdown({
  regions,
}: {
  regions: AdminDashboard["regions"];
}) {
  if (regions.length === 0) {
    return (
      <Panel title="By region" description="Attempts and average score per state">
        <EmptyPlot message="No attempts recorded yet." />
      </Panel>
    );
  }

  const maxAttempts = Math.max(...regions.map((region) => region.attempts));

  return (
    <Panel
      title="By region"
      description="Attempts and average score per state"
    >
      <ul className="flex flex-col gap-4">
        {regions.map((region) => {
          const widthPercent = (region.attempts / maxAttempts) * 100;

          return (
            <li key={region.region}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate font-medium text-foreground/85">
                  {region.region}
                </span>
                <span
                  className="shrink-0 text-muted-foreground"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {region.attempts}{" "}
                  {region.attempts === 1 ? "attempt" : "attempts"}
                  {region.averageScorePercentage === null
                    ? ""
                    : ` · avg ${region.averageScorePercentage}%`}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: VIZ.series,
                    width: `${widthPercent}%`,
                  }}
                  title={`${region.region}: ${region.attempts} attempts, ${region.submitted} submitted, ${region.qualified} qualified`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
