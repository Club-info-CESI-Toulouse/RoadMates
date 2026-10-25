import "server-only";
import { decrypt } from "@/lib/crypto/address";
import { localMinutes, isoWeekday, zonedInstant } from "@/lib/dates";
import { getRoute, reverseGeocode, RoutingUnavailableError, type LatLon, type Place } from "@/lib/geo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { toMinutes } from "@/lib/trips/times";
import { computeMatch, estimateWalkMin, type Match, type MatchDeps, type MatchTrip } from "./match";

type Role = Database["public"]["Enums"]["trip_role"];
type Slot = Database["public"]["Enums"]["trip_slot"];
type RequestStatus = Database["public"]["Enums"]["request_status"];

export type LoadedTrip = MatchTrip & {
  role: Role;
  slot: Slot;
  seats: number | null;
  durationS: number;
  /** Address names: only meaningful to the trip owner. */
  originName: string;
  destinationName: string;
};

export type ProposalRequest = {
  id: string;
  status: RequestStatus;
  sentByMe: boolean;
  driverDepartureAt: string;
};

export type ProposalMatch = Pick<
  Match,
  "pickup" | "dropoff" | "driverDepartureMin" | "pickupMin" | "dropoffMin" | "walkMin" | "detourMin" | "detourM" | "score"
>;

export type Proposal = {
  other: { tripId: string; userId: string; displayName: string; role: Role };
  match: ProposalMatch;
  pickupLabel: string | null;
  dropoffLabel: string | null;
  /** Seats left on the driver's occurrence. */
  seatsLeft: number;
  request: ProposalRequest | null;
};

export type TripSection = { trip: LoadedTrip; seatsLeft: number | null; proposals: Proposal[] };

const ROUTING_CONCURRENCY = 4;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const deps: MatchDeps = {
  driving: (points) => getRoute("driving", ...points),
  async walkingMin(from, to) {
    try {
      return (await getRoute("walking", from, to)).durationS / 60;
    } catch (e) {
      if (e instanceof RoutingUnavailableError) return estimateWalkMin(from, to);
      throw e;
    }
  },
};

const runsOn = (t: { weekdays: number[]; valid_from: string | null; valid_until: string | null }, date: string) =>
  t.weekdays.includes(isoWeekday(date)) &&
  (!t.valid_from || t.valid_from <= date) &&
  (!t.valid_until || date <= t.valid_until);

/**
 * Active trips running on `date` that the viewer may see (RLS), with addresses
 * decrypted server-side. Addresses never leave the server.
 */
export async function loadTrips(date: string, filter?: { ids?: string[] }): Promise<LoadedTrip[]> {
  const supabase = await createClient();
  let query = supabase
    .from("trips")
    .select(
      "id, owner_id, role, slot, seats, weekdays, departure_time, arrival_time, estimated_duration_s, flex_before_min, flex_after_min, max_walk_min, valid_from, valid_until, origin_address_id, destination_address_id",
    )
    .eq("is_active", true);
  if (filter?.ids) query = query.in("id", filter.ids);
  const { data: rows } = await query;
  const trips = (rows ?? []).filter((t) => runsOn(t, date) && t.estimated_duration_s);
  if (trips.length === 0) return [];

  const addressIds = [...new Set(trips.flatMap((t) => [t.origin_address_id, t.destination_address_id]))];
  const { data: addresses } = await createAdminClient()
    .from("addresses")
    .select("id, name, payload_encrypted")
    .in("id", addressIds);
  const byId = new Map((addresses ?? []).map((a) => [a.id, { name: a.name, place: decrypt<Place>(a.payload_encrypted) }]));

  return trips.flatMap((t) => {
    const origin = byId.get(t.origin_address_id);
    const destination = byId.get(t.destination_address_id);
    if (!origin || !destination) return [];
    return [
      {
        id: t.id,
        ownerId: t.owner_id,
        role: t.role,
        slot: t.slot,
        seats: t.seats,
        durationS: t.estimated_duration_s!,
        origin: { lat: origin.place.lat, lon: origin.place.lon },
        destination: { lat: destination.place.lat, lon: destination.place.lon },
        originName: origin.name,
        destinationName: destination.name,
        departureMin: t.departure_time ? toMinutes(t.departure_time) : null,
        arrivalMin: t.arrival_time ? toMinutes(t.arrival_time) : null,
        flexBeforeMin: t.flex_before_min,
        flexAfterMin: t.flex_after_min,
        maxWalkMin: t.max_walk_min,
      },
    ];
  });
}

type Load = { seatsLeft: number; fixedDepartureMin: number | null };

