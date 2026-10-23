import type { Metadata } from "next";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Nouveau mot de passe · RoadMates" };

export default function NewPasswordPage() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Nouveau mot de passe</h1>
        <p className="text-sm text-muted">
          Si un compte existe pour cette adresse, un code à 6 chiffres vient d&apos;être envoyé. Il
          expire dans 10 minutes.
        </p>
      </div>
      <NewPasswordForm />
    </>
  );
}
