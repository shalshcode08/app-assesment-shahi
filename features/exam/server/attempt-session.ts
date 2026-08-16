import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";

export const ATTEMPT_COOKIE_NAME = "shahi_assessment_attempt";
const ATTEMPT_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

export function createAttemptToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAttemptToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getAttemptTokenHash() {
  const cookieStore = await cookies();
  const attemptToken = cookieStore.get(ATTEMPT_COOKIE_NAME)?.value;

  return attemptToken ? hashAttemptToken(attemptToken) : null;
}

export async function clearAttemptCookie() {
  const cookieStore = await cookies();

  cookieStore.delete(ATTEMPT_COOKIE_NAME);
}

export async function setAttemptCookie(attemptToken: string) {
  const cookieStore = await cookies();

  cookieStore.set(ATTEMPT_COOKIE_NAME, attemptToken, {
    httpOnly: true,
    maxAge: ATTEMPT_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    priority: "high",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
