"use server";

import { redirect } from "next/navigation";

import {
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
  hashAdminSessionToken,
  setAdminSessionCookie,
} from "@/features/auth/server/admin-session";
import type { AdminLoginActionState } from "@/features/auth/types";
import { adminLoginSchema } from "@/features/auth/validation/admin-login-schema";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

// Wrong password and unknown account share a message so the form cannot be used
// to discover which admin addresses exist.
const INVALID_CREDENTIALS_MESSAGE = "Email address or password is incorrect.";

export async function adminLogin(
  _previousState: AdminLoginActionState,
  formData: FormData,
): Promise<AdminLoginActionState> {
  const validatedFields = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
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

  const sessionToken = createAdminSessionToken();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("authenticate_admin", {
    p_email: validatedFields.data.email,
    p_password: validatedFields.data.password,
    p_session_token_hash: hashAdminSessionToken(sessionToken),
    p_session_ttl_seconds: ADMIN_SESSION_TTL_SECONDS,
  });

  if (error) {
    console.error("Unable to authenticate admin", {
      code: error.code,
      message: error.message,
    });
    return {
      message: "We could not sign you in. Please try again.",
      status: "error",
    };
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (result?.status !== "ok") {
    if (result?.status === "locked") {
      return {
        message:
          "Too many failed attempts. Try again in a few minutes.",
        status: "error",
      };
    }

    if (result?.status === "inactive") {
      return {
        message: "This admin account is no longer active.",
        status: "error",
      };
    }

    return { message: INVALID_CREDENTIALS_MESSAGE, status: "error" };
  }

  await setAdminSessionCookie(sessionToken);

  redirect("/admin/dashboard");
}
