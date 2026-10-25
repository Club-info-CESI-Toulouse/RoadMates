"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormMessage } from "@/components/form";
import type { AddressOption } from "@/lib/addresses/constants";
import { DEFAULT_SLOT_VALUES, DIRECTION_LABELS, type CommuteInput, type SlotValues } from "@/lib/commutes/schema";
import { MAX_WALK_MIN } from "@/lib/trips/constants";
import { createCommuteAction, type Schedule } from "./actions";
import { CommuteFields, defaultAddresses } from "./commute-fields";
import { DayChips, ScheduleFields } from "./schedule-fields";

const card = "flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm";
const RETURN_DEFAULT: SlotValues = { ...DEFAULT_SLOT_VALUES, anchor: "departure", time: "17:30" };

// A whole week for one habitual trip, on one screen.
export function NewCommuteForm({ addresses }: { addresses: AddressOption[] }) {
  const router = useRouter();
  const [commute, setCommute] = useState<CommuteInput>({
    role: "passenger",
    seats: null,
    maxWalkMin: MAX_WALK_MIN.default,
    ...defaultAddresses(addresses),
  });
  const [aller, setAller] = useState<SlotValues>(DEFAULT_SLOT_VALUES);
  const [allerDays, setAllerDays] = useState([1, 2, 3, 4, 5]);
  const [withReturn, setWithReturn] = useState(true);
  const [retour, setRetour] = useState<SlotValues>(RETURN_DEFAULT);
  const [retourDays, setRetourDays] = useState([1, 2, 3, 4, 5]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const schedules: Schedule[] = [];
    if (allerDays.length) schedules.push({ direction: "morning", days: allerDays, values: aller });
    if (withReturn && retourDays.length) schedules.push({ direction: "evening", days: retourDays, values: retour });
    if (schedules.length === 0) {
      setError("Choisis au moins un jour");
      return;
    }
    setError(undefined);
    setErrors({});
    startTransition(async () => {
      const result = await createCommuteAction(commute, schedules);
      if (result.ok) {
        router.push(result.id ? `/trajets/${result.id}` : "/trajets");
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <section className={card}>
        <h2 className="text-lg font-semibold">Trajet</h2>
        <CommuteFields value={commute} onChange={setCommute} addresses={addresses} errors={errors} />
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">{DIRECTION_LABELS.morning} · matin</h2>
        <ScheduleFields value={aller} onChange={setAller} errors={errors} />
        <DayChips value={allerDays} onChange={setAllerDays} />
      </section>

      <section className={card}>
        <label className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{DIRECTION_LABELS.evening} · soir</h2>
          <input type="checkbox" checked={withReturn} onChange={(e) => setWithReturn(e.target.checked)} className="size-5 accent-primary" />
        </label>
        {withReturn && (
          <>
            <ScheduleFields value={retour} onChange={setRetour} />
            <DayChips value={retourDays} onChange={setRetourDays} />
          </>
        )}
      </section>

      <p className="text-xs text-muted">
        Indique l&apos;heure qui compte pour toi : l&apos;autre est calculée avec la durée estimée du trajet (hors
        trafic, sans marge). Chaque jour reste modifiable ensuite.
      </p>
      <FormMessage error={error} />
      <button
        type="submit"
        disabled={pending || addresses.length < 2}
        className="rounded-full bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Patiente…" : "Enregistrer le trajet"}
      </button>
    </form>
  );
}
