import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { ADDRESS_KINDS } from "@/lib/addresses/constants";
import { getMyAddresses } from "@/lib/addresses/server";
import { getCurrentProfile } from "@/lib/auth/user";
import { AddressEditor } from "./address-editor";

export const metadata: Metadata = { title: "Mes adresses · RoadMates" };

export default function AddressesPage() {
  return (
    <PageShell
      title="Mes adresses"
      action={
        <Link href="/compte" className="text-sm text-muted underline">
          Retour
        </Link>
      }
    >
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <Addresses />
      </Suspense>
    </PageShell>
  );
}

async function Addresses() {
  const profile = await getCurrentProfile();
  const addresses = await getMyAddresses(profile.id);
  return (
    <ul className="flex flex-col gap-3">
      {ADDRESS_KINDS.map((kind) => (
        <AddressEditor
          key={`${kind}:${addresses[kind]?.label ?? ""}`}
          kind={kind}
          current={addresses[kind] ?? null}
        />
      ))}
    </ul>
  );
}
