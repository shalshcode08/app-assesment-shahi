"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { callAdminRpc } from "@/features/admin/actions/admin-rpc";
import { parseQuestionWorkbook } from "@/features/admin/lib/parse-question-workbook";
import type { AdminActionState, QuestionImportState } from "@/features/admin/types";

const SETTINGS_PATH = "/admin/settings";
const MAXIMUM_FILE_BYTES = 4 * 1024 * 1024;

export async function saveTestLanguage(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const fields = z
    .object({
      languageId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
      name: z.string().trim().min(1, "Enter a language name.").max(60),
      testId: z.uuid(),
    })
    .safeParse({
      languageId: formData.get("languageId") ?? "",
      name: formData.get("name"),
      testId: formData.get("testId"),
    });

  if (!fields.success) {
    return {
      errors: fields.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Enter a language name.",
      status: "error",
    };
  }

  const outcome = await callAdminRpc("save_admin_test_language", {
    p_assessment_id: fields.data.testId,
    p_language_id: fields.data.languageId,
    p_name: fields.data.name,
  });

  if (!outcome.ok) {
    return { message: outcome.message, status: "error" };
  }

  revalidatePath(SETTINGS_PATH);

  return {
    message: fields.data.languageId
      ? "Language renamed."
      : `${fields.data.name} added. Upload its question sheet next.`,
    status: "success",
  };
}

export async function deleteTestLanguage(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const languageId = z.uuid().safeParse(formData.get("languageId"));

  if (!languageId.success) {
    return { message: "That language no longer exists.", status: "error" };
  }

  const outcome = await callAdminRpc("delete_admin_test_language", {
    p_language_id: languageId.data,
  });

  if (!outcome.ok) {
    return { message: outcome.message, status: "error" };
  }

  revalidatePath(SETTINGS_PATH);

  return {
    message: "Language removed. The original questions are untouched.",
    status: "success",
  };
}

/**
 * Loads a translated sheet against an existing bank. Nothing new is created:
 * rows are matched to the original questions by code, so the answer key and the
 * marks stay where they are.
 */
export async function importQuestionTranslations(
  _previousState: QuestionImportState,
  formData: FormData,
): Promise<QuestionImportState> {
  const languageId = z.uuid().safeParse(formData.get("languageId"));

  if (!languageId.success) {
    return { message: "Pick a language to upload into.", status: "error" };
  }

  const file = formData.get("workbook");

  if (!(file instanceof File) || file.size === 0) {
    return { message: "Choose a .xlsx or .csv file to upload.", status: "error" };
  }

  if (file.size > MAXIMUM_FILE_BYTES) {
    return { message: "That file is larger than 4 MB.", status: "error" };
  }

  const parsed = parseQuestionWorkbook(
    Buffer.from(await file.arrayBuffer()),
    file.name,
  );

  if (parsed.errors.length > 0) {
    return { message: parsed.errors.join(" "), status: "error" };
  }

  if (parsed.questions.length === 0) {
    return {
      message: "No questions could be read from that file.",
      rejected: parsed.rejected,
      status: "error",
    };
  }

  const outcome = await callAdminRpc("import_admin_question_translations", {
    p_language_id: languageId.data,
    p_questions: parsed.questions,
  });

  if (!outcome.ok) {
    return { message: outcome.message, status: "error" };
  }

  revalidatePath(SETTINGS_PATH);

  const imported = Number(outcome.result.imported ?? 0);
  const unmatched = (outcome.result.unmatched ?? []) as string[];
  const mismatched = (outcome.result.mismatched ?? []) as string[];

  const notes = [
    unmatched.length > 0
      ? `${unmatched.length} row${
          unmatched.length === 1 ? "" : "s"
        } had a question number that is not in this test (${unmatched.slice(0, 5).join(", ")}${
          unmatched.length > 5 ? "…" : ""
        })`
      : null,
    mismatched.length > 0
      ? `${mismatched.length} row${
          mismatched.length === 1 ? "" : "s"
        } marked a different correct answer than the original, so the options are not in the same order (${mismatched
          .slice(0, 5)
          .join(", ")}${mismatched.length > 5 ? "…" : ""})`
      : null,
  ].filter(Boolean);

  return {
    message: `Translated ${imported} question${imported === 1 ? "" : "s"}.${
      notes.length > 0 ? ` ${notes.join(". ")}.` : ""
    }`,
    rejected: parsed.rejected,
    status: imported === 0 ? "error" : "success",
    summary: { imported, removed: 0, skipped: unmatched.length + mismatched.length },
  };
}
