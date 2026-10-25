import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { InstallPrompt } from "@/components/install-prompt";
import { NotificationBell } from "@/components/notification-bell";
import { PageShell } from "@/components/page-shell";
import { getCurrentProfile } from "@/lib/auth/user";
import { addDays, isoWeekday, localDate, weekdayShort } from "@/lib/dates";
import { getProposals, type TripSection } from "@/lib/matching/server";
import { SLOT_LABELS } from "@/lib/trips/labels";
import { fromMinutes } from "@/lib/trips/times";
import { HelpDialog } from "./help-dialog";
import { ProposalCard } from "./proposal-card";

const DAYS_SHOWN = 14;
const SLOT_TITLES = {
  morning: `${SLOT_LABELS.morning} · aller`,
  evening: `${SLOT_LABELS.evening} · retour`,
} as const;

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <PageShell
      title="Accueil"
      action={
        <div className="flex items-center gap-2">
          <NotificationBell />
          <HelpDialog />
        </div>
      }
    >
      <InstallPrompt dismissible />
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <Home searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function Home({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const requested = (await searchParams).date;
  const today = localDate();
  const parsed = z.iso.date().safeParse(requested);
  const last = addDays(today, DAYS_SHOWN - 1);
  const date = parsed.success && parsed.data >= today && parsed.data <= last ? parsed.data : today;

  return (
    <>
      <DayStrip today={today} selected={date} />
      <Suspense key={date} fallback={<p className="text-muted">Recherche des covoiturages compatibles…</p>}>
        <Proposals date={date} />
      </Suspense>
    </>
  );
}

function DayStrip({ today, selected }: { today: string; selected: string }) {
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i));
  return (
    <nav aria-label="Jours" className="-mx-4 overflow-x-auto px-4 md:-mx-0 md:px-0">
      <ul className="flex gap-1">
        {days.map((day) => {
          const active = day === selected;
          const weekend = isoWeekday(day) >= 6;
          return (
            <li key={day}>
              <Link
                href={day === today ? "/" : `/?date=${day}`}
                aria-current={active ? "date" : undefined}
                scroll={false}
                className={`flex w-14 flex-col items-center rounded-2xl py-2 text-sm ${
                  active ? "bg-primary font-bold text-primary-foreground" : weekend ? "text-muted" : ""
                }`}
              >
                <span>{day === today ? "auj." : weekdayShort(day)}</span>
                <span className="text-lg tabular-nums">{Number(day.slice(8))}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

async function Proposals({ date }: { date: string }) {
  const profile = await getCurrentProfile();
  const sections = await getProposals(profile.id, date);

  if (sections.length === 0)
    return (
      <p className="text-muted">
        Aucun de tes trajets ne circule ce jour-là.{" "}
        <Link href="/trajets/nouveau" className="font-medium text-foreground underline">
          Ajouter un trajet
        </Link>
      </p>
    );

  return (["morning", "evening"] as const).map((slot) => {
    const inSlot = sections.filter((s) => s.trip.slot === slot);
    if (inSlot.length === 0) return null;
    return (
      <section key={slot} className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">{SLOT_TITLES[slot]}</h2>
        {inSlot.map((section) => (
          <Section key={section.trip.id} section={section} date={date} />
        ))}
      </section>
    );
  });
}

function Section({ section, date }: { section: TripSection; date: string }) {
  const { trip, proposals } = section;
  const iAmDriver = trip.role === "driver";
  const accepted = proposals.filter((p) => p.request?.status === "accepted");
  // A passenger with a ride only sees that ride; a full driver keeps their open requests.
  const shown = !iAmDriver && accepted.length > 0 ? accepted : proposals;
  const sendBlocked = !iAmDriver
    ? accepted.length > 0
      ? "Tu as déjà un covoiturage sur ce créneau"
      : undefined
    : section.seatsLeft === 0
      ? "Ton trajet est complet"
      : undefined;

  const times = [
    trip.departureMin !== null && `Départ ${fromMinutes(trip.departureMin)}`,
    trip.arrivalMin !== null && `Arrivée ${fromMinutes(trip.arrivalMin)}`,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-3xl bg-card p-5 shadow-sm">
        <p className="font-semibold">
          {trip.originName} → {trip.destinationName}
        </p>
        <p className="text-sm text-muted">
          {iAmDriver ? "Conducteur" : "Passager"} · {times.join(" · ")} (−{trip.flexBeforeMin}/+{trip.flexAfterMin} min)
          {iAmDriver && section.seatsLeft !== null && ` · ${section.seatsLeft} place${section.seatsLeft > 1 ? "s" : ""} libre${section.seatsLeft > 1 ? "s" : ""}`}
        </p>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun {iAmDriver ? "passager" : "conducteur"} compatible pour l&apos;instant.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((p) => (
            <ProposalCard
              key={p.other.tripId}
              proposal={p}
              iAmDriver={iAmDriver}
              myTripId={trip.id}
              date={date}
              sendBlocked={sendBlocked}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
