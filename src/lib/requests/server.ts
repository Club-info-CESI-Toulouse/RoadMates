import "server-only";
import { localDate, localMinutes, zonedInstant } from "@/lib/dates";
import { loadTrips, matchPair, pointLabel } from "@/lib/matching/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MAX_PENDING_SENT_PER_SLOT } from "@/lib/trips/constants";

export type RequestResult = { ok: true } | { ok: false; error: string };

// Messages for errors raised by the SQL functions (supabase/migrations/*_requests.sql).
const ERRORS: Record<string, string> = {
  past: "Ce trajet est déjà parti",
  full: "Plus aucune place sur ce trajet",
  passenger_matched: "Le passager a déjà un covoiturage sur ce créneau",
  duplicate: "Une demande existe déjà pour ce covoiturage",
  limit: `Tu as déjà ${MAX_PENDING_SENT_PER_SLOT} demandes en attente sur ce créneau`,
  invalid_trips: "Ces trajets ne sont pas compatibles",
  occurrence_cancelled: "Ce trajet est annulé ce jour-là",
  forbidden: "Action non autorisée",
  not_pending: "Cette demande n'est plus en attente",
  schedule_changed: "Le conducteur a déjà accepté un autre horaire ce jour-là",
  too_late: "Annulation impossible à moins de 5 min du départ du conducteur",
};

function fail(error: { message: string } | null): RequestResult {
  const code = Object.keys(ERRORS).find((k) => error?.message.includes(k));
  return { ok: false, error: code ? ERRORS[code] : "Action impossible pour le moment, réessaie" };
}

/** Sends a request between one of the user's trips and someone else's, for one date. */
export async function sendRequest(userId: string, myTripId: string, otherTripId: string, date: string): Promise<RequestResult> {
  const trips = await loadTrips(date, { ids: [myTripId, otherTripId] });
  const mine = trips.find((t) => t.id === myTripId && t.ownerId === userId);
  const other = trips.find((t) => t.id === otherTripId && t.ownerId !== userId);
  if (!mine || !other || mine.role === other.role || mine.slot !== other.slot)
    return { ok: false, error: ERRORS.invalid_trips };

  const [driver, passenger] = mine.role === "driver" ? [mine, other] : [other, mine];
  const supabase = await createClient();
  const { data: load } = await supabase.rpc("occurrence_load", { p_trip_ids: [driver.id], p_date: date });
  const fixed = load?.[0]?.fixed_departure;
  const fixedMin = fixed ? localMinutes(new Date(fixed)) : null;

  const match = await matchPair(driver, passenger, fixedMin);
  if (!match) return { ok: false, error: "Ce covoiturage n'est plus compatible, actualise la page" };

  const durationMin = Math.round(driver.durationS / 60);
  const idealDeparture = driver.departureMin ?? driver.arrivalMin! - durationMin;
  const iso = (minutes: number) => zonedInstant(date, minutes).toISOString();
  const [pickupLabel, dropoffLabel] = await Promise.all([pointLabel(match.pickup), pointLabel(match.dropoff)]);

  const { error } = await createAdminClient().rpc("create_trip_request", {
    p_sender: userId,
    p_driver_trip: driver.id,
    p_passenger_trip: passenger.id,
    p_date: date,
    p_occurrence_departure: iso(idealDeparture),
    p_occurrence_arrival: iso(idealDeparture + durationMin),
    p_driver_departure: iso(match.driverDepartureMin),
    p_pickup_at: iso(match.pickupMin),
    p_dropoff_at: iso(match.dropoffMin),
    p_pickup_lat: match.pickup.lat,
    p_pickup_lon: match.pickup.lon,
    p_pickup_label: pickupLabel?.slice(0, 200) ?? "",
    p_dropoff_lat: match.dropoff.lat,
    p_dropoff_lon: match.dropoff.lon,
    p_dropoff_label: dropoffLabel?.slice(0, 200) ?? "",
    p_walk_min: match.walkMin,
    p_detour_min: match.detourMin,
    p_detour_m: match.detourM,
    p_distance_m: match.rideM,
    p_score: match.score,
    p_max_pending: MAX_PENDING_SENT_PER_SLOT,
  });
  return error ? fail(error) : { ok: true };
}

export async function acceptRequest(id: string): Promise<RequestResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_trip_request", { p_id: id });
  return error ? fail(error) : { ok: true };
}

/** Cancel, decline or withdraw depending on the request state and who asks. */
export async function cancelRequest(id: string): Promise<RequestResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_trip_request", { p_id: id });
  return error ? fail(error) : { ok: true };
}

export type RequestView = {
  id: string;
  date: string;
  slot: "morning" | "evening";
  status: "pending" | "accepted" | "cancelled";
  sentByMe: boolean;
  iAmDriver: boolean;
  otherId: string;
  otherName: string;
  driverDepartureAt: string;
  pickupAt: string;
  dropoffAt: string;
  pickupLabel: string | null;
  dropoffLabel: string | null;
  walkMin: number;
  detourMin: number;
  detourM: number;
};

/** The user's open requests and rides from today on, soonest first. */
export async function listMyRequests(userId: string): Promise<RequestView[]> {
  const supabase = await createClient();
  await supabase.rpc("expire_trip_requests");
  const { data } = await supabase
    .from("trip_requests")
    .select(
      "id, date, slot, status, sender_id, driver_id, passenger_id, driver_departure_at, pickup_at, dropoff_at, pickup_label, dropoff_label, walk_min, detour_min, detour_m",
    )
    .gte("date", localDate())
    .order("pickup_at");
  const rows = (data ?? []).filter((r) => new Date(r.dropoff_at).getTime() > Date.now());

  const otherIds = [...new Set(rows.map((r) => (r.driver_id === userId ? r.passenger_id : r.driver_id)))];
  const { data: profiles } = otherIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", otherIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  return rows.map((r) => {
    const otherId = r.driver_id === userId ? r.passenger_id : r.driver_id;
    return {
      id: r.id,
      date: r.date,
      slot: r.slot,
      status: r.status,
      sentByMe: r.sender_id === userId,
      iAmDriver: r.driver_id === userId,
      otherId,
      otherName: names.get(otherId) ?? "?",
      driverDepartureAt: r.driver_departure_at,
      pickupAt: r.pickup_at,
      dropoffAt: r.dropoff_at,
      pickupLabel: r.pickup_label,
      dropoffLabel: r.dropoff_label,
      walkMin: r.walk_min,
      detourMin: r.detour_min,
      detourM: r.detour_m,
    };
  });
}
