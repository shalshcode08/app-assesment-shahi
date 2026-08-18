"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { callAdminRpc } from "@/features/admin/actions/admin-rpc";
import type { AdminActionState } from "@/features/admin/types";

const SETTINGS_PATH = "/admin/settings";

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
  .transform((value) => value === "on" || value === "true");

const optionalId = z.union([z.uuid(), z.literal("")]).transform((v) => v || null);

const wholeNumber = (message: string, { min = 1 }: { min?: number } = {}) =>
  z
    .string()
    .trim()
    .refine((value) => /^\d+$/.test(value), message)
    .transform(Number)
    .refine((value) => value >= min, message);

// datetime-local posts "2026-08-18T09:30" with no zone; the browser means the
// admin's local time, so it is sent as-is and Postgres applies the server zone.
const optionalDateTime = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

const testSchema = z
  .object({
    availableFrom: optionalDateTime,
    availableUntil: optionalDateTime,
    durationMinutes: wholeNumber("Total time must be at least one minute."),
    instructions: z.string().trim().max(4000).transform((v) => v || null),
    maxAttempts: wholeNumber("Allow at least one attempt per trainer."),
    maxTabSwitches: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\d+$/.test(value),
        "Tab-switch allowance must be a whole number, or blank for no limit.",
      )
      .transform((value) => (value === "" ? null : Number(value))),
    passingPercentage: z
      .string()
      .trim()
      .refine(
        (value) => value !== "" && Number.isFinite(Number(value)),
        "Enter a passing threshold.",
      )
      .transform(Number)
      .refine(
        (value) => value >= 0 && value <= 100,
        "The passing threshold must be between 0 and 100.",
      ),
    questionsPerAttempt: wholeNumber("Serve at least one question per candidate."),
    shuffleOptions: checkbox,
    shuffleQuestions: checkbox,
    testId: optionalId,
    title: z.string().trim().min(1, "Enter a test name.").max(160),
  })
  .refine(
    (value) =>
      !value.availableFrom ||
      !value.availableUntil ||
      value.availableFrom < value.availableUntil,
    { message: "The window must open before it closes.", path: ["availableUntil"] },
  );

export async function saveTest(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const fields = testSchema.safeParse({
    availableFrom: formData.get("availableFrom") ?? "",
    availableUntil: formData.get("availableUntil") ?? "",
    durationMinutes: formData.get("durationMinutes") ?? "",
    instructions: formData.get("instructions") ?? "",
    maxAttempts: formData.get("maxAttempts") ?? "",
    maxTabSwitches: formData.get("maxTabSwitches") ?? "",
    passingPercentage: formData.get("passingPercentage") ?? "",
    questionsPerAttempt: formData.get("questionsPerAttempt") ?? "",
    shuffleOptions: formData.get("shuffleOptions"),
    shuffleQuestions: formData.get("shuffleQuestions"),
    testId: formData.get("testId") ?? "",
    title: formData.get("title") ?? "",
  });

  if (!fields.success) {
    return {
      errors: fields.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Check the highlighted fields and try again.",
      status: "error",
    };
  }

  const outcome = await callAdminRpc("save_admin_test", {
    p_assessment_id: fields.data.testId,
    p_available_from: fields.data.availableFrom,
    p_available_until: fields.data.availableUntil,
    p_duration_seconds: fields.data.durationMinutes * 60,
    p_instructions: fields.data.instructions,
    p_max_tab_switches: fields.data.maxTabSwitches,
    p_maximum_attempts_per_email: fields.data.maxAttempts,
    p_passing_percentage: fields.data.passingPercentage,
    p_questions_per_attempt: fields.data.questionsPerAttempt,
    p_shuffle_options: fields.data.shuffleOptions,
    p_shuffle_questions: fields.data.shuffleQuestions,
    p_title: fields.data.title,
  });

  if (!outcome.ok) {
    return { message: outcome.message, status: "error" };
  }

  revalidatePath(SETTINGS_PATH);

  return {
    message: fields.data.testId
      ? "Test settings saved."
      : "Test created. Upload its questions next.",
    status: "success",
  };
}

export async function setTestStatus(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const fields = z
    .object({
      status: z.enum(["draft", "published", "archived"]),
      testId: z.uuid(),
    })
    .safeParse({
      status: formData.get("status"),
      testId: formData.get("testId"),
    });

  if (!fields.success) {
    return { message: "That test no longer exists.", status: "error" };
  }

  const outcome = await callAdminRpc("set_admin_test_status", {
    p_assessment_id: fields.data.testId,
    p_status: fields.data.status,
  });

  if (!outcome.ok) {
    return { message: outcome.message, status: "error" };
  }

  revalidatePath(SETTINGS_PATH);

  const messages = {
    archived: "Test archived.",
    draft: "Test moved back to draft. Trainers can no longer start it.",
    published: "Test published. It is now the live assessment.",
  } as const;

  return { message: messages[fields.data.status], status: "success" };
}

export async function deleteTest(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const testId = z.uuid().safeParse(formData.get("testId"));

  if (!testId.success) {
    return { message: "That test no longer exists.", status: "error" };
  }

  const outcome = await callAdminRpc("delete_admin_test", {
    p_assessment_id: testId.data,
  });

  if (!outcome.ok) {
    return { message: outcome.message, status: "error" };
  }

  revalidatePath(SETTINGS_PATH);

  return { message: "Test deleted.", status: "success" };
}
