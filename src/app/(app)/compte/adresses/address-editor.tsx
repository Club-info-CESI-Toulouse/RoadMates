"use client";

import { useState, useTransition } from "react";
import { FormMessage } from "@/components/form";
import { AddressSearch } from "@/components/map/address-search";
import { MapView } from "@/components/map/map-view";
import { ADDRESS_LABELS, type AddressKind } from "@/lib/addresses/constants";
import type { LatLon, Place } from "@/lib/geo/types";
import { resetAddress, saveAddress } from "./actions";

type Props = {
  kind: AddressKind;
  current: (Place & { isDefault: boolean }) | null;
};

// One address row: summary, then search + map editor when opened.
export function AddressEditor({ kind, current }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Place | null>(current);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  async function pick(point: LatLon) {
    setDraft({ ...point, label: "Point sur la carte" });
    try {
      const res = await fetch(`/api/geo/reverse?lat=${point.lat}&lon=${point.lon}`);
      const data: { place: Place | null } = await res.json();
      // Keep the exact pin; only borrow the nearest address label.
      if (data.place) setDraft({ ...point, label: data.place.label });
    } catch {}
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{ADDRESS_LABELS[kind]}</p>
          <p className="truncate text-sm text-muted">
            {current ? current.label : "Non renseignée"}
            {current?.isDefault && " (par défaut)"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft(current);
            setOpen((o) => !o);
          }}
          className="shrink-0 text-sm font-medium underline"
        >
          {open ? "Fermer" : current ? "Modifier" : "Ajouter"}
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-3">
          <AddressSearch onSelect={setDraft} near={draft ?? current} />
          <p className="text-xs text-muted">
            Ou touche la carte / déplace le repère pour ajuster le point exact.
          </p>
          <MapView marker={draft} onPick={pick} />
          {draft && <p className="text-sm">{draft.label}</p>}
          <FormMessage error={error} />
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={!draft || pending}
              onClick={() => draft && run(() => saveAddress(kind, draft))}
              className="rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {pending ? "Patiente…" : "Enregistrer"}
            </button>
            {kind === "school" && current && !current.isDefault && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => resetAddress(kind))}
                className="text-sm text-muted underline"
              >
                Revenir au campus par défaut
              </button>
            )}
          </div>
          <p className="text-xs text-muted">
            Ton adresse est chiffrée et n&apos;est jamais montrée aux autres : seul le point de
            rendez-vous l&apos;est.
          </p>
        </div>
      )}
    </li>
  );
}
