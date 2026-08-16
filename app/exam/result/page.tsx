import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { ExamResultScreen } from "@/features/exam/components/exam-result-screen";
import { getGuestResult } from "@/features/exam/data/get-guest-result";

export const metadata: Metadata = {
  title: "Assessment Result | Shahi",
  description: "Review your Shahi trainer assessment result.",
};

export default async function ExamResultPage() {
  await connection();
  const result = await getGuestResult();

  if (!result) {
    redirect("/exam");
  }

  return <ExamResultScreen result={result} />;
}
