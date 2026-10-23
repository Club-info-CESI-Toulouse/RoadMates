"use client";

import { Field } from "@/components/form";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/schema";
import { resetPassword } from "../../actions";
import { CodeForm } from "../../code-form";

export function NewPasswordForm() {
  return (
    <CodeForm purpose="recovery" action={resetPassword} submitLabel="Changer le mot de passe">
      {(e) => (
        <>
          <Field
            label="Nouveau mot de passe"
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
        </>
      )}
    </CodeForm>
  );
}
