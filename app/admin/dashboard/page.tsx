import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import {
  getAdminDashboard,
  parseTrendRange,
} from "@/features/admin/data/get-admin-dashboard";
import { AttemptTrendChart } from "@/features/admin/components/attempt-trend-chart";
import { OverviewHeader } from "@/features/admin/components/overview-header";
import { OverviewStats } from "@/features/admin/components/overview-stats";
import { TopPerformingHub } from "@/features/admin/components/top-performing-hub";
import { ScoreDistributionChart } from "@/features/admin/components/score-distribution-chart";

export const metadata: Metadata = {
  title: "Admin Dashboard | Shahi",
  description: "Trainer assessment analytics for administrators.",
};

export default async function AdminDashboardPage({
  searchParams,
}: PageProps<"/admin/dashboard">) {
  await connection();
  const range = parseTrendRange((await searchParams).trend as string | undefined);
  // The layout already guards the section; this covers the case where the
  // session expires between the layout render and this fetch.
  const dashboard = await getAdminDashboard(range);

  if (!dashboard) {
    redirect("/login/admin");
  }

  const { summary } = dashboard;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <OverviewHeader
          generatedAt={dashboard.generatedAt}
          subtitle="Competency results for every trainer, state and skill centre."
        />

        <OverviewStats coverage={dashboard.coverage} summary={summary} />

        <TopPerformingHub topHub={dashboard.topHub} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ScoreDistributionChart
            buckets={dashboard.scoreDistribution}
            passingPercentage={dashboard.passingPercentage}
          />
          <AttemptTrendChart range={range} trend={dashboard.trend} />
        </div>
    </main>
  );
}
