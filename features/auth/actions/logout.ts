"use server";

import { redirect } from "next/navigation";

import { clearAttemptCookie } from "@/features/exam/server/attempt-session";

export async function logout() {
  await clearAttemptCookie();

  redirect("/");
}
