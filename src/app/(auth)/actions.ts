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
import { listClassNames } from "@/lib/classes/server";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Non-sensitive inputs sent back so the form keeps them (never passwords). */
  values?: Record<string, string>;
};

const LOCKED = "Trop d'essais : demande un nouveau code";
const EXPIRED = "Session expirée, recommence";

function fieldErrors(error: z.ZodError, values?: Record<string, string>): FormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return { fieldErrors: errors, values };
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
    read(formData, "email", "password", "passwordConfirm", "displayName", "className"),
  );
  const values = read(formData, "email", "displayName", "className");
  if (!parsed.success) return fieldErrors(parsed.error, values);
  const { email, password, displayName, className } = parsed.data;
  if (!(await listClassNames()).includes(className))
    return { fieldErrors: { className: "Choisis une classe dans la liste" }, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName, class_name: className } },
  });
  if (error) return { error: authErrorMessage("signUp", error), values };

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
  if (error) return { error: authErrorMessage("resendCode", error) };

  await resetAttempts(email, purpose);
  return { message: "Nouveau code envoyé" };
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(read(formData, "email", "password"));
  const values = read(formData, "email");
  if (!parsed.success) return fieldErrors(parsed.error, values);
  const { email, password } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "email_not_confirmed") {
    await supabase.auth.resend({ type: "signup", email });
    await resetAttempts(email, "signup");
    await setPending(email, "signup");
    redirect("/verification");
  }
  if (error) return { error: authErrorMessage("signIn", error), values };
  redirect("/");
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  const values = read(formData, "email");
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0].message }, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data);
  // Unknown accounts are not an error (no enumeration); delivery problems are.
  if (error) return { error: authErrorMessage("requestPasswordReset", error), values };

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
    return { error: `${authErrorMessage("resetPassword", updateError)}. Demande un nouveau code.` };
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
