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

const trainersSchema = z.array(
  z.object({
    attemptId: z.uuid(),
    correctCount: z.number().nullable(),
    email: z.string(),
    hub: z.string(),
    maximumScore: numeric,
    name: z.string(),
    qualified: z.boolean().nullable(),
    region: z.string(),
    scoreObtained: numeric,
    scorePercentage: numeric,
    startedAt: z.string().nullable(),
    status: z.string(),
    submittedAt: z.string().nullable(),
  }),
);

export type TrainerRow = z.infer<typeof trainersSchema>[number];

export type TrainerFilters = {
  hubId?: string;
  regionId?: string;
  search?: string;
};

export async function getAdminTrainers(
  filters: TrainerFilters = {},
): Promise<TrainerRow[] | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const sessionTokenHash = await getAdminSessionTokenHash();

  if (!sessionTokenHash) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_trainers", {
    p_hub_id: filters.hubId ?? null,
    p_region_id: filters.regionId ?? null,
    p_search: filters.search ?? null,
    p_session_token_hash: sessionTokenHash,
  });

  if (error) {
    console.error("Unable to load trainers", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  const parsed = trainersSchema.safeParse(data);

  if (!parsed.success) {
    console.error("Trainer rows did not match the expected shape");
    return null;
  }

  return parsed.data;
}
