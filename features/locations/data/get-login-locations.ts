import "server-only";

import { z } from "zod";

import type { LoginLocationsResult } from "@/features/locations/types";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const locationRowsSchema = z.array(
  z.object({
    id: z.uuid(),
    name: z.string(),
    hubs: z.array(
      z.object({
        id: z.uuid(),
        name: z.string(),
      }),
    ),
  }),
);

export async function getLoginLocations(): Promise<LoginLocationsResult> {
  if (!isSupabaseConfigured()) {
    return {
      backendReady: false,
      message: "Backend connection is not configured yet.",
      regions: [],
    };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("regions")
    .select("id, name, hubs!inner(id, name)")
    .eq("is_active", true)
    .eq("hubs.is_active", true)
    .order("display_order", { ascending: true })
    .order("display_order", {
      ascending: true,
      referencedTable: "hubs",
    });

  if (error) {
    console.error("Unable to load login locations", {
      code: error.code,
      message: error.message,
    });

    return {
      backendReady: false,
      message: "Training locations are temporarily unavailable.",
      regions: [],
    };
  }

  const parsedLocations = locationRowsSchema.safeParse(data);

  if (!parsedLocations.success || parsedLocations.data.length === 0) {
    return {
      backendReady: false,
      message: "No active training locations are available.",
      regions: [],
    };
  }

  return {
    backendReady: true,
    regions: parsedLocations.data,
  };
}
