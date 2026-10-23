"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { signIn, type FormState } from "../actions";

const initialState: FormState = {};

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, initialState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        label="Adresse email"
        name="email"
        type="email"
        defaultValue={state.values?.email}
        autoComplete="email"
        required
        error={e.email}
      />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={e.password}
      />
      <Link href="/mot-de-passe-oublie" className="self-end text-sm text-muted underline">
        Mot de passe oublié ?
      </Link>
      <FormMessage error={state.error} />
      <SubmitButton pending={pending}>Se connecter</SubmitButton>
    </form>
  );
}
