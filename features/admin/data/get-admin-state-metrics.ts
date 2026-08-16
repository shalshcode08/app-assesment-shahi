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

const stateMetricsSchema = z.array(
  z.object({
    averageScorePercentage: numeric,
    centreCount: z.number(),
    centres: z.array(z.string()),
    failed: z.number(),
    inProgress: z.number(),
    passRate: numeric,
    passed: z.number(),
    region: z.string(),
    regionId: z.uuid(),
    submitted: z.number(),
    trainers: z.number(),
  }),
);

export type StateMetric = z.infer<typeof stateMetricsSchema>[number];

export async function getAdminStateMetrics(): Promise<StateMetric[] | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const sessionTokenHash = await getAdminSessionTokenHash();

  if (!sessionTokenHash) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_state_metrics", {
    p_session_token_hash: sessionTokenHash,
  });

  if (error) {
    console.error("Unable to load state metrics", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  const parsed = stateMetricsSchema.safeParse(data);

  if (!parsed.success) {
    console.error("State metrics did not match the expected shape");
    return null;
  }

  return parsed.data;
}
