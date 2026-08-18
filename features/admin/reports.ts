import type { SheetColumn } from "@/features/admin/lib/write-workbook";

/**
 * The report catalogue. The page renders from this list and the export route
 * builds its sheet from it, so a new report is one entry plus a branch in
 * `get_admin_report`.
 */
export type ReportId = "attempts" | "centres" | "questions" | "trainers";

export type ReportDefinition = {
  columns: SheetColumn[];
  description: string;
  fileName: string;
  id: ReportId;
  sheetName: string;
  title: string;
  useCase: string;
};

export const REPORTS: ReportDefinition[] = [
  {
    columns: [
      { header: "Trainer", key: "name", width: 24 },
      { header: "Email", key: "email", width: 28 },
      { header: "State", key: "state", width: 18 },
      { header: "Training centre", key: "centre", width: 22 },
      { header: "Test", key: "test", width: 26 },
      { header: "Status", key: "status", width: 14 },
      { header: "Outcome", key: "outcome", width: 15 },
      { header: "Score", key: "score", type: "number", width: 10 },
      { header: "Out of", key: "maximumScore", type: "number", width: 10 },
      { header: "Percentage", key: "percentage", type: "percent", width: 12 },
      { header: "Correct", key: "correct", type: "number", width: 10 },
      { header: "Incorrect", key: "incorrect", type: "number", width: 10 },
      { header: "Unanswered", key: "unanswered", type: "number", width: 12 },
      { header: "Tab switches", key: "tabSwitches", type: "number", width: 13 },
      { header: "Minutes taken", key: "minutesTaken", type: "percent", width: 14 },
      { header: "Started at", key: "startedAt", type: "date", width: 18 },
      { header: "Submitted at", key: "submittedAt", type: "date", width: 18 },
    ],
    description:
      "Every attempt with its score, timing, and tab-switch count — one row per attempt.",
    fileName: "attempt-results",
    id: "attempts",
    sheetName: "Attempt results",
    title: "Attempt results",
    useCase: "The full record behind any score question.",
  },
  {
    columns: [
      { header: "Trainer", key: "name", width: 24 },
      { header: "Email", key: "email", width: 28 },
      { header: "State", key: "state", width: 18 },
      { header: "Training centre", key: "centre", width: 22 },
      { header: "Attempts", key: "attempts", type: "number", width: 11 },
      { header: "Submitted", key: "submitted", type: "number", width: 11 },
      { header: "Best percentage", key: "bestPercentage", type: "percent", width: 15 },
      { header: "Ever qualified", key: "everQualified", width: 14 },
      { header: "Last submitted", key: "lastSubmittedAt", type: "date", width: 18 },
      { header: "Registered", key: "registeredAt", type: "date", width: 18 },
    ],
    description:
      "One row per trainer with their best score and whether they have qualified.",
    fileName: "trainer-roster",
    id: "trainers",
    sheetName: "Trainer roster",
    title: "Trainer roster",
    useCase: "Who has sat the test, and who still has not.",
  },
  {
    columns: [
      { header: "State", key: "state", width: 20 },
      { header: "Training centre", key: "centre", width: 24 },
      { header: "Trainers", key: "trainers", type: "number", width: 11 },
      { header: "Submitted", key: "submitted", type: "number", width: 11 },
      { header: "Qualified", key: "qualified", type: "number", width: 11 },
      { header: "Not qualified", key: "notQualified", type: "number", width: 13 },
      { header: "Average percentage", key: "averagePercentage", type: "percent", width: 18 },
      { header: "Pass rate", key: "passRate", type: "percent", width: 11 },
      { header: "Tab switches", key: "tabSwitches", type: "number", width: 13 },
    ],
    description:
      "Pass rate and average score rolled up by state and training centre.",
    fileName: "centre-performance",
    id: "centres",
    sheetName: "Centre performance",
    title: "State and centre performance",
    useCase: "Where results are strong, and where to send help.",
  },
  {
    columns: [
      { header: "Code", key: "code", width: 12 },
      { header: "Question", key: "question", width: 70 },
      { header: "Category", key: "category", width: 18 },
      { header: "Difficulty", key: "difficulty", width: 12 },
      { header: "Times served", key: "timesServed", type: "number", width: 13 },
      { header: "Correct", key: "correct", type: "number", width: 10 },
      { header: "Incorrect", key: "incorrect", type: "number", width: 11 },
      { header: "Unanswered", key: "unanswered", type: "number", width: 12 },
      { header: "Correct rate", key: "correctRate", type: "percent", width: 13 },
    ],
    description:
      "How each question performed: how often it was served, and how often it was answered correctly.",
    fileName: "question-performance",
    id: "questions",
    sheetName: "Question performance",
    title: "Question performance",
    useCase: "Spot questions that are too hard, too easy, or badly worded.",
  },
];

export function findReport(id: string | null) {
  return REPORTS.find((report) => report.id === id) ?? null;
}
