"use server";

import { redirect } from "next/navigation";

import {
  createAttemptToken,
  hashAttemptToken,
  setAttemptCookie,
} from "@/features/exam/server/attempt-session";
import type { LoginActionState } from "@/features/auth/types";
import { guestLoginSchema } from "@/features/auth/validation/login-schema";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

function getAttemptErrorMessage(message: string) {
  if (message.includes("INVALID_TRAINING_LOCATION")) {
    return "The selected training location is no longer available.";
  }

  if (message.includes("NO_ACTIVE_ASSESSMENT")) {
    return "No assessment is currently available.";
  }

  if (message.includes("QUESTION_BANK_INCOMPLETE")) {
    return "The assessment question bank is not ready yet.";
  }

  if (message.includes("MAXIMUM_ATTEMPTS_REACHED")) {
    return "An assessment has already been submitted for this email address.";
  }

  return "We could not prepare your assessment. Please try again.";
}

export async function continueToExam(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const validatedFields = guestLoginSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    hubId: formData.get("hubId"),
    regionId: formData.get("regionId"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Check the highlighted fields and try again.",
      status: "error",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      message: "Backend connection is not configured yet.",
      status: "error",
    };
  }

  const attemptToken = createAttemptToken();
  const attemptTokenHash = hashAttemptToken(attemptToken);
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc("create_guest_attempt", {
    p_attempt_token_hash: attemptTokenHash,
    p_email: validatedFields.data.email,
    p_full_name: validatedFields.data.fullName,
    p_hub_id: validatedFields.data.hubId,
    p_region_id: validatedFields.data.regionId,
  });

  if (error) {
    console.error("Unable to create guest assessment attempt", {
      code: error.code,
      message: error.message,
    });

    return {
      message: getAttemptErrorMessage(error.message),
      status: "error",
    };
  }

  await setAttemptCookie(attemptToken);
  redirect("/exam");
}
