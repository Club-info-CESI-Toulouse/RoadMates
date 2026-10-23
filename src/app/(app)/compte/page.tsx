import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { InstallPrompt } from "@/components/install-prompt";
import { PageShell } from "@/components/page-shell";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getCurrentProfile } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { listClassNames } from "@/lib/classes/server";
import { ClassForm } from "./class-form";
import { DeleteAccountForm } from "./delete-account-form";
import { DisplayNameForm } from "./display-name-form";
import { NotificationSettings } from "./notification-settings";

export const metadata: Metadata = { title: "Compte · RoadMates" };

export default function AccountPage() {
  return (
    <PageShell title="Compte">
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <Stats />
        <Profile />
      </Suspense>
      <Link
        href="/compte/adresses"
        className="flex items-center justify-between rounded-3xl border border-border bg-card shadow-sm p-4 font-semibold"
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
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Notifications</h2>
        <Suspense fallback={<p className="text-sm text-muted">Chargement…</p>}>
          <Notifications />
        </Suspense>
      </section>
      <InstallPrompt />
      <Link href="/mentions-legales" className="text-sm underline">
        Mentions légales et données personnelles
      </Link>
      <form action={signOut}>
        <button type="submit" className="text-sm text-muted underline">
          Se déconnecter
        </button>
      </form>
      <DeleteAccountForm />
    </PageShell>
  );
}

async function Profile() {
  const [profile, classes] = await Promise.all([getCurrentProfile(), listClassNames()]);
  return (
    <section className="flex flex-col gap-4">
      <dl className="grid gap-1 text-sm">
        <dt className="text-muted">Email (jamais visible des autres)</dt>
        <dd>{profile.email}</dd>
      </dl>
      <DisplayNameForm key={profile.displayName} displayName={profile.displayName} />
      <ClassForm key={profile.groupName} className={profile.groupName} classes={classes} />
    </section>
  );
}

async function Stats() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_ride_stats");
  const stats = data?.[0] ?? { rides: 0, distance_m: 0, partners: 0 };
  const items = [
    { value: Math.round(Number(stats.distance_m) / 1000).toLocaleString("fr-FR"), label: "km en covoiturage" },
    { value: stats.rides, label: stats.rides > 1 ? "covoiturages" : "covoiturage" },
    { value: stats.partners, label: stats.partners > 1 ? "covoitureurs rencontrés" : "covoitureur rencontré" },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2">
      {items.map((s) => (
        <div key={s.label} className="flex flex-col-reverse rounded-2xl bg-surface p-3 text-center">
          <dt className="text-xs text-muted">{s.label}</dt>
          <dd className="text-2xl font-bold tabular-nums">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

async function Notifications() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("push_enabled, email_enabled").eq("id", profile.id).single();
  return <NotificationSettings pushEnabled={data?.push_enabled ?? true} emailEnabled={data?.email_enabled ?? true} />;
}
