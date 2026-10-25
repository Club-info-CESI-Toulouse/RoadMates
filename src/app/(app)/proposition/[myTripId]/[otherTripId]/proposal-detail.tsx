"use client";

import { useState } from "react";
import { MARKER_STYLE, TripDetailMap } from "@/components/map/trip-detail-map";
import { MessageButton } from "@/components/message-button";
import { ESTIMATE_WARNING, RequestActions } from "@/components/request-actions";
import type { ProposalDetail } from "@/lib/matching/detail";
import { ROLE_LABELS } from "@/lib/trips/labels";
import { fromMinutes } from "@/lib/trips/times";

const km = (m: number) => `${(m / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
const card = "flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-sm";

function Dot({ kind }: { kind: keyof typeof MARKER_STYLE }) {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 shrink-0 rounded-full ring-2 ring-foreground"
      style={{ background: MARKER_STYLE[kind].color }}
    />
  );
}

export function ProposalDetailView({ detail }: { detail: ProposalDetail }) {
  const [fullscreen, setFullscreen] = useState(false);
  const { match, other, map } = detail;
  const iAmDriver = detail.myRole === "driver";
  const placeOf = (kind: string) =>
    kind === "pickup" ? detail.pickupLabel : kind === "dropoff" ? detail.dropoffLabel : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <TripDetailMap shared={map.shared} driverOnly={map.driverOnly} markers={map.markers} />
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="absolute top-3 left-3 rounded-full bg-card px-3 py-1.5 text-sm font-semibold shadow-md"
        >
          Détails du trajet
        </button>
      </div>

      <section className={card}>
        <RequestActions
          otherName={other.displayName}
          request={detail.request}
          send={{ myTripId: detail.myTripId, otherTripId: other.tripId, date: detail.date }}
          sendBlocked={detail.sendBlocked}
        />
        <p className="text-xs text-muted">{ESTIMATE_WARNING}</p>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Récap</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Mon rôle</dt>
          <dd className="text-right font-medium">{ROLE_LABELS[detail.myRole]}</dd>
          <dt className="text-muted">Avec</dt>
          <dd className="text-right font-medium">
            {other.displayName}{" "}
            <span className="font-normal text-muted">({ROLE_LABELS[other.role].toLowerCase()})</span>
          </dd>
          <dt className="text-muted">Trajets en commun</dt>
          <dd className="text-right font-medium">{detail.commonTrips} par semaine</dd>
          <dt className="text-muted">Places</dt>
          <dd className="text-right font-medium tabular-nums">
            {detail.seats.taken}/{detail.seats.total} occupée{detail.seats.taken > 1 ? "s" : ""}
          </dd>
          <dt className="text-muted">{iAmDriver ? "Détour" : "Marche"}</dt>
          <dd className="text-right font-medium">
            {iAmDriver
              ? match.detourMin === 0 && match.detourM < 100
                ? "Aucun"
                : `+${match.detourMin} min · +${km(match.detourM)}`
              : match.walkMin === 0
                ? "Aucune"
                : `${match.walkMin} min au total`}
          </dd>
          <dt className="text-muted">Compatibilité</dt>
          <dd className="text-right font-medium">{match.score} %</dd>
        </dl>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
          <span className="text-muted">Discuter</span>
          <MessageButton userId={other.userId} name={other.displayName} />
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Détails des rendez-vous</h2>
        <div className="text-sm">
          <p className="text-muted">Rendez-vous</p>
          <p className="font-medium">{detail.pickupLabel ?? "Point sur l'itinéraire du conducteur"}</p>
        </div>
        <div className="text-sm">
          <p className="text-muted">Dépose</p>
          <p className="font-medium">{detail.dropoffLabel ?? "Point sur l'itinéraire du conducteur"}</p>
        </div>
        <ol className="mt-2 grid grid-cols-4 gap-1 text-center text-xs">
          {detail.timeline.map((step) => (
            <li key={step.kind} className="flex flex-col items-center gap-1">
              <Dot kind={step.kind} />
              <span className="text-muted">{MARKER_STYLE[step.kind].label}</span>
              <span
                className={`text-base font-semibold tabular-nums ${step.kind === "pickup" ? "underline decoration-primary decoration-4" : ""}`}
              >
                {fromMinutes(step.min)}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted">
          Horaires estimés, hors trafic. Les points de rendez-vous et de dépose sont proposés par
          RoadMates.
        </p>
      </section>

      {fullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Détails du trajet"
          className="fixed inset-0 z-30 flex flex-col bg-background"
        >
          <div className="flex items-center justify-between gap-3 p-4">
            <h2 className="text-lg font-bold">Détails du trajet</h2>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold"
            >
              Fermer
            </button>
          </div>
          <TripDetailMap
            shared={map.shared}
            driverOnly={map.driverOnly}
            markers={map.markers}
            className="min-h-0 w-full flex-1"
          />
          <div className="max-h-[40dvh] overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <ol className="flex flex-col gap-3">
              {detail.timeline.map((step) => (
                <li key={step.kind} className="flex items-start gap-3">
                  <span className="w-12 pt-0.5 font-semibold tabular-nums">{fromMinutes(step.min)}</span>
                  <span className="pt-1.5">
                    <Dot kind={step.kind} />
                  </span>
                  <span className="flex flex-col text-sm">
                    <span className="font-medium">{MARKER_STYLE[step.kind].label}</span>
                    {placeOf(step.kind) && <span className="text-muted">{placeOf(step.kind)}</span>}
                    {step.note && <span className="text-xs text-muted">{step.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
            {!iAmDriver && (
              <p className="mt-3 text-xs text-muted">
                Seul le tronçon partagé est affiché : l&apos;itinéraire complet du conducteur reste
                privé.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
