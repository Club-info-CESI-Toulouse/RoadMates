import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Connexion · RoadMates" };

export default function SignInPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Connexion</h1>
      <SignInForm />
      <p className="text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-medium text-foreground underline">
          S&apos;inscrire
        </Link>
      </p>
    </>
  );
}
