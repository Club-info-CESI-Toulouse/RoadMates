"use client";

import Link from "next/link";
import { useState } from "react";
import { PointsMap, type MapPoint } from "@/components/map/points-map";
import { MARKER_STYLE } from "@/components/map/trip-detail-map";
import { MessageButton } from "@/components/message-button";
import { RequestActions } from "@/components/request-actions";
import type { LatLon } from "@/lib/geo/types";
import type { Proposal } from "@/lib/matching/server";
import { ROLE_LABELS } from "@/lib/trips/labels";
import { fromMinutes } from "@/lib/trips/times";

const km = (m: number) => `${(m / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;

type Props = {
  proposal: Proposal;
  iAmDriver: boolean;
  myTripId: string;
  date: string;
  sendBlocked?: string;
  /** The viewer's own trip endpoints, shown only to them. */
  myOrigin: LatLon;
  myDestination: LatLon;
};

export function ProposalCard({ proposal, iAmDriver, myTripId, date, sendBlocked, myOrigin, myDestination }: Props) {
  const [showMap, setShowMap] = useState(false);
  const { other, match } = proposal;
  const mapPoints: MapPoint[] = [
    { ...myOrigin, label: "Point de départ", color: MARKER_STYLE.departure.color },
    { ...match.pickup, label: `Point de rendez-vous (${fromMinutes(match.pickupMin)})`, color: MARKER_STYLE.pickup.color },
    { ...match.dropoff, label: `Point de dépose (${fromMinutes(match.dropoffMin)})`, color: MARKER_STYLE.dropoff.color },
    { ...myDestination, label: "Point d'arrivée", color: MARKER_STYLE.arrival.color },
  ];

  return (
    <li className="flex flex-col gap-3 rounded-3xl border border-border bg-card shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/proposition/${myTripId}/${other.tripId}?date=${date}`}
            className="font-semibold underline-offset-4 hover:underline"
          >
            {other.displayName}
          </Link>
          <p className="text-sm text-muted">
            {ROLE_LABELS[other.role]}
            {other.role === "driver" && ` · ${proposal.seatsLeft} place${proposal.seatsLeft > 1 ? "s" : ""} libre${proposal.seatsLeft > 1 ? "s" : ""}`}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold" title="Indice de compatibilité">
          {match.score} %
        </span>
      </div>

      <ol className="flex flex-col gap-1.5 text-sm">
        {iAmDriver && (
          <li className="flex gap-3">
            <span className="w-12 font-semibold tabular-nums">{fromMinutes(match.driverDepartureMin)}</span>
            <span className="text-muted">Ton départ</span>
          </li>
        )}
        <li className="flex gap-3">
          <span className="w-12 font-semibold tabular-nums">{fromMinutes(match.pickupMin)}</span>
          <span>
            <span className="font-medium">Rendez-vous</span>
            {proposal.pickupLabel && <span className="text-muted"> · {proposal.pickupLabel}</span>}
          </span>
        </li>
        <li className="flex gap-3">
          <span className="w-12 font-semibold tabular-nums">{fromMinutes(match.dropoffMin)}</span>
          <span>
            <span className="font-medium">Dépose</span>
            {proposal.dropoffLabel && <span className="text-muted"> · {proposal.dropoffLabel}</span>}
          </span>
        </li>
      </ol>

      <p className="text-sm">
        {iAmDriver
          ? match.detourMin === 0 && match.detourM < 100
            ? "Sans détour"
            : `Détour : +${match.detourMin} min · +${km(match.detourM)}`
          : match.walkMin === 0
            ? "Aucune marche"
            : `Marche : ${match.walkMin} min au total`}
      </p>
      <p className="text-xs text-muted">Horaires estimés, hors trafic.</p>

      <Link
        href={`/proposition/${myTripId}/${other.tripId}?date=${date}`}
        className="self-start text-sm font-semibold underline"
      >
        Voir le détail du trajet
      </Link>
      <button type="button" onClick={() => setShowMap((v) => !v)} className="self-start text-sm underline">
        {showMap ? "Masquer la carte" : "Voir les points sur la carte"}
      </button>
      {showMap && (
        <>
          <PointsMap points={mapPoints} />
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs" aria-label="Légende de la carte">
            {mapPoints.map((point) => (
              <li key={point.label} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-3 rounded-full ring-1 ring-foreground" style={{ background: point.color }} />
                {point.label}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">Ton départ et ton arrivée ne sont visibles que par toi.</p>
        </>
      )}

      <div className="flex flex-wrap items-start justify-between gap-2">
        <RequestActions
          otherName={other.displayName}
          request={proposal.request}
          send={{ myTripId, otherTripId: other.tripId, date }}
          sendBlocked={sendBlocked}
        />
        <MessageButton userId={other.userId} name={other.displayName} />
      </div>
    </li>
  );
}
