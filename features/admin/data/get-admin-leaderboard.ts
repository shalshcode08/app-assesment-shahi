import "server-only";

import { z } from "zod";

import { getAdminSessionTokenHash } from "@/features/auth/server/admin-session";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import type { SortKey, StatusKey } from "@/features/admin/leaderboard-options";

const numeric = z
  .union([z.number(), z.string()])
  .nullable()
  .transform((value) => (value === null ? null : Number(value)));

const rowSchema = z.object({
  attemptId: z.uuid(),
  correctCount: z.number().nullable(),
  durationSeconds: z.number(),
  email: z.string(),
  hub: z.string(),
  maximumScore: numeric,
  name: z.string(),
  qualified: z.boolean().nullable(),
  rank: z.number(),
  region: z.string(),
  scoreObtained: numeric,
  scorePercentage: numeric,
  submittedAt: z.string().nullable(),
  tabWarningCount: z.number(),
});

const leaderboardSchema = z.object({
  podium: z.array(
    z.object({
      attemptId: z.uuid(),
      durationSeconds: z.number(),
      hub: z.string(),
      maximumScore: numeric,
      name: z.string(),
      rank: z.number(),
      region: z.string(),
      scoreObtained: numeric,
      scorePercentage: numeric,
    }),
  ),
  rows: z.array(rowSchema),
  summary: z.object({
    averageScorePercentage: numeric,
    passRate: numeric,
    qualifiedCount: z.number(),
    questionBankCount: z.number(),
    totalAssessments: z.number(),
  }),
});

export type Leaderboard = z.infer<typeof leaderboardSchema>;
export type LeaderboardRow = z.infer<typeof rowSchema>;

export async function getAdminLeaderboard({
  search,
  sort = "score_desc",
  status = "all",
}: {
  search?: string;
  sort?: SortKey;
  status?: StatusKey;
} = {}): Promise<Leaderboard | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const sessionTokenHash = await getAdminSessionTokenHash();

  if (!sessionTokenHash) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_leaderboard", {
    p_search: search ?? null,
    p_session_token_hash: sessionTokenHash,
    p_sort: sort,
    p_status: status,
  });

  if (error) {
    console.error("Unable to load leaderboard", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  const parsed = leaderboardSchema.safeParse(data);

  if (!parsed.success) {
    console.error("Leaderboard did not match the expected shape");
    return null;
  }

  return parsed.data;
}
