import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PageShell } from "@/components/page-shell";
import { getCurrentProfile } from "@/lib/auth/user";
import { addDays, formatDayLabel, localDate } from "@/lib/dates";
import { getProposalDetail } from "@/lib/matching/detail";
import { SLOT_LABELS } from "@/lib/trips/labels";
import { ProposalDetailView } from "./proposal-detail";

export const metadata: Metadata = { title: "Proposition · RoadMates" };

export default function ProposalPage(props: PageProps<"/proposition/[myTripId]/[otherTripId]">) {
  return (
    <Suspense
      fallback={
        <PageShell title="Proposition">
          <p className="text-muted">Calcul du trajet…</p>
        </PageShell>
      }
    >
      <Proposal {...props} />
    </Suspense>
  );
}

function dayName(date: string) {
  const today = localDate();
  if (date === today) return "Aujourd'hui";
  if (date === addDays(today, 1)) return "Demain";
  return formatDayLabel(date);
}

async function Proposal({ params, searchParams }: PageProps<"/proposition/[myTripId]/[otherTripId]">) {
  const { myTripId, otherTripId } = await params;
  const date = z.iso.date().safeParse((await searchParams).date);
  if (!z.uuid().safeParse(myTripId).success || !z.uuid().safeParse(otherTripId).success || !date.success) notFound();
  const profile = await getCurrentProfile();
  const detail = await getProposalDetail(profile.id, myTripId, otherTripId, date.data);
  const back = `/?date=${date.data}`;

  if (!detail)
    return (
      <PageShell title="Proposition">
        <p className="text-muted">Ce covoiturage n&apos;est plus compatible ce jour-là.</p>
        <Link href={back} className="underline">
          Retour à l&apos;accueil
        </Link>
      </PageShell>
    );

  return (
    <PageShell
      title={`${detail.myRoute.from} → ${detail.myRoute.to}`}
      action={
        <Link href={back} className="text-sm text-muted underline">
          Retour
        </Link>
      }
    >
      <p className="-mt-4 font-semibold">
        {dayName(detail.date)} · {SLOT_LABELS[detail.slot].toLowerCase()}
      </p>
      <ProposalDetailView detail={detail} />
    </PageShell>
  );
}