async function occurrenceLoads(drivers: LoadedTrip[], date: string): Promise<Map<string, Load>> {
  const loads = new Map<string, Load>(drivers.map((d) => [d.id, { seatsLeft: d.seats ?? 0, fixedDepartureMin: null }]));
  if (drivers.length === 0) return loads;
  const supabase = await createClient();
  const { data } = await supabase.rpc("occurrence_load", { p_trip_ids: drivers.map((d) => d.id), p_date: date });
  for (const row of data ?? []) {
    loads.set(row.trip_id, {
      seatsLeft: Math.max(0, (row.seats_total ?? 0) - row.accepted),
      fixedDepartureMin: row.fixed_departure ? localMinutes(new Date(row.fixed_departure)) : null,
    });
  }
  return loads;
}

/** Match between two trips on a date, or null. Errors from routing count as "no match". */
export async function matchPair(driver: LoadedTrip, passenger: LoadedTrip, fixedDepartureMin: number | null) {
  try {
    return await computeMatch(driver, passenger, deps, { fixedDepartureMin });
  } catch (e) {
    if (e instanceof RoutingUnavailableError) return null;
    throw e;
  }
}

export async function pointLabel(point: LatLon): Promise<string | null> {
  try {
    return (await reverseGeocode(point))?.label ?? null;
  } catch {
    return null;
  }
}

/** Proposals for each of the viewer's trips running on `date`, best first. */
export async function getProposals(userId: string, date: string): Promise<TripSection[]> {
  const supabase = await createClient();
  await supabase.rpc("expire_trip_requests");

  const trips = await loadTrips(date);
  const mine = trips.filter((t) => t.ownerId === userId);
  if (mine.length === 0) return [];
  const others = trips.filter((t) => t.ownerId !== userId);
  const drivers = trips.filter((t) => t.role === "driver");

  const [loads, { data: profiles }, { data: requests }] = await Promise.all([
    occurrenceLoads(drivers, date),
    supabase.from("profiles").select("id, display_name").in("id", [...new Set(others.map((t) => t.ownerId))]),
    supabase
      .from("trip_requests")
      .select(
        "id, status, sender_id, driver_trip_id, passenger_trip_id, driver_departure_at, pickup_at, dropoff_at, pickup_lat, pickup_lon, pickup_label, dropoff_lat, dropoff_lon, dropoff_label, walk_min, detour_min, detour_m, score, updated_at",
      )
      .eq("date", date)
      .order("updated_at", { ascending: false }),
  ]);
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  const now = Date.now();

  return Promise.all(
    mine.map(async (trip) => {
      const counterparts = others.filter((o) => o.slot === trip.slot && o.role !== trip.role);
      const pairs = await mapLimit(counterparts, ROUTING_CONCURRENCY, async (other) => {
        const [driver, passenger] = trip.role === "driver" ? [trip, other] : [other, trip];
        const load = loads.get(driver.id)!;
        // Open request on this pair keeps its snapshot even if seats or times moved since.
        const request = (requests ?? []).find(
          (r) => r.driver_trip_id === driver.id && r.passenger_trip_id === passenger.id && r.status !== "cancelled",
        );
        let match: ProposalMatch | null;
        if (request) {
          // An open request keeps the proposal it was sent with.
          match = {
            pickup: { lat: request.pickup_lat, lon: request.pickup_lon },
            dropoff: { lat: request.dropoff_lat, lon: request.dropoff_lon },
            driverDepartureMin: localMinutes(new Date(request.driver_departure_at)),
            pickupMin: localMinutes(new Date(request.pickup_at)),
            dropoffMin: localMinutes(new Date(request.dropoff_at)),
            walkMin: request.walk_min,
            detourMin: request.detour_min,
            detourM: request.detour_m,
            score: request.score,
          };
        } else {
          if (load.seatsLeft === 0) return null;
          match = await matchPair(driver, passenger, load.fixedDepartureMin);
          if (!match || zonedInstant(date, match.driverDepartureMin).getTime() <= now) return null;
        }

        const proposal: Proposal = {
          other: { tripId: other.id, userId: other.ownerId, displayName: names.get(other.ownerId) ?? "?", role: other.role },
          match,
          pickupLabel: request?.pickup_label ?? null,
          dropoffLabel: request?.dropoff_label ?? null,
          seatsLeft: load.seatsLeft,
          request: request
            ? {
                id: request.id,
                status: request.status,
                sentByMe: request.sender_id === userId,
                driverDepartureAt: request.driver_departure_at,
              }
            : null,
        };
        return proposal;
      });

      const proposals = pairs
        .filter((p): p is Proposal => p !== null)
        .sort((a, b) => Number(!!b.request) - Number(!!a.request) || b.match.score - a.match.score);
      await Promise.all(
        proposals
          .filter((p) => !p.request)
          .map(async (p) => {
            [p.pickupLabel, p.dropoffLabel] = await Promise.all([pointLabel(p.match.pickup), pointLabel(p.match.dropoff)]);
          }),
      );
      return { trip, seatsLeft: trip.role === "driver" ? loads.get(trip.id)!.seatsLeft : null, proposals };
    }),
  );
}
