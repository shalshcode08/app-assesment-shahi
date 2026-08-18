import "server-only";

import { getAdminSessionTokenHash } from "@/features/auth/server/admin-session";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

type RpcOutcome =
  | { ok: true; result: Record<string, unknown> }
  | { ok: false; message: string };

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

/**
 * Calls an admin RPC with the caller's session hash. Every settings function
 * returns `{ status, message }`, so anything other than `ok` — including an
 * expired session — comes back as a message the form can show.
 */
export async function callAdminRpc(
  name: string,
  args: Record<string, unknown>,
): Promise<RpcOutcome> {
  if (!isSupabaseConfigured()) {
    return { message: "Backend connection is not configured yet.", ok: false };
  }

  const sessionTokenHash = await getAdminSessionTokenHash();

  if (!sessionTokenHash) {
    return { message: "Your session has expired. Sign in again.", ok: false };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc(name, {
    p_session_token_hash: sessionTokenHash,
    ...args,
  });

  if (error) {
    console.error(`Admin RPC ${name} failed`, {
      code: error.code,
      message: error.message,
    });

    if (error.message.includes("ADMIN_SESSION_INVALID")) {
      return { message: "Your session has expired. Sign in again.", ok: false };
    }

    // Constraint violations raised by the import carry a readable message.
    return {
      message: error.code === "22023" ? error.message : FALLBACK_MESSAGE,
      ok: false,
    };
  }

  const result = (data ?? {}) as Record<string, unknown>;

  if (result.status !== "ok") {
    return {
      message:
        typeof result.message === "string" ? result.message : FALLBACK_MESSAGE,
      ok: false,
    };
  }

  return { ok: true, result };
}
