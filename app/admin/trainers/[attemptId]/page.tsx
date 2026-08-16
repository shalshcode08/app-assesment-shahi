import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { AttemptReportView } from "@/features/admin/components/attempt-report";
import { getAdminAttemptReport } from "@/features/admin/data/get-admin-attempt-report";
import { getAdminSession } from "@/features/admin/data/get-admin-session";

export const metadata: Metadata = {
  title: "Trainer report | Shahi",
  description: "Question-by-question assessment report.",
};

export default async function AdminTrainerReportPage({
  params,
}: PageProps<"/admin/trainers/[attemptId]">) {
  await connection();
  const { attemptId } = await params;
  const session = await getAdminSession();

  if (!session) {
    redirect("/login/admin");
  }

  const report = await getAdminAttemptReport(attemptId);

  if (!report) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <AttemptReportView report={report} />
    </main>
  );
}
