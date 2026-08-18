import "server-only";

import { z } from "zod";

import { getAdminSessionTokenHash } from "@/features/auth/server/admin-session";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

/** Postgres returns numeric as a string over PostgREST; aggregates return null. */
const numeric = z
  .union([z.number(), z.string()])
  .nullable()
  .transform((value) => (value === null ? null : Number(value)));

const count = z.union([z.number(), z.string()]).transform(Number);

const analyticsSchema = z.object({
  durationDistribution: z.array(
    z.object({
      averageScore: numeric,
      count: count,
      passRate: numeric,
      rangeEnd: numeric,
      rangeStart: count,
    }),
  ),
  generatedAt: z.string(),
  hourly: z.array(z.object({ hour: count, submitted: count })),
  hubs: z.array(
    z.object({
      attempts: count,
      averageScore: numeric,
      bestScore: numeric,
      hub: z.string(),
      medianDurationSeconds: numeric,
      medianScore: numeric,
      passRate: numeric,
      qualified: count,
      region: z.string(),
      warnings: count,
    }),
  ),
  integrity: z.object({
    clean: z.object({
      attempts: count,
      averageScore: numeric,
      passRate: numeric,
    }),
    flagged: z.object({
      attempts: count,
      averageScore: numeric,
      passRate: numeric,
    }),
    maxWarnings: count,
    totalWarnings: count,
  }),
  itemAnalysis: z.array(
    z.object({
      averagePosition: numeric,
      bottomQuartileCorrect: numeric,
      category: z.string().nullable(),
      code: z.string(),
      correct: count,
      difficultyIndex: numeric,
      difficultyLabel: z.string().nullable(),
      discriminationIndex: numeric,
      flagRate: numeric,
      flagged: count,
      options: z.array(
        z.object({
          code: z.string(),
          isCorrect: z.boolean(),
          picks: count,
          share: numeric,
          text: z.string(),
        }),
      ),
      presented: count,
      prompt: z.string(),
      topDistractor: z.string().nullable(),
      topDistractorPicks: numeric,
      topQuartileCorrect: numeric,
      unanswered: count,
      unansweredRate: numeric,
    }),
  ),
  passingPercentage: numeric,
  regions: z.array(
    z.object({
      attempts: count,
      averageScore: numeric,
      hubs: count,
      passRate: numeric,
      qualified: count,
      region: z.string(),
      warnings: count,
    }),
  ),
  scoreDistribution: z.array(
    z.object({
      count: count,
      notQualified: count,
      qualified: count,
      rangeEnd: count,
      rangeStart: count,
    }),
  ),
  summary: z.object({
    abandoned: count,
    attemptsWithWarnings: count,
    averageCorrect: numeric,
    averageDurationSeconds: numeric,
    averageIncorrect: numeric,
    averageScore: numeric,
    averageUnanswered: numeric,
    averageWarnings: numeric,
    candidates: count,
    created: count,
    expired: count,
    fastestDurationSeconds: numeric,
    flagRate: numeric,
    hubsCovered: count,
    hubsTotal: count,
    inProgress: count,
    maxScore: numeric,
    medianDurationSeconds: numeric,
    medianScore: numeric,
    minScore: numeric,
    notQualified: count,
    notStarted: count,
    p10Score: numeric,
    p25Score: numeric,
    p75Score: numeric,
    p90Score: numeric,
    passRate: numeric,
    perfectScores: count,
    qualified: count,
    questionsAnalysed: count,
    questionsTotal: count,
    regionsCovered: count,
    regionsTotal: count,
    scoreStdDev: numeric,
    slowestDurationSeconds: numeric,
    started: count,
    submitted: count,
    submittedLast7Days: count,
    submittedToday: count,
    totalWarnings: count,
  }),
  timeScore: z.array(
    z.object({
      minutes: numeric,
      qualified: z.boolean().nullable(),
      score: numeric,
      warnings: count,
    }),
  ),
  topPerformers: z.array(
    z.object({
      durationSeconds: numeric,
      hub: z.string(),
      name: z.string(),
      region: z.string(),
      score: numeric,
      warnings: count,
    }),
  ),
  trend: z.array(
    z.object({
      averageScore: numeric,
      date: z.string(),
      qualified: count,
      submitted: count,
    }),
  ),
  trendDays: count,
  warningLadder: z.array(
    z.object({
      attempts: count,
      averageScore: numeric,
      bucket: count,
      label: z.string(),
      passRate: numeric,
    }),
  ),
  weekday: z.array(
    z.object({
      averageScore: numeric,
      submitted: count,
      weekday: count,
    }),
  ),
});

export type Analytics = z.infer<typeof analyticsSchema>;

export async function getAdminAnalytics(
  trendDays = 30,
): Promise<Analytics | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const sessionTokenHash = await getAdminSessionTokenHash();

  if (!sessionTokenHash) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_analytics", {
    p_session_token_hash: sessionTokenHash,
    p_trend_days: trendDays,
  });

  if (error) {
    console.error("Unable to load analytics", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  const parsed = analyticsSchema.safeParse(data);

  if (!parsed.success) {
    console.error("Analytics did not match the expected shape", {
      issues: parsed.error.issues.slice(0, 5),
    });
    return null;
  }

  return parsed.data;
}
