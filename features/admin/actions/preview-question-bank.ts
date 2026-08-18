"use server";

import { z } from "zod";

import { getAdminSessionTokenHash } from "@/features/auth/server/admin-session";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const PAGE_SIZE = 10;

const previewSchema = z.object({
  questions: z.array(
    z.object({
      difficulty: z.string().nullable(),
      externalCode: z.string(),
      id: z.uuid(),
      isActive: z.boolean(),
      options: z.array(
        z.object({
          code: z.string(),
          isCorrect: z.boolean().nullable(),
          text: z.string(),
        }),
      ),
      questionText: z.string(),
    }),
  ),
  total: z.union([z.number(), z.string()]).transform(Number),
});

export type QuestionBankPreview = z.infer<typeof previewSchema> & {
  offset: number;
  pageSize: number;
};

export async function previewQuestionBank(
  testId: string,
  offset = 0,
): Promise<QuestionBankPreview | { message: string }> {
  const parsedId = z.uuid().safeParse(testId);

  if (!parsedId.success) {
    return { message: "That test no longer exists." };
  }

  if (!isSupabaseConfigured()) {
    return { message: "Backend connection is not configured yet." };
  }

  const sessionTokenHash = await getAdminSessionTokenHash();

  if (!sessionTokenHash) {
    return { message: "Your session has expired. Sign in again." };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_test_questions", {
    p_assessment_id: parsedId.data,
    p_limit: PAGE_SIZE,
    p_offset: Math.max(0, offset),
    p_session_token_hash: sessionTokenHash,
  });

  if (error) {
    console.error("Unable to preview the question bank", {
      code: error.code,
      message: error.message,
    });
    return { message: "The question bank could not be loaded." };
  }

  const parsed = previewSchema.safeParse(data);

  if (!parsed.success) {
    return { message: "The question bank could not be read." };
  }

  return { ...parsed.data, offset: Math.max(0, offset), pageSize: PAGE_SIZE };
}
