import "server-only";

import { z } from "zod";

import { getAdminSessionTokenHash } from "@/features/auth/server/admin-session";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const numeric = z.union([z.number(), z.string()]).nullable().transform((value) =>
  value === null ? null : Number(value),
);

const dashboardSchema = z.object({
  coverage: z.object({
    activeStates: z.number(),
    skillCentres: z.number(),
  }),
  generatedAt: z.string(),
  hardestQuestions: z.array(
    z.object({
      answered: z.number(),
      code: z.string(),
      correctRate: numeric,
      prompt: z.string(),
    }),
  ),
  passingPercentage: numeric,
  recentAttempts: z.array(
    z.object({
      attemptId: z.uuid(),
      correctCount: z.number().nullable(),
      email: z.string(),
      hub: z.string(),
      name: z.string(),
      qualified: z.boolean().nullable(),
      region: z.string(),
      scorePercentage: numeric,
      startedAt: z.string().nullable(),
      status: z.string(),
      submittedAt: z.string().nullable(),
      tabWarningCount: z.number(),
    }),
  ),
  regions: z.array(
    z.object({
      attempts: z.number(),
      averageScorePercentage: numeric,
      qualified: z.number(),
      region: z.string(),
      submitted: z.number(),
    }),
  ),
  scoreDistribution: z.array(
    z.object({
      bucket: z.number(),
      count: z.number(),
      rangeEnd: z.number(),
      rangeStart: z.number(),
    }),
  ),
  summary: z.object({
    assessedTrainers: z.number(),
    averageDurationSeconds: numeric,
    averageScorePercentage: numeric,
    candidateCount: z.number(),
    inProgressCount: z.number(),
    passRate: numeric,
    qualifiedCount: z.number(),
    submittedCount: z.number(),
    tabWarningTotal: z.number(),
    totalAttempts: z.number(),
  }),
  topHub: z
    .object({
      averageScorePercentage: numeric,
      hub: z.string(),
      region: z.string(),
      topTrainer: z
        .object({
          hub: z.string(),
          maximumScore: numeric,
          name: z.string(),
          region: z.string(),
          scoreObtained: numeric,
          scorePercentage: numeric,
        })
        .nullable(),
      trainersEvaluated: z.number(),
    })
    .nullable(),
  trend: z.array(
    z.object({
      date: z.string(),
      started: z.number(),
      submitted: z.number(),
    }),
  ),
});

export type AdminDashboard = z.infer<typeof dashboardSchema>;

export const TREND_RANGES = [7, 14, 30] as const;

export type TrendRange = (typeof TREND_RANGES)[number];

export function parseTrendRange(value: string | undefined): TrendRange {
  const parsed = Number(value);

  return TREND_RANGES.includes(parsed as TrendRange)
    ? (parsed as TrendRange)
    : 14;
}

export async function getAdminDashboard(
  trendDays: TrendRange = 14,
): Promise<AdminDashboard | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const sessionTokenHash = await getAdminSessionTokenHash();

  if (!sessionTokenHash) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_dashboard", {
    p_session_token_hash: sessionTokenHash,
    p_trend_days: trendDays,
  });

  if (error) {
    console.error("Unable to load admin dashboard", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  const parsed = dashboardSchema.safeParse(data);

  if (!parsed.success) {
    console.error("Admin dashboard data did not match the expected shape");
    return null;
  }

  return parsed.data;
}
