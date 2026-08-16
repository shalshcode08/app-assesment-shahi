import "server-only";

import { z } from "zod";

import { getAdminSessionTokenHash } from "@/features/auth/server/admin-session";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const numeric = z
  .union([z.number(), z.string()])
  .nullable()
  .transform((value) => (value === null ? null : Number(value)));

const reportSchema = z.object({
  attemptId: z.uuid(),
  candidate: z.object({
    email: z.string(),
    hub: z.string(),
    name: z.string(),
    region: z.string(),
  }),
  configuredDurationSeconds: z.number(),
  correctCount: z.number().nullable(),
  durationSeconds: z.number().nullable(),
  incorrectCount: z.number().nullable(),
  maximumScore: numeric,
  passingPercentage: numeric,
  qualified: z.boolean().nullable(),
  questions: z.array(
    z.object({
      code: z.string(),
      correctOptionId: z.uuid(),
      id: z.uuid(),
      options: z.array(z.object({ id: z.uuid(), label: z.string() })),
      position: z.number(),
      prompt: z.string(),
      selectedOptionId: z.uuid().nullable(),
    }),
  ),
  scoreObtained: numeric,
  scorePercentage: numeric,
  startedAt: z.string().nullable(),
  status: z.string(),
  submittedAt: z.string().nullable(),
  tabWarningCount: z.number(),
  title: z.string(),
  unansweredCount: z.number().nullable(),
});

export type AttemptReport = z.infer<typeof reportSchema>;

export async function getAdminAttemptReport(
  attemptId: string,
): Promise<AttemptReport | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const sessionTokenHash = await getAdminSessionTokenHash();

  if (!sessionTokenHash) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_attempt_report", {
    p_attempt_id: attemptId,
    p_session_token_hash: sessionTokenHash,
  });

  if (error) {
    console.error("Unable to load attempt report", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (data === null) {
    return null;
  }

  const parsed = reportSchema.safeParse(data);

  if (!parsed.success) {
    console.error("Attempt report did not match the expected shape");
    return null;
  }

  return parsed.data;
}
