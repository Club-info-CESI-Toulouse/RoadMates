import "server-only";
import { ADDRESS_LABELS, type AddressKind } from "@/lib/addresses/constants";
import { ensureAddressRow, getMyAddresses } from "@/lib/addresses/server";
import { getRoute, RoutingUnavailableError, type LatLon } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Trip } from "./schema";
import { formatDuration, resolveTimes } from "./times";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];

export type TripView = Trip & {
  id: string;
  durationMin: number | null;
  /** Departure/arrival with the missing one computed from the duration. */
  shownDeparture: string | null;
  shownArrival: string | null;
};

export type SaveResult = { ok: true; id: string } | { ok: false; error: string; field?: string };

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

function toView(row: TripRow, kinds: Map<string, AddressKind>): TripView {
  const departureTime = hhmm(row.departure_time);
  const arrivalTime = hhmm(row.arrival_time);
  const resolved = row.estimated_duration_s
    ? resolveTimes(departureTime, arrivalTime, row.estimated_duration_s)
    : null;
  return {
    id: row.id,
    role: row.role,
    seats: row.seats,
    slot: row.slot,
    originKind: kinds.get(row.origin_address_id) ?? "home",
    destinationKind: kinds.get(row.destination_address_id) ?? "school",
    weekdays: [...row.weekdays].sort(),
    departureTime,
    arrivalTime,
    flexBeforeMin: row.flex_before_min,
    flexAfterMin: row.flex_after_min,
    maxWalkMin: row.max_walk_min,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    isActive: row.is_active,
    durationMin: resolved?.durationMin ?? null,
    shownDeparture: resolved?.ok ? resolved.departure : departureTime,
    shownArrival: resolved?.ok ? resolved.arrival : arrivalTime,
  };
}

async function addressKinds(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("addresses").select("id, kind").eq("user_id", userId);
  return new Map((data ?? []).map((a) => [a.id, a.kind as AddressKind]));
}

export async function listMyTrips(userId: string): Promise<TripView[]> {
  const supabase = await createClient();
  const [{ data }, kinds] = await Promise.all([
    supabase
      .from("trips")
      .select("*")
      .eq("owner_id", userId)
      .order("slot")
      .order("created_at"),
    addressKinds(userId),
  ]);
  return (data ?? []).map((row) => toView(row, kinds));
}

export async function getMyTrip(userId: string, id: string): Promise<TripView | null> {
  const supabase = await createClient();
  const [{ data }, kinds] = await Promise.all([
    supabase.from("trips").select("*").eq("owner_id", userId).eq("id", id).maybeSingle(),
    addressKinds(userId),
  ]);
  return data ? toView(data, kinds) : null;
}

async function drivingDuration(from: LatLon, to: LatLon) {
  return (await getRoute("driving", from, to)).durationS;
}

export async function saveMyTrip(userId: string, trip: Trip, id?: string): Promise<SaveResult> {
  const supabase = await createClient();
  const addresses = await getMyAddresses(userId);
  const origin = addresses[trip.originKind];
  const destination = addresses[trip.destinationKind];
  if (!origin)
    return { ok: false, field: "originKind", error: `Renseigne d'abord ton adresse « ${ADDRESS_LABELS[trip.originKind]} » dans Compte` };
  if (!destination)
    return { ok: false, field: "destinationKind", error: `Renseigne d'abord ton adresse « ${ADDRESS_LABELS[trip.destinationKind]} » dans Compte` };

  let durationS: number;
  try {
    durationS = await drivingDuration(origin, destination);
  } catch (e) {
    if (e instanceof RoutingUnavailableError)
      return { ok: false, error: "Calcul d'itinéraire indisponible pour le moment, réessaie plus tard" };
    throw e;
  }

  const times = resolveTimes(trip.departureTime, trip.arrivalTime, durationS);
  if (!times.ok) {
    const duration = formatDuration(times.durationMin);
    const error = {
      missing: "Indique une heure de départ ou d'arrivée",
      too_short: `Arrivée trop proche du départ : le trajet dure environ ${duration} (estimation hors trafic). Décale l'une des deux heures ou n'en indique qu'une.`,
      out_of_day: `Avec une durée estimée de ${duration}, le trajet sortirait de la journée`,
    }[times.reason];
    return { ok: false, field: "arrivalTime", error };
  }

  const [originId, destinationId, { data: profile }] = await Promise.all([
    ensureAddressRow(userId, origin),
    ensureAddressRow(userId, destination),
    supabase.from("profiles").select("group_id").eq("id", userId).single(),
  ]);
  if (!originId || !destinationId) return { ok: false, error: "Adresse introuvable, réessaie" };
  if (!profile?.group_id) return { ok: false, error: "Ton compte n'est rattaché à aucune classe" };

  const row = {
    owner_id: userId,
    group_id: profile.group_id,
    role: trip.role,
    seats: trip.role === "driver" ? trip.seats : null,
    slot: trip.slot,
    origin_address_id: originId,
    destination_address_id: destinationId,
    weekdays: trip.weekdays,
    departure_time: trip.departureTime,
    arrival_time: trip.arrivalTime,
    estimated_duration_s: durationS,
    flex_before_min: trip.flexBeforeMin,
    flex_after_min: trip.flexAfterMin,
    max_walk_min: trip.maxWalkMin,
    valid_from: trip.validFrom,
    valid_until: trip.validUntil,
    is_active: trip.isActive,
  };

  const { data, error } = id
    ? await supabase.from("trips").update(row).eq("id", id).eq("owner_id", userId).select("id").single()
    : await supabase.from("trips").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: "Impossible d'enregistrer le trajet, réessaie" };
  return { ok: true, id: data.id };
}

export async function setMyTripActive(userId: string, id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("trips")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("owner_id", userId);
  return !error;
}

export async function deleteMyTrip(userId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("trips").delete().eq("id", id).eq("owner_id", userId);
  return !error;
}

/** Re-estimates durations of trips using an address that just changed. Best effort. */
export async function refreshTripDurations(userId: string) {
  const supabase = await createClient();
  const [{ data: trips }, addresses] = await Promise.all([
    supabase.from("trips").select("id, origin_address_id, destination_address_id").eq("owner_id", userId),
    getMyAddresses(userId),
  ]);
  const byId = new Map(Object.values(addresses).flatMap((a) => (a?.id ? [[a.id, a] as const] : [])));

  await Promise.all(
    (trips ?? []).map(async (t) => {
      const from = byId.get(t.origin_address_id);
      const to = byId.get(t.destination_address_id);
      if (!from || !to) return;
      try {
        const durationS = await drivingDuration(from, to);
        await supabase.from("trips").update({ estimated_duration_s: durationS }).eq("id", t.id);
      } catch {}
    }),
  );
}
