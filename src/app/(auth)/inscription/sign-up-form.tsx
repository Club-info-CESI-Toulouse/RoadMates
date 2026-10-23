"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import {
  ALLOWED_EMAIL_DOMAIN,
  DISPLAY_NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/schema";
import { signUp, type FormState } from "../actions";

const initialState: FormState = {};

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initialState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        label="Adresse email de l'école"
        name="email"
        type="email"
        autoComplete="email"
        placeholder={`prenom.nom@${ALLOWED_EMAIL_DOMAIN}`}
        pattern={`.+@${ALLOWED_EMAIL_DOMAIN.replaceAll(".", "\\.")}`}
        title={`Adresse @${ALLOWED_EMAIL_DOMAIN}`}
        required
        error={e.email}
      />
      <Field
        label="Pseudo ou prénom"
        name="displayName"
        autoComplete="nickname"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        required
        error={e.displayName}
      />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        required
        error={e.password}
      />
      <Field
        label="Confirmer le mot de passe"
        name="passwordConfirm"
        type="password"
        autoComplete="new-password"
        required
        error={e.passwordConfirm}
      />
      <p className="text-xs text-muted">
        Ton email n&apos;est jamais visible des autres : seul ton pseudo est affiché.
      </p>
      <FormMessage error={state.error} />
      <SubmitButton pending={pending}>Recevoir mon code</SubmitButton>
    </form>
  );
}
