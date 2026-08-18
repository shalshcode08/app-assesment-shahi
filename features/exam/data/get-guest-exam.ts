import "server-only";

import { z } from "zod";

import { getAttemptTokenHash } from "@/features/exam/server/attempt-session";
import type { GuestExamSession } from "@/features/exam/types";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const guestAttemptSchema = z.object({
  attemptId: z.uuid(),
  candidate: z.object({
    email: z.string(),
    hub: z.string(),
    name: z.string(),
    region: z.string(),
  }),
  durationSeconds: z.number().int().positive(),
  expiresAt: z.string().nullable(),
  instructions: z.string().nullable().default(null),
  languageId: z.uuid().nullable().default(null),
  languages: z
    .array(z.object({ code: z.string(), id: z.uuid(), name: z.string() }))
    .default([]),
  maxTabSwitches: z.number().int().nonnegative().nullable().default(null),
  tabWarningCount: z.number().int().nonnegative().default(0),
  questions: z.array(
    z.object({
      answerRevision: z.number().int().nonnegative(),
      id: z.uuid(),
      isFlagged: z.boolean(),
      isVisited: z.boolean(),
      options: z.array(
        z.object({
          id: z.uuid(),
          label: z.string(),
        }),
      ),
      position: z.number().int().positive(),
      prompt: z.string(),
      section: z.string(),
      selectedOptionId: z.uuid().nullable(),
    }),
  ),
  serverNow: z.string(),
  startedAt: z.string().nullable(),
  status: z.enum(["ready", "in_progress"]),
  title: z.string(),
});

export async function getGuestExam(): Promise<GuestExamSession | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const attemptTokenHash = await getAttemptTokenHash();

  if (!attemptTokenHash) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_guest_attempt", {
    p_attempt_token_hash: attemptTokenHash,
  });

  if (error) {
    console.error("Unable to load guest assessment", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  const parsedAttempt = guestAttemptSchema.safeParse(data);

  if (!parsedAttempt.success || parsedAttempt.data.questions.length === 0) {
    console.error("Guest assessment data did not match the expected shape");
    return null;
  }

  const selectedOptionIds: Record<string, string> = {};
  const answerRevisions: Record<string, number> = {};
  const flaggedQuestionIds: string[] = [];
  const visitedQuestionIds: string[] = [];

  for (const question of parsedAttempt.data.questions) {
    answerRevisions[question.id] = question.answerRevision;

    if (question.selectedOptionId) {
      selectedOptionIds[question.id] = question.selectedOptionId;
    }

    if (question.isFlagged) {
      flaggedQuestionIds.push(question.id);
    }

    if (question.isVisited) {
      visitedQuestionIds.push(question.id);
    }
  }

  return {
    answerRevisions,
    attemptId: parsedAttempt.data.attemptId,
    candidate: parsedAttempt.data.candidate,
    durationSeconds: parsedAttempt.data.durationSeconds,
    expiresAt: parsedAttempt.data.expiresAt,
    flaggedQuestionIds,
    instructions: parsedAttempt.data.instructions,
    languageId: parsedAttempt.data.languageId,
    languages: parsedAttempt.data.languages,
    maxTabSwitches: parsedAttempt.data.maxTabSwitches,
    tabWarningCount: parsedAttempt.data.tabWarningCount,
    questions: parsedAttempt.data.questions.map((question) => ({
      id: question.id,
      options: question.options,
      prompt: question.prompt,
      section: question.section,
    })),
    selectedOptionIds,
    serverNow: parsedAttempt.data.serverNow,
    startedAt: parsedAttempt.data.startedAt,
    status: parsedAttempt.data.status,
    title: parsedAttempt.data.title,
    visitedQuestionIds,
  };
}
