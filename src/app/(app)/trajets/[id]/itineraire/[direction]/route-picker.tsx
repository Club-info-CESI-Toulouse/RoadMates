"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormMessage } from "@/components/form";
import { RoutesMap } from "@/components/map/routes-map";
import type { RouteOption } from "@/lib/commutes/server";
import { formatDuration } from "@/lib/trips/times";
import { setRouteChoiceAction } from "../../../actions";

const km = (m: number) => `${(m / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;

export function RoutePicker({
  commuteId,
  direction,
  lines,
  options,
  initial,
}: {
  commuteId: string;
  direction: "morning" | "evening";
  lines: { idx: number; geometry: [number, number][] }[];
  options: RouteOption[];
  initial: number | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(initial);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const choices: { value: number | null; label: string; detail?: string }[] = [
    { value: null, label: "Tous les itinéraires", detail: "Un passager peut être pris sur n'importe lequel" },
    ...options.map((o) => ({ value: o.idx, label: o.label, detail: `${formatDuration(Math.round(o.durationS / 60))} · ${km(o.distanceM)}` })),
  ];

  return (
    <div className="flex flex-col gap-5">
      {lines.length > 0 ? (
        <RoutesMap lines={lines} selected={selected} />
      ) : (
        <p className="text-sm text-muted">Itinéraires indisponibles pour le moment.</p>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Itinéraire que tu acceptes de suivre</legend>
        {choices.map((c) => (
          <label
            key={c.value ?? "all"}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${selected === c.value ? "border-foreground bg-card shadow-sm" : "border-border"}`}
          >
            <input type="radio" name="route" checked={selected === c.value} onChange={() => setSelected(c.value)} className="size-5 accent-primary" />
            <span className="flex flex-col">
              <span className="font-medium">{c.label}</span>
              {c.detail && <span className="text-xs text-muted">{c.detail}</span>}
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-muted">Durées estimées hors trafic. Seuls les passagers sur l&apos;itinéraire choisi te seront proposés.</p>
      <FormMessage error={error} />
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setRouteChoiceAction(commuteId, direction, selected);
            if (result.ok) router.push(`/trajets/${commuteId}`);
            else setError(result.error);
          })
        }
        className="rounded-full bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Patiente…" : "Enregistrer"}
      </button>
    </div>
  );
}
