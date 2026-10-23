import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { getCurrentProfile } from "@/lib/auth/user";
import { listMyTrips } from "@/lib/trips/server";
import { MyRequests } from "./my-requests";
import { TripCard } from "./trip-card";

export const metadata: Metadata = { title: "Mes trajets · RoadMates" };

export default function TripsPage() {
  return (
    <PageShell
      title="Mes trajets"
      action={
        <Link
          href="/trajets/nouveau"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
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
  const trips = await listMyTrips(profile.id);
  const requests = <MyRequests userId={profile.id} />;
  if (trips.length === 0)
    return (
      <p className="text-muted">
        Tu n&apos;as pas encore de trajet. Ajoute ceux que tu fais chaque semaine, matin et soir.
      </p>
    );
  return (
    <>
      {requests}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Trajets habituels</h2>
        <ul className="flex flex-col gap-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </ul>
      </section>
    </>
  );
}
