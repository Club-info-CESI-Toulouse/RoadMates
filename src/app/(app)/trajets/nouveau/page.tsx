import type { Metadata } from "next";
import { Suspense } from "react";
import { FreshForm } from "@/components/fresh-form";
import { PageShell } from "@/components/page-shell";
import { listMyAddressOptions } from "@/lib/addresses/server";
import { getCurrentProfile } from "@/lib/auth/user";
import { NewCommuteForm } from "../new-commute-form";

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
  const addresses = await listMyAddressOptions(profile.id);
  return (
    <FreshForm>
      <NewCommuteForm addresses={addresses} />
    </FreshForm>
  );
}
