"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { AddressPin } from "@/components/address-pin";
import { FormMessage } from "@/components/form";
import type { AddressOption } from "@/lib/addresses/constants";
import { DEFAULT_SLOT_VALUES, DIRECTION_LABELS, type CommuteInput, type SlotValues } from "@/lib/commutes/schema";
import type { CommuteView, SlotView } from "@/lib/commutes/server";
import { ROLE_LABELS, WEEKDAYS } from "@/lib/trips/labels";
import { formatDuration } from "@/lib/trips/times";
import {
  deleteCommuteAction,
  deleteSlotAction,
  saveCommuteAction,
  saveSlotsAction,
  toggleCommuteAction,
} from "./actions";
import { CommuteFields } from "./commute-fields";
import { DayChips, ScheduleFields } from "./schedule-fields";

type Direction = "morning" | "evening";
type Editing = { direction: Direction; slot: SlotView | null };

const card = "flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm";
const primary = "rounded-full bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60";
const secondary = "rounded-full border border-border bg-card px-4 py-2.5 font-semibold disabled:opacity-60";

export function CommuteDetail({ commute, addresses }: { commute: CommuteView; addresses: AddressOption[] }) {
  const router = useRouter();
  const [editingTrip, setEditingTrip] = useState(false);
  const [draft, setDraft] = useState<CommuteInput>(commute);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [pending, startTransition] = useTransition();

  function saveTrip() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveCommuteAction(draft, commute.id);
      if (result.ok) setEditingTrip(false);
      else {
        setErrors(result.fieldErrors ?? {});
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className={card}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              <AddressPin icon={commute.origin.icon} className="size-7" />
              {commute.origin.name}
              <span aria-label="aller-retour">⟷</span>
              <AddressPin icon={commute.destination.icon} className="size-7" />
              {commute.destination.name}
            </p>
            <p className="text-sm text-muted">
              {ROLE_LABELS[commute.role]}
              {commute.role === "driver"
                ? ` · ${commute.seats} place${commute.seats! > 1 ? "s" : ""}`
                : ` · marche max ${commute.maxWalkMin} min`}
              {!commute.isActive && " · en pause"}
            </p>
          </div>
          <button type="button" onClick={() => setEditingTrip((v) => !v)} className="shrink-0 text-sm font-medium underline">
            {editingTrip ? "Fermer" : "Modifier"}
          </button>
        </div>
        {editingTrip && (
          <>
            <CommuteFields value={draft} onChange={setDraft} addresses={addresses} errors={errors} />
            <FormMessage error={error} />
            <button type="button" disabled={pending} onClick={saveTrip} className={`${primary} self-start`}>
              Enregistrer
            </button>
          </>
        )}
      </section>

      {(["morning", "evening"] as const).map((direction) => {
        const slots = commute.slots.filter((s) => s.direction === direction);
        return (
          <section key={direction} className={card}>
            <h2 className="text-lg font-semibold">
              {DIRECTION_LABELS[direction]}
              <span className="ml-2 text-sm font-normal text-muted">
                {direction === "morning"
                  ? `${commute.origin.name} → ${commute.destination.name}`
                  : `${commute.destination.name} → ${commute.origin.name}`}
              </span>
            </h2>
            {slots.length === 0 ? (
              <p className="text-sm text-muted">Aucun horaire.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {slots.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setEditing({ direction, slot: s })}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left"
                    >
                      <span className="w-20 font-semibold">{WEEKDAYS[s.weekday - 1].long}</span>
                      <span className="flex-1 text-sm tabular-nums">
                        <span className={s.anchor === "departure" ? "font-semibold" : "text-muted"}>{s.departure}</span>
                        {" → "}
                        <span className={s.anchor === "arrival" ? "font-semibold" : "text-muted"}>{s.arrival ?? "--:--"}</span>
                        <span className="ml-2 text-xs text-muted">
                          −{s.flexBeforeMin}/+{s.flexAfterMin} min
                          {s.validFrom || s.validUntil ? " · période" : ""}
                        </span>
                      </span>
                      <span aria-hidden="true" className="text-muted">
                        ›
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {slots[0]?.durationMin && (
              <p className="text-xs text-muted">Durée estimée {formatDuration(slots[0].durationMin)}, hors trafic.</p>
            )}
            <button type="button" onClick={() => setEditing({ direction, slot: null })} className={`${secondary} self-start text-sm`}>
              + Ajouter des horaires
            </button>
          </section>
        );
      })}

      <div className="flex flex-wrap gap-4 text-sm">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => toggleCommuteAction(commute.id, !commute.isActive))}
          className="text-muted underline"
        >
          {commute.isActive ? "Mettre en pause" : "Réactiver"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Supprimer ce trajet et tous ses horaires ?")) return;
            startTransition(async () => {
              await deleteCommuteAction(commute.id);
              router.push("/trajets");
            });
          }}
          className="text-red-600 underline dark:text-red-400"
        >
          Supprimer le trajet
        </button>
      </div>

      {editing && (
        <SlotSheet
          key={`${editing.direction}:${editing.slot?.id ?? "new"}`}
          commuteId={commute.id}
          editing={editing}
          existing={commute.slots.filter((s) => s.direction === editing.direction)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/** Bottom sheet editing one day; the chips copy the values to other days. */
function SlotSheet({
  commuteId,
  editing,
  existing,
  onClose,
}: {
  commuteId: string;
  editing: Editing;
  existing: SlotView[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { slot, direction } = editing;
  const [values, setValues] = useState<SlotValues>(
    slot
      ? { anchor: slot.anchor, time: slot.time, flexBeforeMin: slot.flexBeforeMin, flexAfterMin: slot.flexAfterMin, validFrom: slot.validFrom, validUntil: slot.validUntil }
      : direction === "morning"
        ? DEFAULT_SLOT_VALUES
        : { ...DEFAULT_SLOT_VALUES, anchor: "departure", time: "17:30" },
  );
  const [days, setDays] = useState<number[]>(slot ? [slot.weekday] : []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const open = (node: HTMLDialogElement | null) => {
    dialog.current = node;
    if (node && !node.open) node.showModal();
  };

  function confirmSave() {
    const overwritten = existing.filter((s) => days.includes(s.weekday) && s.id !== slot?.id);
    if (
      overwritten.length &&
      !confirm(`Remplacer les horaires existants du ${overwritten.map((s) => WEEKDAYS[s.weekday - 1].long.toLowerCase()).join(", ")} ?`)
    )
      return;
    setError(undefined);
    startTransition(async () => {
      const result = await saveSlotsAction(commuteId, { direction, days, values });
      if (result.ok) onClose();
      else {
        setErrors(result.fieldErrors ?? {});
        setError(result.error);
      }
    });
  }

  return (
    <dialog
      ref={open}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current.close()}
      className="mx-auto mt-auto mb-0 w-full max-w-xl rounded-t-3xl bg-card p-0 text-foreground shadow-xl backdrop:bg-black/60 md:mb-auto md:rounded-3xl"
    >
      <div className="flex max-h-[90dvh] flex-col gap-5 overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto h-1 w-10 rounded-full bg-border md:hidden" aria-hidden="true" />
        <h2 className="text-lg font-bold">
          {DIRECTION_LABELS[direction]} · {slot ? WEEKDAYS[slot.weekday - 1].long : "nouveaux horaires"}
        </h2>
        <ScheduleFields value={values} onChange={setValues} errors={errors} />
        <DayChips value={days} onChange={setDays} label={slot ? "Appliquer aussi à ces jours" : "Jours"} />
        <FormMessage error={error} />
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => dialog.current?.close()} className={secondary}>
            Annuler
          </button>
          <button type="button" disabled={pending || days.length === 0} onClick={confirmSave} className={primary}>
            {pending ? "Patiente…" : "Valider"}
          </button>
        </div>
        {slot && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Supprimer l'horaire du ${WEEKDAYS[slot.weekday - 1].long.toLowerCase()} ?`)) return;
              startTransition(async () => {
                await deleteSlotAction(slot.id);
                onClose();
              });
            }}
            className="self-center text-sm text-red-600 underline dark:text-red-400"
          >
            Supprimer ce jour
          </button>
        )}
      </div>
    </dialog>
  );
}
