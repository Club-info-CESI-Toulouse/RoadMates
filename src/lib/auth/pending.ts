import "server-only";
import { cookies } from "next/headers";

// Email awaiting a verification code, kept in an httpOnly cookie (never in the URL).
const COOKIE = "pending_email";
export type PendingPurpose = "signup" | "recovery";

export async function setPending(email: string, purpose: PendingPurpose) {
  (await cookies()).set(COOKIE, `${purpose}:${email}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
  });
}

export async function getPending(purpose: PendingPurpose): Promise<string | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  const prefix = `${purpose}:`;
  return value?.startsWith(prefix) ? value.slice(prefix.length) : null;
}

export async function clearPending() {
  (await cookies()).delete(COOKIE);
}
