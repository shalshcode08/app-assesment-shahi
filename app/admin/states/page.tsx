import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getAdminStateMetrics } from "@/features/admin/data/get-admin-state-metrics";
import { StateMetricsTable } from "@/features/admin/components/state-metrics-table";

export const metadata: Metadata = {
  title: "States & centres | Shahi",
  description: "State-wise trainer assessment metrics.",
};

export default async function AdminStatesPage() {
  await connection();
  const states = await getAdminStateMetrics();

  if (!states) {
    redirect("/login/admin");
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <StateMetricsTable states={states} />
    </main>
  );
}
