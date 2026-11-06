import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { FreshForm } from "@/components/fresh-form";
import { PageShell } from "@/components/page-shell";
import { listMyAddresses } from "@/lib/addresses/server";
import { getCurrentProfile } from "@/lib/auth/user";
import { AddressForm } from "../address-form";

export const metadata: Metadata = { title: "Modifier une adresse · RoadMates" };

export default function EditAddressPage({ params }: PageProps<"/compte/adresses/[id]">) {
  return (
    <PageShell title="Modifier une adresse">
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <EditAddress params={params} />
      </Suspense>
    </PageShell>
  );
}

async function EditAddress({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const profile = await getCurrentProfile();
  const addresses = await listMyAddresses(profile.id);
  const address = addresses.find((a) => a.id === id);
  if (!address) notFound();
  const others = addresses.filter((a) => a.id !== id).map(({ id, name, icon }) => ({ id, name, icon }));
  return (
    <FreshForm>
      <AddressForm address={address} others={others} />
    </FreshForm>
  );
}
