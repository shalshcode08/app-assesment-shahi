import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { ExamWorkspace } from "@/features/exam/components/exam-workspace";
import { getGuestExam } from "@/features/exam/data/get-guest-exam";

export const metadata: Metadata = {
  title: "Trainer Assessment | Shahi",
  description: "Complete your Shahi trainer assessment.",
};

export default async function ExamPage() {
  await connection();
  const exam = await getGuestExam();

  if (!exam) {
    redirect("/");
  }

  return <ExamWorkspace session={exam} />;
}
