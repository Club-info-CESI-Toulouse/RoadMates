import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PageShell } from "@/components/page-shell";
import { getCurrentProfile } from "@/lib/auth/user";
import { DIRECTION_LABELS } from "@/lib/commutes/schema";
import { getMyRouteGeometries } from "@/lib/commutes/server";
import { RoutePicker } from "./route-picker";

export const metadata: Metadata = { title: "Itinéraire · RoadMates" };

const DIRECTIONS = { aller: "morning", retour: "evening" } as const;

export default function RoutePage({ params }: PageProps<"/trajets/[id]/itineraire/[direction]">) {
  return (
    <Suspense
      fallback={
        <PageShell title="Itinéraire">
          <p className="text-muted">Chargement…</p>
        </PageShell>
      }
    >
      <Route params={params} />
    </Suspense>
  );
}

async function Route({ params }: { params: Promise<{ id: string; direction: string }> }) {
  const { id, direction: slug } = await params;
  const direction = DIRECTIONS[slug as keyof typeof DIRECTIONS];
  if (!direction || !z.uuid().safeParse(id).success) notFound();
  const profile = await getCurrentProfile();
  const data = await getMyRouteGeometries(profile.id, id, direction);
  if (!data || data.commute.role !== "driver") notFound();

  return (
    <PageShell
      title={`Itinéraire ${DIRECTION_LABELS[direction].toLowerCase()}`}
      action={
        <Link href={`/trajets/${id}`} className="text-sm text-muted underline">
          Retour
        </Link>
      }
    >
      <RoutePicker
        commuteId={id}
        direction={direction}
        lines={data.geometries}
        options={data.commute.routes[direction]}
        initial={data.commute.routeChoice[direction]}
      />
    </PageShell>
  );
}
