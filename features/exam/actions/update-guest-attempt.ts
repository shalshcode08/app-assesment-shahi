"use server";

import { z } from "zod";

import { getAttemptTokenHash } from "@/features/exam/server/attempt-session";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

type MutationResult =
  | { ok: true }
  | {
      message: string;
      ok: false;
    };

const answerInputSchema = z.object({
  attemptQuestionId: z.uuid(),
  revision: z.number().int().positive(),
  selectedOptionId: z.uuid().nullable(),
});

const questionStateInputSchema = z.object({
  attemptQuestionId: z.uuid(),
  isFlagged: z.boolean().optional(),
  isVisited: z.boolean().default(true),
});

async function getMutationContext(): Promise<
  | { attemptTokenHash: string; supabase: ReturnType<typeof createServerSupabaseClient> }
  | null
> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const attemptTokenHash = await getAttemptTokenHash();

  if (!attemptTokenHash) {
    return null;
  }

  return {
    attemptTokenHash,
    supabase: createServerSupabaseClient(),
  };
}

export async function saveGuestAnswer(input: {
  attemptQuestionId: string;
  revision: number;
  selectedOptionId: string | null;
}): Promise<MutationResult> {
  const parsedInput = answerInputSchema.safeParse(input);

  if (!parsedInput.success) {
    return { message: "This answer could not be saved.", ok: false };
  }

  const context = await getMutationContext();

  if (!context) {
    return {
      message: "Your assessment session has expired. Please log in again.",
      ok: false,
    };
  }

  const { error } = await context.supabase.rpc("save_guest_answer", {
    p_attempt_question_id: parsedInput.data.attemptQuestionId,
    p_attempt_token_hash: context.attemptTokenHash,
    p_revision: parsedInput.data.revision,
    p_selected_option_id: parsedInput.data.selectedOptionId,
  });

  if (error) {
    console.error("Unable to save guest answer", {
      code: error.code,
      message: error.message,
    });
    return {
      message: error.message.includes("ATTEMPT_NOT_ACTIVE")
        ? "This assessment is no longer accepting answers."
        : "Your answer could not be saved. Please try again.",
      ok: false,
    };
  }

  return { ok: true };
}

export async function setGuestQuestionState(input: {
  attemptQuestionId: string;
  isFlagged?: boolean;
  isVisited?: boolean;
}): Promise<MutationResult> {
  const parsedInput = questionStateInputSchema.safeParse(input);

  if (!parsedInput.success) {
    return { message: "Question status could not be saved.", ok: false };
  }

  const context = await getMutationContext();

  if (!context) {
    return {
      message: "Your assessment session has expired. Please log in again.",
      ok: false,
    };
  }

  const { error } = await context.supabase.rpc("set_guest_question_state", {
    p_attempt_question_id: parsedInput.data.attemptQuestionId,
    p_attempt_token_hash: context.attemptTokenHash,
    p_is_flagged: parsedInput.data.isFlagged ?? null,
    p_is_visited: parsedInput.data.isVisited,
  });

  if (error) {
    console.error("Unable to save guest question state", {
      code: error.code,
      message: error.message,
    });
    return {
      message: "Question status could not be saved. Please try again.",
      ok: false,
    };
  }

  return { ok: true };
}

export async function submitGuestAttempt(): Promise<MutationResult> {
  const context = await getMutationContext();

  if (!context) {
    return {
      message: "Your assessment session has expired. Please log in again.",
      ok: false,
    };
  }

  const { error } = await context.supabase.rpc("submit_guest_attempt", {
    p_attempt_token_hash: context.attemptTokenHash,
  });

  if (error) {
    console.error("Unable to submit guest assessment", {
      code: error.code,
      message: error.message,
    });
    return {
      message: "The assessment could not be submitted. Please try again.",
      ok: false,
    };
  }

  return { ok: true };
}
