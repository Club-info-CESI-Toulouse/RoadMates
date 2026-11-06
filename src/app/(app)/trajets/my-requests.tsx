import { MessageButton } from "@/components/message-button";
import { RequestActions } from "@/components/request-actions";
import { RequestStatusBadge } from "@/components/request-status-badge";
import { formatClock, formatDayLabel } from "@/lib/dates";
import type { RequestView } from "@/lib/requests/server";
import { SLOT_LABELS } from "@/lib/trips/labels";

function RequestCard({ request: r, past = false }: { request: RequestView; past?: boolean }) {
  return (
    <li className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-4 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">
          {formatDayLabel(r.date)} · {SLOT_LABELS[r.slot]} · {r.otherName}
          <span className="font-normal text-muted"> ({r.iAmDriver ? "passager" : "conducteur"})</span>
        </p>
        <RequestStatusBadge status={r.cancelReason === "declined" ? "refused" : r.status} />
      </div>
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
        {!past && (
          <RequestActions
            otherName={r.otherName}
            request={{ id: r.id, status: r.status, sentByMe: r.sentByMe, driverDepartureAt: r.driverDepartureAt }}
          />
        )}
        <div className="ml-auto">
          <MessageButton userId={r.otherId} name={r.otherName} />
        </div>
      </div>
    </li>
  );
}

// Upcoming rides and open requests, sent and received.
export function MyRequests({ requests }: { requests: RequestView[] }) {
  if (requests.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Covoiturages et demandes</h2>
      <ul className="flex flex-col gap-3">
        {requests.map((r) => (
          <RequestCard key={r.id} request={r} />
        ))}
      </ul>
    </section>
  );
}

// Past rides and cancelled or declined requests, most recent first.
export function RequestHistory({ requests }: { requests: RequestView[] }) {
  if (requests.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Historique</h2>
      <ul className="flex flex-col gap-3">
        {requests.map((r) => (
          <RequestCard key={r.id} request={r} past />
        ))}
      </ul>
    </section>
  );
}
