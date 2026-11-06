"use client";

import { useState, useTransition } from "react";
import { acceptRequestAction, cancelRequestAction, sendRequestAction } from "@/app/(app)/actions";
import type { RequestResult } from "@/lib/requests/server";
import { CANCEL_LOCK_BEFORE_DEPARTURE_MIN } from "@/lib/trips/constants";

export const ESTIMATE_WARNING =
  "Horaires estimés, hors trafic : confirmez l'horaire entre vous via la messagerie.";

type Props = {
  otherName: string;
  request: { id: string; status: "pending" | "accepted" | "cancelled"; sentByMe: boolean; driverDepartureAt: string } | null;
  send?: { myTripId: string; otherTripId: string; date: string };
  /** Reason the user can't send a new request, if any. */
  sendBlocked?: string;
};

const primary = "rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60";
const secondary = "rounded-full border border-border bg-card px-3 py-2 text-sm font-medium disabled:opacity-60";

export function RequestActions({ otherName, request, send, sendBlocked }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function run(action: () => Promise<RequestResult>, question?: string) {
    if (question && !confirm(question)) return;
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }

  let content;
  if (!request || request.status === "cancelled") {
    content = sendBlocked ? (
      <p className="text-sm text-muted">{sendBlocked}</p>
    ) : (
      send && (
        <button
          type="button"
          disabled={pending}
          className={primary}
          onClick={() =>
            run(
              () => sendRequestAction(send.myTripId, send.otherTripId, send.date),
              `Envoyer une demande à ${otherName} ?\n\n${ESTIMATE_WARNING}`,
            )
          }
        >
          Envoyer une demande
        </button>
      )
    );
  } else if (request.status === "pending" && request.sentByMe) {
    content = (
      <>
        <span className="text-sm font-medium">Demande envoyée</span>
        <button type="button" disabled={pending} className={secondary} onClick={() => run(() => cancelRequestAction(request.id), "Annuler ta demande ?")}>
          Annuler
        </button>
      </>
    );
  } else if (request.status === "pending") {
    content = (
      <>
        <button
          type="button"
          disabled={pending}
          className={primary}
          onClick={() => run(() => acceptRequestAction(request.id), `Accepter la demande de ${otherName} ?\n\n${ESTIMATE_WARNING}`)}
        >
          Accepter
        </button>
        <button type="button" disabled={pending} className={secondary} onClick={() => run(() => cancelRequestAction(request.id), "Refuser cette demande ?")}>
          Refuser
        </button>
      </>
    );
  } else {
    const lockAt = new Date(request.driverDepartureAt).getTime() - CANCEL_LOCK_BEFORE_DEPARTURE_MIN * 60_000;
    content = (
      <>
        <button
          type="button"
          disabled={pending}
          className={secondary}
          onClick={() => {
            if (Date.now() > lockAt) {
              setError(`Annulation impossible à moins de ${CANCEL_LOCK_BEFORE_DEPARTURE_MIN} min du départ du conducteur`);
              return;
            }
            run(() => cancelRequestAction(request.id), `Annuler ce covoiturage ? ${otherName} sera prévenu·e.`);
          }}
        >
          Annuler le covoiturage
        </button>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">{content}</div>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
