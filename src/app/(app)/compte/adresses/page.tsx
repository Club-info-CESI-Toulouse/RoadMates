import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AddressPin } from "@/components/address-pin";
import { PageShell } from "@/components/page-shell";
import { MAX_ADDRESSES } from "@/lib/addresses/constants";
import { listMyAddresses } from "@/lib/addresses/server";
import { getCurrentProfile } from "@/lib/auth/user";

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
      <p className="text-xs text-muted">
        Tes adresses sont chiffrées et ne sont jamais montrées aux autres : seuls les points de
        rendez-vous le sont.
      </p>
    </PageShell>
  );
}

async function Addresses() {
  const profile = await getCurrentProfile();
  const addresses = await listMyAddresses(profile.id);
  const full = addresses.length >= MAX_ADDRESSES;

  return (
    <>
      {addresses.length === 0 ? (
        <p className="text-muted">Aucune adresse. Ajoute au moins ton domicile et ton école.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {addresses.map((a) => (
            <li key={a.id}>
              <Link
                href={`/compte/adresses/${a.id}`}
                className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm"
              >
                <AddressPin icon={a.icon} />
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">
                    {a.name}
                    {!a.confirmed && (
                      <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        À confirmer
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-muted">{a.label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p className="text-sm text-muted">Maximum {MAX_ADDRESSES} adresses.</p>
      ) : (
        <Link
          href="/compte/adresses/nouvelle"
          className="self-start rounded-full bg-primary px-4 py-2.5 font-semibold text-primary-foreground"
        >
          + Ajouter une adresse
        </Link>
      )}
    </>
  );
}
