"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AddressPin } from "@/components/address-pin";
import { Field, FormMessage } from "@/components/form";
import { AddressSearch } from "@/components/map/address-search";
import { PointsMap } from "@/components/map/points-map";
import {
  ADDRESS_ICON_LABELS,
  ADDRESS_ICONS,
  ADDRESS_NAME_MAX_LENGTH,
  type AddressIcon,
  type AddressOption,
} from "@/lib/addresses/constants";
import type { Place } from "@/lib/geo/types";
import { deleteAddressAction, saveAddressAction, type AddressActionResult } from "./actions";

type Props = {
  address?: Place & { id: string; name: string; icon: AddressIcon; confirmed: boolean };
  /** The user's other addresses, to reassign trips on deletion. */
  others: AddressOption[];
};

const secondary = "rounded-full border border-border bg-card px-4 py-2.5 font-semibold disabled:opacity-60";
const primary = "rounded-full bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60";

export function AddressForm({ address, others }: Props) {
  const router = useRouter();
  const [place, setPlace] = useState<Place | null>(address ?? null);
  const [name, setName] = useState(address?.name ?? "");
  const [icon, setIcon] = useState<AddressIcon>(address?.icon ?? "home");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [usedBy, setUsedBy] = useState(0);
  const [reassignTo, setReassignTo] = useState(others[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  function handle(action: () => Promise<AddressActionResult>) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        router.push("/compte/adresses");
        return;
      }
      if (result.trips) setUsedBy(result.trips);
      setErrors(result.fieldErrors ?? {});
      setError(result.error);
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!place) {
      setErrors({ place: "Choisis une adresse dans la liste" });
      return;
    }
    handle(() => saveAddressAction({ name, icon, place }, address?.id));
  }

  function remove() {
    if (!address || !confirm(`Supprimer l'adresse « ${address.name} » ?`)) return;
    handle(() => deleteAddressAction(address.id));
  }

  const trips = `${usedBy} trajet${usedBy > 1 ? "s" : ""}`;

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      {place && <PointsMap key={`${place.lat},${place.lon}`} points={[{ ...place, label: name || place.label, color: "#fee131" }]} className="h-44 w-full overflow-hidden rounded-3xl" />}

      {address && !address.confirmed && (
        <p className="rounded-2xl bg-card p-4 text-sm shadow-sm">
          Adresse de ton campus ajoutée par défaut : vérifie-la puis enregistre pour la confirmer.
        </p>
      )}

      <div className="flex flex-col gap-1 text-sm font-medium">
        Adresse
        {place && <p className="font-normal">{place.label}</p>}
        <AddressSearch onSelect={setPlace} near={place} placeholder={place ? "Changer d'adresse" : "Rechercher une adresse"} />
        {errors.place && <span className="text-xs font-normal text-red-600 dark:text-red-400">{errors.place}</span>}
      </div>

      <Field
        label="Nom de cette adresse"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ex. Maison, Entreprise"
        maxLength={ADDRESS_NAME_MAX_LENGTH}
        required
        error={errors.name}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Icône</legend>
        <div className="flex gap-3">
          {ADDRESS_ICONS.map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl p-2 text-xs ${
                icon === value ? "bg-card shadow-sm ring-2 ring-foreground" : "opacity-70"
              }`}
            >
              <input
                type="radio"
                name="icon"
                value={value}
                checked={icon === value}
                onChange={() => setIcon(value)}
                className="sr-only"
              />
              <AddressPin icon={value} className="size-11" />
              {ADDRESS_ICON_LABELS[value]}
            </label>
          ))}
        </div>
      </fieldset>

      {usedBy > 0 && address && (
        <div className="flex flex-col gap-3 rounded-3xl border border-red-500 bg-card p-4 text-sm">
          <p>
            Cette adresse est utilisée par {trips}. Choisis quoi en faire avant de la supprimer.
          </p>
          {others.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                aria-label="Nouvelle adresse pour ces trajets"
                className="rounded-xl border border-border bg-surface px-3 py-2"
              >
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending || !reassignTo}
                onClick={() => handle(() => deleteAddressAction(address.id, { reassignTo }))}
                className={secondary}
              >
                Réaffecter et supprimer
              </button>
            </div>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(`Supprimer l'adresse et ${trips} ?`))
                handle(() => deleteAddressAction(address.id, { deleteTrips: true }));
            }}
            className="self-start text-red-600 underline dark:text-red-400"
          >
            Supprimer aussi {usedBy > 1 ? "ces trajets" : "ce trajet"}
          </button>
        </div>
      )}

      <FormMessage error={error} />
      <div className="grid grid-cols-2 gap-3">
        {address ? (
          <button type="button" disabled={pending} onClick={remove} className={secondary}>
            Supprimer
          </button>
        ) : (
          <button type="button" onClick={() => router.back()} className={secondary}>
            Annuler
          </button>
        )}
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Patiente…" : address && !address.confirmed ? "Confirmer" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
