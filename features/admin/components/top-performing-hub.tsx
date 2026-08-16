import { TrophyIcon, UserCheckIcon } from "lucide-react";

import type { AdminDashboard } from "@/features/admin/data/get-admin-dashboard";
import { SURFACE } from "@/features/admin/components/dashboard-primitives";

export function TopPerformingHub({
  topHub,
}: {
  topHub: AdminDashboard["topHub"];
}) {
  if (!topHub) {
    return null;
  }

  const trainer = topHub.topTrainer;

  return (
    <section
      className={`${SURFACE} bg-linear-to-br from-[#f6f8fb] via-background via-55% to-background p-5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          <TrophyIcon aria-hidden="true" className="size-3.5" />
          Top performing hub
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {topHub.trainersEvaluated}{" "}
          {topHub.trainersEvaluated === 1 ? "trainer" : "trainers"} evaluated
          {topHub.averageScorePercentage === null
            ? ""
            : ` · avg ${Math.round(topHub.averageScorePercentage)}%`}
        </span>
      </div>

      <h2 className="mt-3 text-base font-semibold tracking-[-0.01em] text-foreground">
        {topHub.region} — {topHub.hub}
      </h2>

      {trainer ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background p-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <UserCheckIcon aria-hidden="true" className="size-3.5" />
              Top regional trainer
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {trainer.name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/80">
                {trainer.region}
              </span>
              <span className="mx-1 text-muted-foreground/60">·</span>
              <span className="font-semibold text-foreground/80">
                {trainer.hub}
              </span>
            </p>
          </div>
          <span className="shrink-0 text-sm font-medium text-foreground tabular-nums">
            {trainer.scoreObtained ?? 0}/{trainer.maximumScore ?? 0}
            <span className="ml-2 font-normal text-muted-foreground">
              (
              {trainer.scorePercentage === null
                ? "—"
                : `${Math.round(trainer.scorePercentage)}%`}
              )
            </span>
          </span>
        </div>
      ) : null}
    </section>
  );
}
