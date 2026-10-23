"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { CODE_LENGTH } from "@/lib/auth/schema";
import type { PendingPurpose } from "@/lib/auth/pending";
import { resendCode, type FormState } from "./actions";

type Props = {
  purpose: PendingPurpose;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children?: (errors: Record<string, string>) => ReactNode;
};

const initialState: FormState = {};

// 6-digit code input + resend, shared by sign-up verification and password reset.
export function CodeForm({ purpose, action, submitLabel, children }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [resent, setResent] = useState<FormState | null>(null);
  const [resending, startResend] = useTransition();
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        label="Code reçu par email"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern={`\\d{${CODE_LENGTH}}`}
        maxLength={CODE_LENGTH}
        placeholder="123456"
        required
        error={e.code}
        className="text-center font-mono text-2xl tracking-[0.5em]"
      />
      {children?.(e)}
      <FormMessage error={state.error ?? resent?.error} message={resent?.message} />
      <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
      <button
        type="button"
        disabled={resending}
        onClick={() => startResend(async () => setResent(await resendCode(purpose)))}
        className="text-sm text-muted underline disabled:opacity-60"
      >
        Renvoyer un code
      </button>
    </form>
  );
}
