import "server-only";

import { z } from "zod";

import { getAdminSessionTokenHash } from "@/features/auth/server/admin-session";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const count = z.union([z.number(), z.string()]).transform(Number);
const numeric = z.union([z.number(), z.string()]).transform(Number);

const testsSchema = z.array(
  z.object({
    attemptCount: count,
    availableFrom: z.string().nullable(),
    availableUntil: z.string().nullable(),
    code: z.string(),
    durationSeconds: z.number(),
    id: z.uuid(),
    instructions: z.string().nullable(),
    languages: z.array(
      z.object({
        code: z.string(),
        id: z.uuid(),
        name: z.string(),
        translatedCount: count,
      }),
    ),
    isActive: z.boolean(),
    maxTabSwitches: z.number().nullable(),
    maximumAttemptsPerEmail: z.number(),
    passingPercentage: numeric,
    publishedAt: z.string().nullable(),
    questionCount: count,
    questionsPerAttempt: z.number(),
    readyQuestionCount: count,
    shuffleOptions: z.boolean(),
    shuffleQuestions: z.boolean(),
    status: z.enum(["draft", "published", "archived"]),
    title: z.string(),
    updatedAt: z.string(),
    versionId: z.uuid(),
    versionNumber: z.number(),
  }),
);

export type AdminTest = z.infer<typeof testsSchema>[number];
export type AdminTestLanguage = AdminTest["languages"][number];

export async function getAdminTests(): Promise<AdminTest[] | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const sessionTokenHash = await getAdminSessionTokenHash();

  if (!sessionTokenHash) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_tests", {
    p_session_token_hash: sessionTokenHash,
  });

  if (error) {
    console.error("Unable to load tests", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  const parsed = testsSchema.safeParse(data);

  if (!parsed.success) {
    console.error("Tests did not match the expected shape");
    return null;
  }

  return parsed.data;
}
