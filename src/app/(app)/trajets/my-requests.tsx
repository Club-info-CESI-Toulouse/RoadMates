import { MessageButton } from "@/components/message-button";
import { RequestActions } from "@/components/request-actions";
import { formatClock, formatDayLabel } from "@/lib/dates";
import { listMyRequests } from "@/lib/requests/server";
import { SLOT_LABELS } from "@/lib/trips/labels";

// Upcoming rides and open requests, sent and received.
export async function MyRequests({ userId }: { userId: string }) {
  const requests = await listMyRequests(userId);
  if (requests.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Covoiturages et demandes</h2>
      <ul className="flex flex-col gap-3">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 rounded-xl border border-border p-4 text-sm">
            <p className="font-semibold">
              {formatDayLabel(r.date)} · {SLOT_LABELS[r.slot]} · {r.otherName}
              <span className="font-normal text-muted"> ({r.iAmDriver ? "passager" : "conducteur"})</span>
            </p>
            <p>
              <span className="font-semibold tabular-nums">{formatClock(r.pickupAt)}</span> Rendez-vous
              {r.pickupLabel && <span className="text-muted"> · {r.pickupLabel}</span>}
            </p>
            <p>
              <span className="font-semibold tabular-nums">{formatClock(r.dropoffAt)}</span> Dépose
              {r.dropoffLabel && <span className="text-muted"> · {r.dropoffLabel}</span>}
            </p>
            <p className="text-xs text-muted">
              {r.iAmDriver ? `Détour +${r.detourMin} min` : `Marche ${r.walkMin} min`} · horaires estimés, hors trafic
            </p>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <RequestActions
                otherName={r.otherName}
                request={{ id: r.id, status: r.status, sentByMe: r.sentByMe, driverDepartureAt: r.driverDepartureAt }}
              />
              <MessageButton userId={r.otherId} name={r.otherName} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
