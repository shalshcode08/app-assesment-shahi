import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "shahi_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

export function createAdminSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAdminSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getAdminSessionTokenHash() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  return sessionToken ? hashAdminSessionToken(sessionToken) : null;
}

export async function setAdminSessionCookie(sessionToken: string) {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    path: "/",
    priority: "high",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.delete(ADMIN_COOKIE_NAME);
}
