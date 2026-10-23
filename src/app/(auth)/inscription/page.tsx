import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listClassNames } from "@/lib/classes/server";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Inscription · RoadMates" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Créer un compte</h1>
      <Suspense fallback={<SignUpForm classes={[]} />}>
        <SignUpWithClasses />
      </Suspense>
      <p className="text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-medium text-foreground underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}

async function SignUpWithClasses() {
  return <SignUpForm classes={await listClassNames()} />;
}
