import "server-only";
import { localMinutes } from "@/lib/dates";
import type { LatLon } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";
import { sliceBetween } from "./geometry";
import { loadTrips, matchPair, pointLabel, publicMatch, type ProposalMatch, type ProposalRequest } from "./server";

type Role = "driver" | "passenger";
export type MarkerKind = "departure" | "pickup" | "dropoff" | "arrival";
export type Line = [number, number][];

export type ProposalDetail = {
  date: string;
  slot: "morning" | "evening";
  myTripId: string;
  myRole: Role;
  myRoute: { from: string; to: string };
  other: { tripId: string; userId: string; displayName: string; role: Role };
  match: ProposalMatch;
  pickupLabel: string | null;
  dropoffLabel: string | null;
  timeline: { kind: MarkerKind; min: number; note?: string }[];
  /**
   * Privacy: the driver sees their whole route; the passenger only the shared stretch,
   * the meeting point and the drop-off. Departure and arrival are the viewer's own.
   */
  map: { shared: Line | null; driverOnly: Line[]; markers: (LatLon & { kind: MarkerKind })[] };
  seats: { taken: number; total: number };
  commonTrips: number;
  request: ProposalRequest | null;
  wasCancelled: boolean;
  sendBlocked?: string;
};

/** Number of weekdays both users travel in this direction. */
async function countCommonTrips(myTripId: string, otherTripId: string, slot: "morning" | "evening") {
  const supabase = await createClient();
  const { data: pair } = await supabase.from("trips").select("id, commute_id").in("id", [myTripId, otherTripId]);
  const commutes = (pair ?? []).map((t) => t.commute_id);
  if (commutes.length < 2) return 0;
  const { data } = await supabase.from("trips").select("commute_id, weekdays").in("commute_id", commutes).eq("slot", slot).eq("is_active", true);
  const days = (commute: string) => new Set((data ?? []).filter((t) => t.commute_id === commute).map((t) => t.weekdays[0]));
  const [a, b] = [days(commutes[0]), days(commutes[1])];
  return [...a].filter((d) => b.has(d)).length;
}

export async function getProposalDetail(
  userId: string,
  myTripId: string,
  otherTripId: string,
  date: string,
): Promise<ProposalDetail | null> {
  const supabase = await createClient();
  const trips = await loadTrips(date, { ids: [myTripId, otherTripId] });
  const mine = trips.find((t) => t.id === myTripId && t.ownerId === userId);
  const other = trips.find((t) => t.id === otherTripId && t.ownerId !== userId);
  if (!mine || !other || mine.role === other.role || mine.slot !== other.slot) return null;
  const [driver, passenger] = mine.role === "driver" ? [mine, other] : [other, mine];

  const [{ data: load }, { data: requests }, { data: profile }, commonTrips] = await Promise.all([
    supabase.rpc("occurrence_load", { p_trip_ids: [driver.id], p_date: date }),
    supabase
      .from("trip_requests")
      .select("id, status, sender_id, driver_trip_id, passenger_trip_id, driver_departure_at, pickup_at, dropoff_at, pickup_lat, pickup_lon, pickup_label, dropoff_lat, dropoff_lon, dropoff_label, walk_min, detour_min, detour_m, score")
      .eq("date", date)
      .eq("slot", mine.slot),
    supabase.from("profiles").select("display_name").eq("id", other.ownerId).single(),
    countCommonTrips(myTripId, otherTripId, mine.slot),
  ]);
  const occurrence = load?.[0];
  const seats = { taken: occurrence?.accepted ?? 0, total: occurrence?.seats_total ?? driver.seats ?? 0 };
  const pair = (requests ?? []).filter((r) => r.driver_trip_id === driver.id && r.passenger_trip_id === passenger.id);
  const request = pair.find((r) => r.status !== "cancelled");

  // Request snapshot wins for times and points; the route is recomputed for the map only.
  const fixed = request
    ? localMinutes(new Date(request.driver_departure_at))
    : occurrence?.fixed_departure
      ? localMinutes(new Date(occurrence.fixed_departure))
      : null;
  const full = await matchPair(driver, passenger, fixed);
  if (!request && !full) return null;

  const match: ProposalMatch = request
    ? {
        pickup: { lat: request.pickup_lat, lon: request.pickup_lon },
        dropoff: { lat: request.dropoff_lat, lon: request.dropoff_lon },
        driverDepartureMin: localMinutes(new Date(request.driver_departure_at)),
        pickupMin: localMinutes(new Date(request.pickup_at)),
        dropoffMin: localMinutes(new Date(request.dropoff_at)),
        walkMin: request.walk_min,
        detourMin: request.detour_min,
        detourM: request.detour_m,
        score: request.score,
      }
    : publicMatch(full!);

  const [pickupLabel, dropoffLabel] = request
    ? [request.pickup_label || null, request.dropoff_label || null]
    : await Promise.all([pointLabel(match.pickup), pointLabel(match.dropoff)]);

  const iAmDriver = mine.role === "driver";
  const route = full?.route.geometry ?? null;
  const shared = route ? sliceBetween(route, match.pickup, match.dropoff) : null;
  const driverOnly =
    iAmDriver && route
      ? [sliceBetween(route, driver.origin, match.pickup), sliceBetween(route, match.dropoff, driver.destination)].filter((l) => l.length > 1)
      : [];
  const markers: ProposalDetail["map"]["markers"] = [
    { ...mine.origin, kind: "departure" },
    { ...match.pickup, kind: "pickup" },
    { ...match.dropoff, kind: "dropoff" },
    { ...mine.destination, kind: "arrival" },
  ];

  const durationMin = full ? full.driverArrivalMin - full.driverDepartureMin : null;
  const timeline: ProposalDetail["timeline"] = iAmDriver
    ? [
        { kind: "departure", min: match.driverDepartureMin },
        { kind: "pickup", min: match.pickupMin },
        { kind: "dropoff", min: match.dropoffMin },
        { kind: "arrival", min: durationMin !== null ? match.driverDepartureMin + durationMin : match.dropoffMin },
      ]
    : [
        { kind: "departure", min: full && !request ? full.passengerLeaveMin : match.pickupMin, note: match.walkMin ? `${match.walkMin} min de marche au total` : undefined },
        { kind: "pickup", min: match.pickupMin },
        { kind: "dropoff", min: match.dropoffMin },
        { kind: "arrival", min: full && !request ? full.passengerArriveMin : match.dropoffMin },
      ];

  const passengerHasRide = (requests ?? []).some((r) => r.status === "accepted" && r.passenger_trip_id === passenger.id && r.id !== request?.id);
  const sendBlocked = !iAmDriver
    ? passengerHasRide
      ? "Tu as déjà un covoiturage sur ce créneau"
      : undefined
    : seats.taken >= seats.total
      ? "Ton trajet est complet"
      : undefined;

  return {
    date,
    slot: mine.slot,
    myTripId,
    myRole: mine.role,
    myRoute: { from: mine.originName, to: mine.destinationName },
    other: { tripId: other.id, userId: other.ownerId, displayName: profile?.display_name ?? "?", role: other.role },
    match,
    pickupLabel,
    dropoffLabel,
    timeline,
    map: { shared, driverOnly, markers },
    seats,
    commonTrips,
    request: request
      ? { id: request.id, status: request.status, sentByMe: request.sender_id === userId, driverDepartureAt: request.driver_departure_at }
      : null,
    wasCancelled: pair.some((r) => r.status === "cancelled"),
    sendBlocked,
  };
}
