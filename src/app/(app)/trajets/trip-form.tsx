"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { FormMessage } from "@/components/form";
import { ADDRESS_KINDS, ADDRESS_LABELS, type AddressKind } from "@/lib/addresses/constants";
import {
  DRIVER_SEATS,
  FLEX_AFTER_MIN,
  FLEX_BEFORE_MIN,
  MAX_WALK_MIN,
} from "@/lib/trips/constants";
import { ROLE_LABELS, SLOT_LABELS, WEEKDAYS } from "@/lib/trips/labels";
import type { Trip } from "@/lib/trips/schema";
import { saveTrip } from "./actions";

type Props = {
  tripId?: string;
  initial?: Trip;
  /** Address kinds the user has filled in (school counts when the campus is the default). */
  available: AddressKind[];
};

const DEFAULT_ROUTE = {
  morning: { originKind: "home", destinationKind: "school" },
  evening: { originKind: "school", destinationKind: "home" },
} as const;

const NEW_TRIP: Trip = {
  role: "passenger",
  seats: null,
  slot: "morning",
  ...DEFAULT_ROUTE.morning,
  weekdays: [1, 2, 3, 4, 5],
  departureTime: null,
  arrivalTime: null,
  flexBeforeMin: FLEX_BEFORE_MIN.default,
  flexAfterMin: FLEX_AFTER_MIN.default,
  maxWalkMin: MAX_WALK_MIN.default,
  validFrom: null,
  validUntil: null,
  isActive: true,
};

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
        {(Object.keys(options) as T[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={`rounded-md py-2 text-sm font-medium ${value === key ? "bg-primary text-primary-foreground" : "text-muted"}`}
          >
            {options[key]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Range({
  label,
  value,
  bounds,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  bounds: { min: number; max: number };
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      <span className="flex justify-between">
        {label}
        <span className="tabular-nums">{value} min</span>
      </span>
      <input
        type="range"
        min={bounds.min}
        max={bounds.max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-[var(--primary)]"
      />
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card shadow-sm p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const inputClass =
  "rounded-xl border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-foreground aria-invalid:border-red-500";

export function TripForm({ tripId, initial, available }: Props) {
  const router = useRouter();
  const [trip, setTrip] = useState<Trip>(initial ?? NEW_TRIP);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof Trip>(key: K, value: Trip[K]) =>
    setTrip((t) => ({ ...t, [key]: value }));

  function changeSlot(slot: Trip["slot"]) {
    setTrip((t) => {
      const wasDefault =
        t.originKind === DEFAULT_ROUTE[t.slot].originKind &&
        t.destinationKind === DEFAULT_ROUTE[t.slot].destinationKind;
      return { ...t, slot, ...(wasDefault ? DEFAULT_ROUTE[slot] : {}) };
    });
  }

  function toggleDay(day: number) {
    set(
      "weekdays",
      trip.weekdays.includes(day) ? trip.weekdays.filter((d) => d !== day) : [...trip.weekdays, day],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setErrors({});
    startTransition(async () => {
      const result = await saveTrip(trip, tripId);
      if (result.ok) {
        router.push("/trajets");
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setError(result.error);
    });
  }

  const fieldError = (key: string) =>
    errors[key] ? (
      <span className="text-xs font-normal text-red-600 dark:text-red-400">{errors[key]}</span>
    ) : null;

  const addressSelect = (key: "originKind" | "destinationKind", label: string) => (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <select
        value={trip[key]}
        onChange={(e) => set(key, e.target.value as AddressKind)}
        aria-invalid={!!errors[key]}
        className={inputClass}
      >
        {ADDRESS_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {ADDRESS_LABELS[kind]}
            {available.includes(kind) ? "" : " (à renseigner)"}
          </option>
        ))}
      </select>
      {fieldError(key)}
    </label>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Section title="Rôle et trajet">
        <Segmented
          label="Je suis"
          value={trip.role}
          options={ROLE_LABELS}
          onChange={(role) =>
            setTrip((t) => ({ ...t, role, seats: role === "driver" ? (t.seats ?? 3) : null }))
          }
        />
        {trip.role === "driver" && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Places proposées
            <input
              type="number"
              inputMode="numeric"
              min={DRIVER_SEATS.min}
              max={DRIVER_SEATS.max}
              value={trip.seats ?? ""}
              onChange={(e) => set("seats", e.target.value ? Number(e.target.value) : null)}
              aria-invalid={!!errors.seats}
              className={`${inputClass} w-24`}
            />
            {fieldError("seats")}
          </label>
        )}
        <Segmented label="Créneau" value={trip.slot} options={SLOT_LABELS} onChange={changeSlot} />
        <div className="grid grid-cols-2 gap-3">
          {addressSelect("originKind", "Départ")}
          {addressSelect("destinationKind", "Arrivée")}
        </div>
        {available.length < 2 && (
          <p className="text-xs text-muted">
            <Link href="/compte/adresses" className="underline">
              Renseigne tes adresses
            </Link>{" "}
            pour pouvoir enregistrer un trajet.
          </p>
        )}
      </Section>

      <Section title="Jours et horaires">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Jours</legend>
          <div className="flex gap-1.5">
            {WEEKDAYS.map((day) => {
              const on = trip.weekdays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={on}
                  aria-label={day.long}
                  onClick={() => toggleDay(day.value)}
                  className={`size-10 rounded-full text-sm font-semibold ${on ? "bg-primary text-primary-foreground" : "bg-surface text-muted"}`}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
          {fieldError("weekdays")}
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Heure de départ
            <input
              type="time"
              value={trip.departureTime ?? ""}
              onChange={(e) => set("departureTime", e.target.value || null)}
              aria-invalid={!!errors.departureTime}
              className={inputClass}
            />
            {fieldError("departureTime")}
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Heure d&apos;arrivée
            <input
              type="time"
              value={trip.arrivalTime ?? ""}
              onChange={(e) => set("arrivalTime", e.target.value || null)}
              aria-invalid={!!errors.arrivalTime}
              className={inputClass}
            />
          </label>
        </div>
        {errors.arrivalTime && (
          <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            {errors.arrivalTime}
          </p>
        )}
        <p className="text-xs text-muted">
          Indique l&apos;heure qui compte pour toi : l&apos;autre est calculée avec la durée estimée
          du trajet (hors trafic, sans marge).
        </p>
        <Range
          label="Souplesse avant"
          value={trip.flexBeforeMin}
          bounds={FLEX_BEFORE_MIN}
          onChange={(v) => set("flexBeforeMin", v)}
          hint="Combien de minutes plus tôt tu peux partir."
        />
        <Range
          label="Souplesse après"
          value={trip.flexAfterMin}
          bounds={FLEX_AFTER_MIN}
          onChange={(v) => set("flexAfterMin", v)}
          hint="Combien de minutes plus tard tu peux partir."
        />
        {trip.role === "passenger" && (
          <Range
            label="Marche maximum"
            value={trip.maxWalkMin}
            bounds={MAX_WALK_MIN}
            onChange={(v) => set("maxWalkMin", v)}
            hint="Jusqu'au point de rendez-vous proposé."
          />
        )}
      </Section>

      <Section title="Période (facultatif)">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Du
            <input
              type="date"
              value={trip.validFrom ?? ""}
              onChange={(e) => set("validFrom", e.target.value || null)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Au
            <input
              type="date"
              value={trip.validUntil ?? ""}
              onChange={(e) => set("validUntil", e.target.value || null)}
              aria-invalid={!!errors.validUntil}
              className={inputClass}
            />
            {fieldError("validUntil")}
          </label>
        </div>
        <p className="text-xs text-muted">
          Laisse vide pour un trajet sans fin. Même date deux fois = un seul jour.
        </p>
        {tripId && (
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={trip.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            Trajet actif (visible par les autres)
          </label>
        )}
      </Section>

      <FormMessage error={errors.arrivalTime ? undefined : error} />
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Calcul du trajet…" : "Enregistrer"}
        </button>
        <Link href="/trajets" className="text-sm text-muted underline">
          Annuler
        </Link>
      </div>
    </form>
  );
}
