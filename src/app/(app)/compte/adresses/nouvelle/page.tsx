import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { MAX_ADDRESSES } from "@/lib/addresses/constants";
import { listMyAddresses } from "@/lib/addresses/server";
import { getCurrentProfile } from "@/lib/auth/user";
import { AddressForm } from "../address-form";

export const metadata: Metadata = { title: "Nouvelle adresse · RoadMates" };

export default function NewAddressPage() {
  return (
    <PageShell title="Nouvelle adresse">
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <NewAddress />
      </Suspense>
    </PageShell>
  );
}

async function NewAddress() {
  const profile = await getCurrentProfile();
  if ((await listMyAddresses(profile.id)).length >= MAX_ADDRESSES) redirect("/compte/adresses");
  return <AddressForm others={[]} />;
}
