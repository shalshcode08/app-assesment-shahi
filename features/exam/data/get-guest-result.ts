import "server-only";

import { z } from "zod";

import { getAttemptTokenHash } from "@/features/exam/server/attempt-session";
import type { GuestExamResult } from "@/features/exam/types";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const guestResultSchema = z.object({
  attemptId: z.uuid(),
  candidate: z.object({
    email: z.string(),
    hub: z.string(),
    name: z.string(),
    region: z.string(),
  }),
  configuredDurationSeconds: z.number().int().positive(),
  correctCount: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative(),
  incorrectCount: z.number().int().nonnegative(),
  maximumScore: z.number().nonnegative(),
  passingPercentage: z.number().min(0).max(100),
  qualified: z.boolean(),
  questions: z.array(
    z.object({
      correctOptionId: z.uuid(),
      id: z.uuid(),
      options: z.array(
        z.object({
          id: z.uuid(),
          label: z.string(),
        }),
      ),
      position: z.number().int().positive(),
      prompt: z.string(),
      selectedOptionId: z.uuid().nullable(),
    }),
  ),
  scoreObtained: z.number().nonnegative(),
  scorePercentage: z.number().min(0).max(100),
  tabWarningCount: z.number().int().nonnegative(),
  title: z.string(),
  unansweredCount: z.number().int().nonnegative(),
});

export async function getGuestResult(): Promise<GuestExamResult | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const attemptTokenHash = await getAttemptTokenHash();

  if (!attemptTokenHash) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_guest_result", {
    p_attempt_token_hash: attemptTokenHash,
  });

  if (error) {
    console.error("Unable to load guest assessment result", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  const parsedResult = guestResultSchema.safeParse(data);

  if (!parsedResult.success) {
    console.error("Guest result data did not match the expected shape");
    return null;
  }

  return parsedResult.data;
}
