"use client";

import Link from "next/link";
import { useTransition } from "react";
import { formatDate, formatWeekdays, ROLE_LABELS, SLOT_LABELS } from "@/lib/trips/labels";
import type { TripView } from "@/lib/trips/server";
import { formatDuration } from "@/lib/trips/times";
import { removeTrip, toggleTrip } from "./actions";

function Time({ value, estimated }: { value: string | null; estimated: boolean }) {
  if (!value) return <span className="text-muted">--:--</span>;
  return (
    <span className={estimated ? "text-muted" : "font-semibold"} title={estimated ? "Estimé" : undefined}>
      {value}
      {estimated && <span className="sr-only"> (estimé)</span>}
    </span>
  );
}

export function TripCard({ trip }: { trip: TripView }) {
  const [pending, startTransition] = useTransition();

  const period =
    trip.validFrom && trip.validFrom === trip.validUntil
      ? `Le ${formatDate(trip.validFrom)}`
      : [trip.validFrom && `Du ${formatDate(trip.validFrom)}`, trip.validUntil && `au ${formatDate(trip.validUntil)}`]
          .filter(Boolean)
          .join(" ");

  return (
    <li
      className={`flex flex-col gap-3 rounded-3xl border border-border bg-card shadow-sm p-4 ${trip.isActive ? "" : "opacity-60"}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-full bg-primary px-2.5 py-1 text-primary-foreground">
          {ROLE_LABELS[trip.role]}
          {trip.role === "driver" && ` · ${trip.seats} place${trip.seats! > 1 ? "s" : ""}`}
        </span>
        <span className="rounded-full bg-surface px-2.5 py-1">{SLOT_LABELS[trip.slot]}</span>
        {!trip.isActive && <span className="rounded-full bg-surface px-2.5 py-1">En pause</span>}
      </div>

      <div className="flex items-center gap-3 text-lg tabular-nums">
        <Time value={trip.shownDeparture} estimated={!trip.departureTime} />
        <span aria-hidden="true" className="text-muted">
          →
        </span>
        <Time value={trip.shownArrival} estimated={!trip.arrivalTime} />
        {trip.durationMin && (
          <span className="text-xs text-muted">{formatDuration(trip.durationMin)}</span>
        )}
      </div>

      <p className="text-sm">
        {trip.origin.name} → {trip.destination.name}
      </p>
      <p className="text-sm text-muted">
        {formatWeekdays(trip.weekdays)}
        {period && ` · ${period}`}
      </p>
      <p className="text-xs text-muted">
        Souplesse −{trip.flexBeforeMin} / +{trip.flexAfterMin} min
        {trip.role === "passenger" && ` · marche max ${trip.maxWalkMin} min`}
        {" · horaires estimés, hors trafic"}
      </p>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <Link href={`/trajets/${trip.id}`} className="font-medium underline">
          Modifier
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => toggleTrip(trip.id, !trip.isActive))}
          className="text-muted underline disabled:opacity-60"
        >
          {trip.isActive ? "Mettre en pause" : "Réactiver"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Supprimer ce trajet ?")) startTransition(() => removeTrip(trip.id));
          }}
          className="text-red-600 underline disabled:opacity-60 dark:text-red-400"
        >
          Supprimer
        </button>
      </div>
    </li>
  );
}
