import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Mot de passe oublié · RoadMates" };

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Mot de passe oublié</h1>
        <p className="text-sm text-muted">Tu vas recevoir un code pour en choisir un nouveau.</p>
      </div>
      <ForgotForm />
      <Link href="/connexion" className="text-center text-sm text-muted underline">
        Retour à la connexion
      </Link>
    </>
  );
}
