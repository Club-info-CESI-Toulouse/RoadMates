import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { getCurrentProfile } from "@/lib/auth/user";
import { formatClock, formatDayLabel, localDate } from "@/lib/dates";
import { notificationText, type NotificationPayload } from "@/lib/notifications/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications · RoadMates" };

export default function NotificationsPage() {
  return (
    <PageShell title="Notifications">
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <Notifications />
      </Suspense>
    </PageShell>
  );
}

async function Notifications() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  await supabase.rpc("expire_trip_requests");
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, payload, read_at, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const items = data ?? [];
  if (items.some((n) => !n.read_at))
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", profile.id).is("read_at", null);

  if (items.length === 0) return <p className="text-muted">Aucune notification pour l&apos;instant.</p>;
  return (
    <>
      <ul className="flex flex-col gap-2">
        {items.map((n) => (
          <li key={n.id} className={`rounded-xl border border-border p-4 text-sm ${n.read_at ? "" : "border-foreground"}`}>
            <p>{notificationText(n.kind, n.payload as NotificationPayload)}</p>
            <p className="mt-1 text-xs text-muted">
              {localDate(new Date(n.created_at)) === localDate() ? "Aujourd'hui" : formatDayLabel(localDate(new Date(n.created_at)))} à{" "}
              {formatClock(n.created_at)}
            </p>
          </li>
        ))}
      </ul>
      <Link href="/trajets" className="text-sm underline">
        Voir mes demandes et covoiturages
      </Link>
    </>
  );
}
