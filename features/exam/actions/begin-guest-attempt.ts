"use server";

import { z } from "zod";

import { getAttemptTokenHash } from "@/features/exam/server/attempt-session";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export type BeginAttemptResult =
  | {
      expiresAt: string;
      ok: true;
      serverNow: string;
    }
  | {
      message: string;
      ok: false;
    };

const beginAttemptRowsSchema = z.array(
  z.object({
    expires_at: z.string(),
    server_now: z.string(),
  }),
);

export async function beginGuestAttempt(): Promise<BeginAttemptResult> {
  if (!isSupabaseConfigured()) {
    return { message: "Backend connection is not configured.", ok: false };
  }

  const attemptTokenHash = await getAttemptTokenHash();

  if (!attemptTokenHash) {
    return {
      message: "Your assessment session has expired. Please log in again.",
      ok: false,
    };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("begin_guest_attempt", {
    p_attempt_token_hash: attemptTokenHash,
  });

  if (error) {
    console.error("Unable to begin guest assessment", {
      code: error.code,
      message: error.message,
    });

    return {
      message: "The assessment could not be started. Please try again.",
      ok: false,
    };
  }

  const parsedRows = beginAttemptRowsSchema.safeParse(data);
  const attempt = parsedRows.success ? parsedRows.data[0] : undefined;

  if (!attempt) {
    return {
      message: "The assessment could not be started. Please try again.",
      ok: false,
    };
  }

  return {
    expiresAt: attempt.expires_at,
    ok: true,
    serverNow: attempt.server_now,
  };
}
