import type { Metadata } from "next";

import { ExamResultScreen } from "@/features/exam/components/exam-result-screen";

export const metadata: Metadata = {
  title: "Assessment Result | Shahi",
  description: "Review your Shahi trainer assessment result.",
};

export default function ExamResultPage() {
  return <ExamResultScreen />;
}
