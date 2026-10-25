import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PageShell } from "@/components/page-shell";
import { getCurrentProfile } from "@/lib/auth/user";
import { getMyTrip } from "@/lib/trips/server";
import { addressOptions } from "../address-options";
import { TripForm } from "../trip-form";

export const metadata: Metadata = { title: "Modifier le trajet · RoadMates" };

export default function EditTripPage({ params }: PageProps<"/trajets/[id]">) {
  return (
    <PageShell title="Modifier le trajet">
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <EditTrip params={params} />
      </Suspense>
    </PageShell>
  );
}

async function EditTrip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const profile = await getCurrentProfile();
  const [trip, available] = await Promise.all([getMyTrip(profile.id, id), addressOptions(profile.id)]);
  if (!trip) notFound();

  return <TripForm tripId={trip.id} initial={trip} addresses={available} />;
}
