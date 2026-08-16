import "server-only";

import { z } from "zod";

import { getAdminSessionTokenHash } from "@/features/auth/server/admin-session";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const adminSessionSchema = z.object({
  admin_id: z.uuid(),
  email: z.string(),
  expires_at: z.string(),
  full_name: z.string().nullable(),
});

export type AdminSession = {
  adminId: string;
  email: string;
  expiresAt: string;
  fullName: string | null;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const sessionTokenHash = await getAdminSessionTokenHash();

  if (!sessionTokenHash) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_session", {
    p_session_token_hash: sessionTokenHash,
  });

  if (error) {
    console.error("Unable to load admin session", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  const parsed = adminSessionSchema.safeParse(
    Array.isArray(data) ? data[0] : data,
  );

  if (!parsed.success) {
    return null;
  }

  return {
    adminId: parsed.data.admin_id,
    email: parsed.data.email,
    expiresAt: parsed.data.expires_at,
    fullName: parsed.data.full_name,
  };
}
