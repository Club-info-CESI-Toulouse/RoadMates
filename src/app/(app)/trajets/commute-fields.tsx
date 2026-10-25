"use client";

import Link from "next/link";
import type { AddressOption } from "@/lib/addresses/constants";
import type { CommuteInput } from "@/lib/commutes/schema";
import { DRIVER_SEATS, MAX_WALK_MIN } from "@/lib/trips/constants";
import { ROLE_LABELS } from "@/lib/trips/labels";
import { inputClass } from "./schedule-fields";

/** Morning default: first "home" address → first "star" (school) address. */
export function defaultAddresses(addresses: AddressOption[]) {
  const home = addresses.find((a) => a.icon === "home") ?? addresses[0];
  const school = addresses.find((a) => a.icon === "star" && a !== home) ?? addresses.find((a) => a !== home);
  return { originAddressId: home?.id ?? "", destinationAddressId: school?.id ?? "" };
}

export function CommuteFields({
  value,
  onChange,
  addresses,
  errors = {},
}: {
  value: CommuteInput;
  onChange: (v: CommuteInput) => void;
  addresses: AddressOption[];
  errors?: Record<string, string>;
}) {
  const set = <K extends keyof CommuteInput>(key: K, v: CommuteInput[K]) => onChange({ ...value, [key]: v });
  const error = (key: string) =>
    errors[key] ? <span className="text-xs font-normal text-red-600 dark:text-red-400">{errors[key]}</span> : null;

  const select = (key: "originAddressId" | "destinationAddressId", label: string) => (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <select value={value[key]} onChange={(e) => set(key, e.target.value)} aria-invalid={!!errors[key]} className={inputClass}>
        {!value[key] && <option value="">Choisir…</option>}
        {addresses.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {error(key)}
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {select("originAddressId", "Départ (aller)")}
        {select("destinationAddressId", "Arrivée (aller)")}
      </div>
      <p className="-mt-2 text-xs text-muted">Le retour fait le chemin inverse.</p>
      {addresses.length < 2 && (
        <p className="text-xs text-muted">
          <Link href="/compte/adresses/nouvelle" className="underline">
            Ajoute au moins deux adresses
          </Link>{" "}
          pour créer un trajet.
        </p>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1" role="radiogroup" aria-label="Je suis">
        {(["passenger", "driver"] as const).map((role) => (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={value.role === role}
            onClick={() => onChange({ ...value, role, seats: role === "driver" ? (value.seats ?? 3) : null })}
            className={`rounded-lg py-2 text-sm font-semibold ${value.role === role ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>

      {value.role === "driver" ? (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Places proposées
          <input
            type="number"
            inputMode="numeric"
            min={DRIVER_SEATS.min}
            max={DRIVER_SEATS.max}
            value={value.seats ?? ""}
            onChange={(e) => set("seats", e.target.value ? Number(e.target.value) : null)}
            aria-invalid={!!errors.seats}
            className={`${inputClass} w-24`}
          />
          {error("seats")}
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm font-medium">
          <span className="flex justify-between">
            Marche maximum jusqu&apos;au rendez-vous
            <span>{value.maxWalkMin ?? MAX_WALK_MIN.default} min</span>
          </span>
          <input
            type="range"
            min={MAX_WALK_MIN.min}
            max={MAX_WALK_MIN.max}
            value={value.maxWalkMin ?? MAX_WALK_MIN.default}
            onChange={(e) => set("maxWalkMin", Number(e.target.value))}
            className="accent-primary"
          />
        </label>
      )}
    </div>
  );
}
