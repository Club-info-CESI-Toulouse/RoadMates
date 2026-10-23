import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { InstallPrompt } from "@/components/install-prompt";
import { PageShell } from "@/components/page-shell";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getCurrentProfile } from "@/lib/auth/user";
import { signOut } from "@/app/(auth)/actions";
import { DisplayNameForm } from "./display-name-form";

export const metadata: Metadata = { title: "Compte · RoadMates" };

export default function AccountPage() {
  return (
    <PageShell title="Compte">
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <Profile />
      </Suspense>
      <Link
        href="/compte/adresses"
        className="flex items-center justify-between rounded-xl border border-border p-4 font-semibold"
      >
        Mes adresses
        <span aria-hidden="true" className="text-muted">
          →
        </span>
      </Link>
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Thème</h2>
        <ThemeSwitcher />
      </section>
      <InstallPrompt />
      <form action={signOut}>
        <button type="submit" className="text-sm text-muted underline">
          Se déconnecter
        </button>
      </form>
    </PageShell>
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
