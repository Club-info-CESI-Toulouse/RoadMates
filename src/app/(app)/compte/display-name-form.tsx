"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/auth/schema";
import type { FormState } from "@/app/(auth)/actions";
import { updateDisplayName } from "./actions";

const initialState: FormState = {};

export function DisplayNameForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, initialState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field
        label="Pseudo ou prénom (visible des autres)"
        name="displayName"
        defaultValue={displayName}
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        required
        error={state.fieldErrors?.displayName}
      />
      <FormMessage error={state.error} message={state.message} />
      <SubmitButton pending={pending}>Enregistrer</SubmitButton>
    </form>
  );
}
