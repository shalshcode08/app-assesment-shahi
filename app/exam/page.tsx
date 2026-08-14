import type { Metadata } from "next";

import { ExamWorkspace } from "@/features/exam/components/exam-workspace";

export const metadata: Metadata = {
  title: "Trainer Assessment | Shahi",
  description: "Complete your Shahi trainer assessment.",
};

export default function ExamPage() {
  return <ExamWorkspace />;
}
