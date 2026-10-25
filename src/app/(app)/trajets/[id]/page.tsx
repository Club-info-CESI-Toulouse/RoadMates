import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PageShell } from "@/components/page-shell";
import { listMyAddressOptions } from "@/lib/addresses/server";
import { getCurrentProfile } from "@/lib/auth/user";
import { getMyCommute } from "@/lib/commutes/server";
import { CommuteDetail } from "../commute-detail";

export const metadata: Metadata = { title: "Mon trajet · RoadMates" };

export default function CommutePage({ params }: PageProps<"/trajets/[id]">) {
  return (
    <PageShell
      title="Mon trajet"
      action={
        <Link href="/trajets" className="text-sm text-muted underline">
          Retour
        </Link>
      }
    >
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <Commute params={params} />
      </Suspense>
    </PageShell>
  );
}

async function Commute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const profile = await getCurrentProfile();
  const [commute, addresses] = await Promise.all([getMyCommute(profile.id, id), listMyAddressOptions(profile.id)]);
  if (!commute) notFound();
  return <CommuteDetail commute={commute} addresses={addresses} />;
}
