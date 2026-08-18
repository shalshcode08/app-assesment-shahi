import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { ReportsList } from "@/features/admin/components/reports-list";
import { getAdminReportCounts } from "@/features/admin/data/get-admin-report";

export const metadata: Metadata = {
  title: "Reports | Shahi",
  description: "Download assessment reports as Excel workbooks.",
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDay(value: string | undefined, endOfDay = false) {
  if (!value || !DATE_PATTERN.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString();
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await connection();

  const { from, to } = await searchParams;
  const fromIso = parseDay(from);
  const toIso = parseDay(to, true);

  // Each card shows how big its download would be, counted in one round trip
  // rather than by fetching four full reports.
  const counts = await getAdminReportCounts({ from: fromIso, to: toIso });

  if (!counts) {
    redirect("/login/admin");
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-lg font-semibold tracking-[-0.01em] text-foreground">
          Reports
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Download assessment records as Excel workbooks — formatted headers,
          typed columns, and filters ready to use.
        </p>
      </header>

      <ReportsList
        counts={counts}
        from={DATE_PATTERN.test(from ?? "") ? (from ?? "") : ""}
        to={DATE_PATTERN.test(to ?? "") ? (to ?? "") : ""}
      />
    </main>
  );
}
