import "server-only";

import { z } from "zod";

import { getAdminSessionTokenHash } from "@/features/auth/server/admin-session";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const count = z.union([z.number(), z.string()]).transform(Number);

const locationsSchema = z.array(
  z.object({
    attemptCount: count,
    code: z.string(),
    displayOrder: z.number(),
    hubs: z.array(
      z.object({
        attemptCount: count,
        code: z.string(),
        displayOrder: z.number(),
        id: z.uuid(),
        isActive: z.boolean(),
        name: z.string(),
        trainerCount: count,
      }),
    ),
    id: z.uuid(),
    isActive: z.boolean(),
    name: z.string(),
    trainerCount: count,
  }),
);

export type AdminRegion = z.infer<typeof locationsSchema>[number];
export type AdminHub = AdminRegion["hubs"][number];

export async function getAdminLocations(): Promise<AdminRegion[] | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const sessionTokenHash = await getAdminSessionTokenHash();

  if (!sessionTokenHash) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_locations", {
    p_session_token_hash: sessionTokenHash,
  });

  if (error) {
    console.error("Unable to load locations", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  const parsed = locationsSchema.safeParse(data);

  if (!parsed.success) {
    console.error("Locations did not match the expected shape");
    return null;
  }

  return parsed.data;
}
