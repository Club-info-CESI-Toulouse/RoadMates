"use client";

import type { SlotValues } from "@/lib/commutes/schema";
import { FLEX_AFTER_MIN, FLEX_BEFORE_MIN } from "@/lib/trips/constants";
import { WEEKDAYS } from "@/lib/trips/labels";
import { fromMinutes, toMinutes } from "@/lib/trips/times";

export const inputClass =
  "rounded-xl border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-foreground aria-invalid:border-red-500";

const WORKDAYS = [1, 2, 3, 4, 5];

/** Anchor time (departure or arrival) and its flexibility window. */
export function ScheduleFields({
  value,
  onChange,
  errors = {},
}: {
  value: SlotValues;
  onChange: (v: SlotValues) => void;
  errors?: Record<string, string>;
}) {
  const set = <K extends keyof SlotValues>(key: K, v: SlotValues[K]) => onChange({ ...value, [key]: v });
  const t = toMinutes(value.time);
  const clamp = (m: number) => fromMinutes(Math.min(23 * 60 + 59, Math.max(0, m)));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1" role="radiogroup" aria-label="Heure fixée">
        {(["departure", "arrival"] as const).map((anchor) => (
          <button
            key={anchor}
            type="button"
            role="radio"
            aria-checked={value.anchor === anchor}
            onClick={() => set("anchor", anchor)}
            className={`rounded-lg py-2 text-sm font-semibold ${value.anchor === anchor ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {anchor === "departure" ? "Heure de départ" : "Heure d'arrivée"}
          </button>
        ))}
      </div>

      <label className="flex flex-col items-center gap-1 text-sm font-medium">
        <span className="sr-only">{value.anchor === "departure" ? "Heure de départ" : "Heure d'arrivée"}</span>
        <input
          type="time"
          required
          value={value.time}
          onChange={(e) => e.target.value && set("time", e.target.value)}
          aria-invalid={!!errors.time}
          className={`${inputClass} text-center text-3xl font-semibold tabular-nums`}
        />
        {errors.time && <span className="text-xs font-normal text-red-600 dark:text-red-400">{errors.time}</span>}
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-sm">
          Créneau accepté :{" "}
          <strong className="tabular-nums">
            {clamp(t - value.flexBeforeMin)} – {clamp(t + value.flexAfterMin)}
          </strong>
        </p>
        <div className="flex items-center" aria-label="Souplesse">
          <input
            type="range"
            dir="rtl"
            min={FLEX_BEFORE_MIN.min}
            max={FLEX_BEFORE_MIN.max}
            step={5}
            value={value.flexBeforeMin}
            onChange={(e) => set("flexBeforeMin", Number(e.target.value))}
            aria-label={`Souplesse avant : ${value.flexBeforeMin} min`}
            className="w-1/2 accent-primary"
          />
          <span className="mx-0.5 h-5 w-0.5 shrink-0 rounded bg-foreground" aria-hidden="true" />
          <input
            type="range"
            min={FLEX_AFTER_MIN.min}
            max={FLEX_AFTER_MIN.max}
            step={5}
            value={value.flexAfterMin}
            onChange={(e) => set("flexAfterMin", Number(e.target.value))}
            aria-label={`Souplesse après : ${value.flexAfterMin} min`}
            className="w-1/2 accent-primary"
          />
        </div>
        <div className="flex justify-between text-xs text-muted">
          <span>{value.flexBeforeMin} min avant</span>
          <span>{value.flexAfterMin} min après</span>
        </div>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">Période (facultatif)</summary>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            Du
            <input type="date" value={value.validFrom ?? ""} onChange={(e) => set("validFrom", e.target.value || null)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            Au
            <input
              type="date"
              value={value.validUntil ?? ""}
              onChange={(e) => set("validUntil", e.target.value || null)}
              aria-invalid={!!errors.validUntil}
              className={inputClass}
            />
          </label>
        </div>
        {errors.validUntil && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.validUntil}</p>}
      </details>
    </div>
  );
}

/** L M M J V S D chips with a Mon–Fri shortcut. */
export function DayChips({
  value,
  onChange,
  label = "Jours",
}: {
  value: number[];
  onChange: (days: number[]) => void;
  label?: string;
}) {
  const toggle = (day: number) => onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort());
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((day) => {
          const on = value.includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              aria-pressed={on}
              aria-label={day.long}
              onClick={() => toggle(day.value)}
              className={`size-10 rounded-full text-sm font-semibold ${on ? "bg-primary text-primary-foreground" : "bg-surface text-muted"}`}
            >
              {day.short}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange(WORKDAYS)}
          className="rounded-full border border-border bg-card px-3 text-sm font-medium"
        >
          Lun–Ven
        </button>
      </div>
    </fieldset>
  );
}
