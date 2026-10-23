"use client";

import { useRef } from "react";
import { MAX_PENDING_SENT_PER_SLOT } from "@/lib/trips/constants";

// Tutorial pop-up, also reminding that times are free-flow estimates.
export function HelpDialog() {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label="Aide"
        className="flex size-9 items-center justify-center rounded-full border-2 border-foreground text-lg font-bold"
      >
        ?
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-3xl bg-card p-0 text-foreground shadow-xl backdrop:bg-black/60"
      >
        <div className="flex flex-col gap-4 p-6 text-sm">
          <h2 className="text-lg font-bold">Comment ça marche</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            <li>
              Renseigne tes adresses dans <strong>Compte</strong>, puis tes trajets habituels dans{" "}
              <strong>Mes trajets</strong> (conducteur ou passager, matin et soir).
            </li>
            <li>
              Choisis un jour en haut de l&apos;accueil : RoadMates te propose les camarades
              compatibles, du plus au moins compatible.
            </li>
            <li>
              Le <strong>point de rendez-vous</strong> est calculé sur l&apos;itinéraire du
              conducteur pour limiter la marche du passager. L&apos;adresse de chacun reste privée.
            </li>
            <li>
              Envoie une demande pour un jour, matin ou soir. La place est réservée quand
              l&apos;autre accepte. Maximum {MAX_PENDING_SENT_PER_SLOT} demandes en attente par
              créneau.
            </li>
            <li>Un covoiturage accepté peut être annulé jusqu&apos;à 5 min avant le départ du conducteur.</li>
          </ol>
          <p className="rounded-xl bg-surface p-3">
            <strong>Horaires estimés, hors trafic.</strong> Les durées sont calculées en circulation
            fluide, sans bouchons. RoadMates est une aide à l&apos;organisation : confirmez
            l&apos;horaire entre vous via la messagerie.
          </p>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="self-end rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground"
          >
            Compris
          </button>
        </div>
      </dialog>
    </>
  );
}
