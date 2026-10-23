import type { Metadata } from "next";
import { verifySignUp } from "../actions";
import { CodeForm } from "../code-form";

export const metadata: Metadata = { title: "Validation · RoadMates" };

export default function VerificationPage() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Valide ton compte</h1>
        <p className="text-sm text-muted">
          Un code à 6 chiffres vient d&apos;être envoyé à ton adresse de l&apos;école. Il expire
          dans 10 minutes.
        </p>
      </div>
      <CodeForm purpose="signup" action={verifySignUp} submitLabel="Valider" />
    </>
  );
}
