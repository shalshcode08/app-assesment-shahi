export type AdminActionState = {
  errors?: Record<string, string[]>;
  message?: string;
  status: "idle" | "error" | "success";
};

export const INITIAL_ADMIN_ACTION_STATE: AdminActionState = { status: "idle" };

export type WorkbookAnalysis = {
  fileName: string;
  message?: string;
  rejected: { code: string; problems: string[]; row: number }[];
  sample: {
    code: string;
    correct: string;
    options: { code: string; text: string }[];
    question: string;
  }[];
  status: "error" | "ok";
  validCount: number;
  warnings: string[];
};

export type QuestionImportState = AdminActionState & {
  rejected?: { code: string; problems: string[]; row: number }[];
  summary?: { imported: number; removed: number; skipped: number };
  warnings?: string[];
};

export const INITIAL_QUESTION_IMPORT_STATE: QuestionImportState = {
  status: "idle",
};
