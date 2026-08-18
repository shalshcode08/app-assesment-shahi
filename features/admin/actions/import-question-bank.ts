"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { callAdminRpc } from "@/features/admin/actions/admin-rpc";
import { parseQuestionWorkbook } from "@/features/admin/lib/parse-question-workbook";
import type {
  QuestionImportState,
  WorkbookAnalysis,
} from "@/features/admin/types";

const SETTINGS_PATH = "/admin/settings";
const MAXIMUM_FILE_BYTES = 5 * 1024 * 1024;

const uploadSchema = z.object({
  mode: z.enum(["append", "replace"]),
  testId: z.uuid(),
});

export async function importQuestionBank(
  _previousState: QuestionImportState,
  formData: FormData,
): Promise<QuestionImportState> {
  const fields = uploadSchema.safeParse({
    mode: formData.get("mode") ?? "append",
    testId: formData.get("testId"),
  });

  if (!fields.success) {
    return { message: "Pick a test to upload questions into.", status: "error" };
  }

  const file = formData.get("workbook");

  if (!(file instanceof File) || file.size === 0) {
    return { message: "Choose a .xlsx or .csv file to upload.", status: "error" };
  }

  if (file.size > MAXIMUM_FILE_BYTES) {
    return { message: "That file is larger than 5 MB.", status: "error" };
  }

  const parsed = parseQuestionWorkbook(
    Buffer.from(await file.arrayBuffer()),
    file.name,
  );

  if (parsed.errors.length > 0) {
    return { message: parsed.errors.join(" "), status: "error" };
  }

  // Real workbooks arrive with a few damaged rows. Loading the good ones and
  // naming the rest is more useful to an admin than refusing the whole file.
  if (parsed.questions.length === 0) {
    return {
      message: "No valid questions were found in that file.",
      rejected: parsed.rejected,
      status: "error",
    };
  }

  const outcome = await callAdminRpc("import_admin_question_bank", {
    p_assessment_id: fields.data.testId,
    p_questions: parsed.questions,
    p_replace: fields.data.mode === "replace",
  });

  if (!outcome.ok) {
    return {
      message: outcome.message,
      rejected: parsed.rejected,
      status: "error",
    };
  }

  revalidatePath(SETTINGS_PATH);

  const imported = Number(outcome.result.imported ?? 0);
  const removed = Number(outcome.result.removed ?? 0);
  const skipped = parsed.rejected.length;

  return {
    message: `Imported ${imported} question${imported === 1 ? "" : "s"}${
      removed > 0 ? `, replacing ${removed}` : ""
    }${
      skipped > 0
        ? `. ${skipped} row${skipped === 1 ? " was" : "s were"} skipped — see below`
        : ""
    }.`,
    rejected: parsed.rejected,
    status: "success",
    summary: { imported, removed, skipped },
    warnings: parsed.warnings,
  };
}

/**
 * Parses the chosen file and reports what an import would create, without
 * touching the bank. The admin confirms against real rows rather than trusting
 * a column contract.
 */
export async function analyzeQuestionWorkbook(
  formData: FormData,
): Promise<WorkbookAnalysis> {
  const empty = {
    fileName: "",
    rejected: [],
    sample: [],
    validCount: 0,
    warnings: [],
  };

  const file = formData.get("workbook");

  if (!(file instanceof File) || file.size === 0) {
    return { ...empty, message: "Choose a file to upload.", status: "error" };
  }

  if (file.size > MAXIMUM_FILE_BYTES) {
    return {
      ...empty,
      fileName: file.name,
      message: "That file is larger than 5 MB.",
      status: "error",
    };
  }

  const parsed = parseQuestionWorkbook(
    Buffer.from(await file.arrayBuffer()),
    file.name,
  );

  if (parsed.errors.length > 0) {
    return {
      ...empty,
      fileName: file.name,
      message: parsed.errors.join(" "),
      status: "error",
    };
  }

  return {
    fileName: file.name,
    message:
      parsed.questions.length === 0
        ? "No questions could be read from that file."
        : undefined,
    rejected: parsed.rejected,
    sample: parsed.questions.slice(0, 5).map((question) => ({
      code: question.code,
      correct: question.correct,
      options: question.options,
      question: question.question,
    })),
    status: parsed.questions.length === 0 ? "error" : "ok",
    validCount: parsed.questions.length,
    warnings: parsed.warnings,
  };
}
