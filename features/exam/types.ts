export type ExamOption = {
  id: string;
  label: string;
};

export type ExamQuestion = {
  id: string;
  section: string;
  prompt: string;
  options: ExamOption[];
};

export type ExamLanguage = {
  code: string;
  id: string;
  name: string;
};

export type ExamCandidate = {
  email: string;
  hub: string;
  name: string;
  region: string;
};

export type GuestExamSession = {
  answerRevisions: Record<string, number>;
  attemptId: string;
  candidate: ExamCandidate;
  durationSeconds: number;
  expiresAt: string | null;
  flaggedQuestionIds: string[];
  instructions: string | null;
  languageId: string | null;
  languages: ExamLanguage[];
  maxTabSwitches: number | null;
  questions: ExamQuestion[];
  selectedOptionIds: Record<string, string>;
  serverNow: string;
  startedAt: string | null;
  status: "ready" | "in_progress";
  tabWarningCount: number;
  title: string;
  visitedQuestionIds: string[];
};

export type ExamResultQuestion = {
  correctOptionId: string;
  id: string;
  options: ExamOption[];
  position: number;
  prompt: string;
  selectedOptionId: string | null;
};

export type GuestExamResult = {
  attemptId: string;
  candidate: ExamCandidate;
  configuredDurationSeconds: number;
  correctCount: number;
  durationSeconds: number;
  incorrectCount: number;
  maximumScore: number;
  passingPercentage: number;
  qualified: boolean;
  questions: ExamResultQuestion[];
  scoreObtained: number;
  scorePercentage: number;
  tabWarningCount: number;
  title: string;
  unansweredCount: number;
};
