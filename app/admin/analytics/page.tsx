import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AnalyticsDashboard } from "@/features/admin/components/analytics-dashboard";
import { getAdminAnalytics } from "@/features/admin/data/get-admin-analytics";

export const metadata: Metadata = {
  title: "Analytics | Shahi",
  description: "Assessment analytics and question quality.",
};

export default async function AdminAnalyticsPage() {
  await connection();
  const analytics = await getAdminAnalytics();

  if (!analytics) {
    redirect("/login/admin");
  }

  return <AnalyticsDashboard analytics={analytics} />;
}
