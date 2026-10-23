"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { requestPasswordReset, type FormState } from "../actions";

const initialState: FormState = {};

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        label="Adresse email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <FormMessage error={state.error} />
      <SubmitButton pending={pending}>Recevoir un code</SubmitButton>
    </form>
  );
}
