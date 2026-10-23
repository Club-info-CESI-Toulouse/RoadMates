"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage } from "@/components/form";
import type { FormState } from "@/app/(auth)/actions";
import { deleteAccount } from "./actions";

const initialState: FormState = {};

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, initialState);

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-sm text-red-600 underline dark:text-red-400">
        Supprimer mon compte
      </button>
    );

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-red-500 p-4 text-sm">
      <p>
        Ton compte, tes adresses, trajets, demandes et messages seront supprimés définitivement. Tes
        covoiturages à venir seront annulés et tes covoitureurs prévenus.
      </p>
      <Field label="Tape SUPPRIMER pour confirmer" name="confirm" autoComplete="off" required error={state.fieldErrors?.confirm} />
      <FormMessage error={state.error} />
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60">
          {pending ? "Suppression…" : "Supprimer définitivement"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-muted underline">
          Annuler
        </button>
      </div>
    </form>
  );
}
