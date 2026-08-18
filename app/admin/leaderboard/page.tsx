import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { DownloadIcon, TrophyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SURFACE } from "@/features/admin/components/dashboard-primitives";
import { LeaderboardFilters } from "@/features/admin/components/leaderboard-filters";
import { LeaderboardPodium } from "@/features/admin/components/leaderboard-podium";
import { LeaderboardTable } from "@/features/admin/components/leaderboard-table";
import { RefreshButton } from "@/features/admin/components/refresh-button";
import { getAdminLeaderboard } from "@/features/admin/data/get-admin-leaderboard";
import { parseSort, parseStatus } from "@/features/admin/leaderboard-options";

export const metadata: Metadata = {
  title: "Leaderboard | Shahi",
  description: "Trainer assessment rankings.",
};

function Stat({
  hint,
  label,
  value,
}: {
  hint: string;
  label: string;
  value: string;
}) {
  return (
    <div className={`${SURFACE} p-5`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.01em] text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/85">{hint}</p>
    </div>
  );
}

export default async function AdminLeaderboardPage({
  searchParams,
}: PageProps<"/admin/leaderboard">) {
  await connection();
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const sort = parseSort(params.sort);
  const status = parseStatus(params.status);

  const leaderboard = await getAdminLeaderboard({
    search: search || undefined,
    sort,
    status,
  });

  if (!leaderboard) {
    redirect("/login/admin");
  }

  const { summary } = leaderboard;
  const exportQuery = new URLSearchParams();
  if (search) exportQuery.set("q", search);
  if (status !== "all") exportQuery.set("status", status);
  if (sort !== "score_desc") exportQuery.set("sort", sort);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <section className={`${SURFACE} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              <TrophyIcon aria-hidden="true" className="size-3.5" />
              Global performance rankings
            </span>
            <h1 className="mt-3 text-lg font-semibold tracking-[-0.01em] text-foreground">
              Trainer knowledge leaderboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Assessment results ranked by score, then by completion time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton />
            <Button nativeButton={false} render={<Link href={`/admin/leaderboard/export${exportQuery.size ? `?${exportQuery}` : ""}`} />} variant="outline" size="lg">
              <DownloadIcon aria-hidden="true" />
              Export CSV
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Total assessments"
          value={summary.totalAssessments.toString()}
          hint="Completed candidates"
        />
        <Stat
          label="Average score"
          value={
            summary.averageScorePercentage === null
              ? "—"
              : `${Math.round(summary.averageScorePercentage)}%`
          }
          hint="Across all attempts"
        />
        <Stat
          label="Pass rate"
          value={
            summary.passRate === null ? "—" : `${Math.round(summary.passRate)}%`
          }
          hint={`${summary.qualifiedCount} qualified`}
        />
        <Stat
          label="Question bank"
          value={summary.questionBankCount.toString()}
          hint="Active questions"
        />
      </div>

      <LeaderboardPodium podium={leaderboard.podium} />

      <section className={`${SURFACE} min-w-0 overflow-hidden`}>
        <div className="flex flex-col gap-4 p-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-foreground">
              All assessments
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Rank is global; filtering the list keeps each trainer&apos;s
              overall position.
            </p>
          </div>
          <LeaderboardFilters search={search} sort={sort} status={status} />
        </div>

        <div className="border-t border-border/60 p-5">
          <LeaderboardTable rows={leaderboard.rows} />
          <p className="mt-3 text-xs text-muted-foreground tabular-nums">
            {leaderboard.rows.length} of {summary.totalAssessments} shown
          </p>
        </div>
      </section>
    </main>
  );
}
