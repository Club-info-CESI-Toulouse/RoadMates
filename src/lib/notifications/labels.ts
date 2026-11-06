import { formatDayLabel } from "@/lib/dates";
import { SLOT_LABELS } from "@/lib/trips/labels";

export type NotificationPayload = {
  date?: string;
  slot?: "morning" | "evening";
  other_name?: string;
  preview?: string;
};

// Text of a notification, shared by the in-app list and push/email delivery.
export function notificationText(kind: string, payload: NotificationPayload): string {
  const name = payload.other_name ?? "Un camarade";
  const when =
    payload.date && payload.slot
      ? `le ${formatDayLabel(payload.date)} (${SLOT_LABELS[payload.slot].toLowerCase()})`
      : "";
  const yours = `Ta demande avec ${name} ${when} a été annulée`;
  switch (kind) {
    case "new_message":
      return `${name} : ${payload.preview ?? "nouveau message"}`;
    case "request_received":
      return `${name} t'a envoyé une demande de covoiturage ${when}.`;
    case "request_accepted":
      return `${name} a accepté ta demande ${when}. Confirmez l'horaire via la messagerie.`;
    case "request_declined":
      return `${name} a refusé ta demande ${when}.`;
    case "request_withdrawn":
      return `${name} a retiré sa demande ${when}.`;
    case "request_cancelled":
      return `${name} a annulé votre covoiturage ${when}. La place est libérée.`;
    case "request_full":
      return `${yours} : le trajet est complet.`;
    case "request_past":
      return `${yours} : le trajet est passé sans réponse.`;
    case "request_passenger_matched":
      return `${yours} : le passager a déjà un covoiturage sur ce créneau.`;
    case "request_schedule_changed":
      return `${yours} : le conducteur a confirmé un autre horaire.`;
    default:
      return "Nouvelle notification.";
  }
}

export const notificationTitle = (kind: string) =>
  kind === "new_message" ? "Nouveau message" : "Covoiturage";

export type NotificationRequest = {
  date: string;
  driver_id: string;
  driver_trip_id: string | null;
  passenger_trip_id: string | null;
};

/** Where a notification leads: the conversation, or the proposal behind the request. */
export function notificationUrl(
  kind: string,
  conversationId: string | null,
  request?: NotificationRequest | null,
  userId?: string,
) {
  if (kind === "new_message" && conversationId) return `/messagerie/${conversationId}`;
  // The trips may be gone: the request then only lives in the history.
  if (!request?.driver_trip_id || !request.passenger_trip_id || !userId) return "/trajets";
  const [mine, other] =
    request.driver_id === userId
      ? [request.driver_trip_id, request.passenger_trip_id]
      : [request.passenger_trip_id, request.driver_trip_id];
  return `/proposition/${mine}/${other}?date=${request.date}`;
}
