import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getCurrentProfile } from "@/lib/auth/user";
import { signOut } from "../(auth)/actions";
import { DisplayNameForm } from "./display-name-form";

export const metadata: Metadata = { title: "Compte · RoadMates" };

export default function AccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-8">
      <h1 className="text-2xl font-bold">Compte</h1>
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <Profile />
      </Suspense>
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Thème</h2>
        <ThemeSwitcher />
      </section>
      <form action={signOut}>
        <button type="submit" className="text-sm text-muted underline">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}

async function Profile() {
  const profile = await getCurrentProfile();
  return (
    <section className="flex flex-col gap-4">
      <dl className="grid gap-1 text-sm">
        <dt className="text-muted">Email (jamais visible des autres)</dt>
        <dd>{profile.email}</dd>
        <dt className="mt-2 text-muted">Classe</dt>
        <dd>{profile.groupName ?? "Aucune"}</dd>
      </dl>
      <DisplayNameForm key={profile.displayName} displayName={profile.displayName} />
    </section>
  );
}
