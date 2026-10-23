"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocked, recordFailure, resetAttempts } from "@/lib/auth/attempts";
import { authErrorMessage } from "@/lib/auth/errors";
import { clearPending, getPending, setPending, type PendingPurpose } from "@/lib/auth/pending";
import {
  codeSchema,
  emailSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/auth/schema";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

const LOCKED = "Trop d'essais : demande un nouveau code";
const EXPIRED = "Session expirée, recommence";

function fieldErrors(error: z.ZodError): FormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return { fieldErrors: errors };
}

const read = (formData: FormData, ...keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));

async function failedCode(email: string, purpose: PendingPurpose): Promise<FormState> {
  const left = await recordFailure(email, purpose);
  if (left <= 0) return { error: LOCKED };
  return { error: `Code invalide ou expiré (${left} essai${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""})` };
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(
    read(formData, "email", "password", "passwordConfirm", "displayName"),
  );
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, password, displayName } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) return { error: authErrorMessage(error.code) };

  await resetAttempts(email, "signup");
  await setPending(email, "signup");
  redirect("/verification");
}

export async function verifySignUp(_: FormState, formData: FormData): Promise<FormState> {
  const email = await getPending("signup");
  if (!email) return { error: EXPIRED };
  const parsed = codeSchema.safeParse(formData.get("code"));
  if (!parsed.success) return { fieldErrors: { code: parsed.error.issues[0].message } };
  if (await isLocked(email, "signup")) return { error: LOCKED };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: parsed.data, type: "email" });
  if (error) return failedCode(email, "signup");

  await resetAttempts(email, "signup");
  await clearPending();
  redirect("/");
}

export async function resendCode(purpose: PendingPurpose): Promise<FormState> {
  const email = await getPending(purpose);
  if (!email) return { error: EXPIRED };

  const supabase = await createClient();
  const { error } =
    purpose === "signup"
      ? await supabase.auth.resend({ type: "signup", email })
      : await supabase.auth.resetPasswordForEmail(email);
  if (error) return { error: authErrorMessage(error.code) };

  await resetAttempts(email, purpose);
  return { message: "Nouveau code envoyé" };
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(read(formData, "email", "password"));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, password } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "email_not_confirmed") {
    await supabase.auth.resend({ type: "signup", email });
    await resetAttempts(email, "signup");
    await setPending(email, "signup");
    redirect("/verification");
  }
  if (error) return { error: authErrorMessage(error.code) };
  redirect("/");
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0].message } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data);
  if (error && error.code?.startsWith("over_")) return { error: authErrorMessage(error.code) };

  // Same outcome whether the account exists or not.
  await resetAttempts(parsed.data, "recovery");
  await setPending(parsed.data, "recovery");
  redirect("/mot-de-passe-oublie/nouveau");
}

export async function resetPassword(_: FormState, formData: FormData): Promise<FormState> {
  const email = await getPending("recovery");
  if (!email) return { error: EXPIRED };
  const parsed = resetPasswordSchema.safeParse(read(formData, "code", "password", "passwordConfirm"));
  if (!parsed.success) return fieldErrors(parsed.error);
  if (await isLocked(email, "recovery")) return { error: LOCKED };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data.code,
    type: "recovery",
  });
  if (error) return failedCode(email, "recovery");

  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (updateError) {
    // The code is consumed: sign out so the user can request a new one cleanly.
    await supabase.auth.signOut();
    return { error: `${authErrorMessage(updateError.code)}. Demande un nouveau code.` };
  }

  await resetAttempts(email, "recovery");
  await clearPending();
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
