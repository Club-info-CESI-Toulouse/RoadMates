import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { getCurrentProfile } from "@/lib/auth/user";
import { AddressPin } from "@/components/address-pin";
import { DIRECTION_LABELS } from "@/lib/commutes/schema";
import { listMyCommutes, type CommuteView } from "@/lib/commutes/server";
import { ROLE_LABELS, WEEKDAYS } from "@/lib/trips/labels";
import { listMyRequests } from "@/lib/requests/server";
import { MyRequests, RequestHistory } from "./my-requests";

export const metadata: Metadata = { title: "Mes trajets · RoadMates" };

export default function TripsPage() {
  return (
    <PageShell
      title="Mes trajets"
      action={
        <Link
          href="/trajets/nouveau"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          + Nouveau
        </Link>
      }
    >
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <Trips />
      </Suspense>
    </PageShell>
  );
}

async function Trips() {
  const profile = await getCurrentProfile();
  const trips = await listMyCommutes(profile.id);
  const { upcoming, history } = await listMyRequests(profile.id);
  return (
    <>
      <MyRequests requests={upcoming} />
      {trips.length === 0 ? (
        <p className="text-muted">
          Tu n&apos;as pas encore de trajet. Ajoute ceux que tu fais chaque semaine, matin et soir.
        </p>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Trajets habituels</h2>
          <ul className="flex flex-col gap-3">
            {trips.map((commute) => (
              <CommuteCard key={commute.id} commute={commute} />
            ))}
          </ul>
        </section>
      )}
      <RequestHistory requests={history} />
    </>
  );
}

function weekSummary(commute: CommuteView, direction: "morning" | "evening") {
  const slots = commute.slots.filter((s) => s.direction === direction);
  if (slots.length === 0) return "aucun horaire";
  const days = slots.map((s) => WEEKDAYS[s.weekday - 1].long.slice(0, 3) + ".").join(" ");
  const times = [...new Set(slots.map((s) => s.time))];
  const anchor = slots[0].anchor === "departure" ? "départ" : "arrivée";
  return `${days} (${times.length === 1 ? `${anchor} ${times[0]}` : "horaires variés"})`;
}

function CommuteCard({ commute }: { commute: CommuteView }) {
  return (
    <li>
      <Link
        href={`/trajets/${commute.id}`}
        className={`flex flex-col gap-2 rounded-3xl border border-border bg-card p-5 shadow-sm ${commute.isActive ? "" : "opacity-60"}`}
      >
        <span className="flex flex-wrap items-center gap-2 font-semibold">
          <AddressPin icon={commute.origin.icon} className="size-6" />
          {commute.origin.name} ⟷
          <AddressPin icon={commute.destination.icon} className="size-6" />
          {commute.destination.name}
        </span>
        <span className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-primary px-2.5 py-1 text-primary-foreground">
            {ROLE_LABELS[commute.role]}
            {commute.role === "driver" && ` · ${commute.seats} place${commute.seats! > 1 ? "s" : ""}`}
          </span>
          {!commute.isActive && <span className="rounded-full bg-surface px-2.5 py-1">En pause</span>}
        </span>
        {(["morning", "evening"] as const).map((d) => (
          <span key={d} className="text-sm">
            <span className="font-medium">{DIRECTION_LABELS[d]}</span>
            <span className="text-muted"> · {weekSummary(commute, d)}</span>
          </span>
        ))}
      </Link>
    </li>
  );
}
