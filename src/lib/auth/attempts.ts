import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_CODE_ATTEMPTS } from "./schema";
import type { PendingPurpose } from "./pending";

// Caps wrong codes per email and purpose; a new code resets the counter.
const hash = (email: string) => createHash("sha256").update(email).digest("hex");

export async function isLocked(email: string, purpose: PendingPurpose) {
  const { data } = await createAdminClient()
    .from("verification_attempts")
    .select("attempts")
    .eq("email_hash", hash(email))
    .eq("purpose", purpose)
    .maybeSingle();
  return (data?.attempts ?? 0) >= MAX_CODE_ATTEMPTS;
}

export async function recordFailure(email: string, purpose: PendingPurpose) {
  const { data } = await createAdminClient().rpc("record_verification_failure", {
    p_email_hash: hash(email),
    p_purpose: purpose,
  });
  return MAX_CODE_ATTEMPTS - (data ?? MAX_CODE_ATTEMPTS);
}

export async function resetAttempts(email: string, purpose: PendingPurpose) {
  await createAdminClient()
    .from("verification_attempts")
    .delete()
    .eq("email_hash", hash(email))
    .eq("purpose", purpose);
}
