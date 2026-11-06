"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, SubmitButton } from "@/components/form";
import type { FormState } from "@/app/(auth)/actions";
import { updateClass } from "./actions";

const initialState: FormState = {};

export function ClassForm({ className, classes }: { className: string | null; classes: string[] }) {
  const [state, action, pending] = useActionState(updateClass, initialState);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const next = new FormData(e.currentTarget).get("className");
        if (next !== className && !confirm("Changer de classe ? Tes demandes en attente seront annulées et tu verras les trajets de ta nouvelle classe."))
          e.preventDefault();
      }}
      className="flex flex-col gap-3"
    >
      <SelectField
        label="Classe"
        name="className"
        defaultValue={className ?? ""}
        options={classes}
        placeholder={className ? undefined : "Choisis ta classe"}
        required
        error={state.fieldErrors?.className}
      />
      <FormMessage error={state.error} message={state.message} />
      <SubmitButton pending={pending}>Changer de classe</SubmitButton>
    </form>
  );
}
