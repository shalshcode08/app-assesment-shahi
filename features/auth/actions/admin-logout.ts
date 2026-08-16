"use server";

import { redirect } from "next/navigation";

import {
  clearAdminSessionCookie,
  getAdminSessionTokenHash,
} from "@/features/auth/server/admin-session";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export async function adminLogout() {
  const sessionTokenHash = await getAdminSessionTokenHash();

  // Delete the row as well as the cookie, so a copied cookie value cannot be
  // replayed after sign-out.
  if (sessionTokenHash && isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.rpc("revoke_admin_session", {
      p_session_token_hash: sessionTokenHash,
    });

    if (error) {
      console.error("Unable to revoke admin session", {
        code: error.code,
        message: error.message,
      });
    }
  }

  await clearAdminSessionCookie();

  redirect("/login/admin");
}
