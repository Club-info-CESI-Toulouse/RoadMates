import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { getCurrentProfile } from "@/lib/auth/user";
import { availableKinds } from "../available-kinds";
import { TripForm } from "../trip-form";

export const metadata: Metadata = { title: "Nouveau trajet · RoadMates" };

export default function NewTripPage() {
  return (
    <PageShell title="Nouveau trajet">
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <NewTrip />
      </Suspense>
    </PageShell>
  );
}

async function NewTrip() {
  const profile = await getCurrentProfile();
  return <TripForm available={await availableKinds(profile.id)} />;
}
