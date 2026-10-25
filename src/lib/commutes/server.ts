import "server-only";
import type { AddressIcon } from "@/lib/addresses/constants";
import { listMyAddresses } from "@/lib/addresses/server";
import { getRoute, RoutingUnavailableError } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { formatDuration, resolveTimes } from "@/lib/trips/times";
import type { Commute, SlotValues } from "./schema";

type Direction = Database["public"]["Enums"]["trip_slot"];
type AddressRef = { id: string; name: string; icon: AddressIcon };

export type SlotView = SlotValues & {
  id: string;
  direction: Direction;
  weekday: number;
  isActive: boolean;
  durationMin: number | null;
  /** Both times, the non-anchor one computed from the estimated duration. */
  departure: string;
  arrival: string | null;
};

export type CommuteView = Commute & {
  id: string;
  isActive: boolean;
  origin: AddressRef;
  destination: AddressRef;
  slots: SlotView[];
};

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string; field?: string };

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);
const UNKNOWN: AddressRef = { id: "", name: "?", icon: "star" };

type SlotRow = Pick<
  Database["public"]["Tables"]["trips"]["Row"],
  | "id"
  | "slot"
  | "weekdays"
  | "departure_time"
  | "arrival_time"
  | "estimated_duration_s"
  | "flex_before_min"
  | "flex_after_min"
  | "valid_from"
  | "valid_until"
  | "is_active"
>;

function toSlotView(row: SlotRow): SlotView {
  const departure = hhmm(row.departure_time);
  const arrival = hhmm(row.arrival_time);
  const resolved = row.estimated_duration_s ? resolveTimes(departure, arrival, row.estimated_duration_s) : null;
  return {
    id: row.id,
    direction: row.slot,
    weekday: row.weekdays[0],
    isActive: row.is_active,
    anchor: departure ? "departure" : "arrival",
    time: (departure ?? arrival)!,
    flexBeforeMin: row.flex_before_min,
    flexAfterMin: row.flex_after_min,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    durationMin: resolved?.durationMin ?? null,
    departure: resolved?.ok ? resolved.departure : (departure ?? arrival)!,
    arrival: resolved?.ok ? resolved.arrival : arrival,
  };
}

const SLOT_COLUMNS =
  "id, slot, weekdays, departure_time, arrival_time, estimated_duration_s, flex_before_min, flex_after_min, valid_from, valid_until, is_active";

export async function listMyCommutes(userId: string): Promise<CommuteView[]> {
  const supabase = await createClient();
  const [{ data: commutes }, { data: addresses }, { data: slots }] = await Promise.all([
    supabase.from("commutes").select("*").eq("owner_id", userId).order("created_at"),
    supabase.from("addresses").select("id, name, icon").eq("user_id", userId),
    supabase.from("trips").select(`commute_id, ${SLOT_COLUMNS}`).eq("owner_id", userId),
  ]);
  const byId = new Map((addresses ?? []).map((a) => [a.id, a]));

  return (commutes ?? []).map((c) => ({
    id: c.id,
    role: c.role,
    seats: c.seats,
    originAddressId: c.origin_address_id,
    destinationAddressId: c.destination_address_id,
    maxWalkMin: c.max_walk_min,
    isActive: c.is_active,
    origin: byId.get(c.origin_address_id) ?? UNKNOWN,
    destination: byId.get(c.destination_address_id) ?? UNKNOWN,
    slots: (slots ?? [])
      .filter((s) => s.commute_id === c.id)
      .map(toSlotView)
      .sort((a, b) => a.direction.localeCompare(b.direction) || a.weekday - b.weekday),
  }));
}

export async function getMyCommute(userId: string, id: string) {
  return (await listMyCommutes(userId)).find((c) => c.id === id) ?? null;
}

export async function saveMyCommute(userId: string, commute: Commute, id?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const addresses = await listMyAddresses(userId);
  if (!addresses.some((a) => a.id === commute.originAddressId))
    return { ok: false, field: "originAddressId", error: "Adresse de départ introuvable" };
  if (!addresses.some((a) => a.id === commute.destinationAddressId))
    return { ok: false, field: "destinationAddressId", error: "Adresse d'arrivée introuvable" };
  const { data: profile } = await supabase.from("profiles").select("group_id").eq("id", userId).single();
  if (!profile?.group_id) return { ok: false, error: "Ton compte n'est rattaché à aucune classe" };

  const row = {
    owner_id: userId,
    group_id: profile.group_id,
    role: commute.role,
    seats: commute.role === "driver" ? commute.seats : null,
    origin_address_id: commute.originAddressId,
    destination_address_id: commute.destinationAddressId,
    max_walk_min: commute.maxWalkMin,
  };
  const { data, error } = id
    ? await supabase.from("commutes").update(row).eq("id", id).eq("owner_id", userId).select("id").single()
    : await supabase.from("commutes").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: "Impossible d'enregistrer le trajet, réessaie" };
  if (id) await refreshDurations(userId, id);
  return { ok: true, id: data.id };
}

/** Free-flow driving duration of one direction of a commute. */
async function directionDuration(userId: string, commute: { originAddressId: string; destinationAddressId: string }, direction: Direction) {
  const addresses = await listMyAddresses(userId);
  const a = addresses.find((x) => x.id === commute.originAddressId);
  const b = addresses.find((x) => x.id === commute.destinationAddressId);
  if (!a || !b) throw new RoutingUnavailableError("address missing");
  const [from, to] = direction === "morning" ? [a, b] : [b, a];
  return (await getRoute("driving", from, to)).durationS;
}

async function refreshDurations(userId: string, commuteId: string) {
  const commute = await getMyCommute(userId, commuteId);
  if (!commute) return;
  const supabase = await createClient();
  for (const direction of ["morning", "evening"] as const) {
    try {
      const durationS = await directionDuration(userId, commute, direction);
      await supabase.from("trips").update({ estimated_duration_s: durationS }).eq("commute_id", commuteId).eq("slot", direction);
    } catch {}
  }
}

/**
 * Writes the same values to every given day of one direction: missing days are
 * created, existing ones overwritten (the UI confirms that first).
 */
export async function saveMySlots(
  userId: string,
  commuteId: string,
  direction: Direction,
  days: number[],
  values: SlotValues,
): Promise<ActionResult> {
  const commute = await getMyCommute(userId, commuteId);
  if (!commute) return { ok: false, error: "Trajet introuvable" };

  let durationS: number;
  try {
    durationS = await directionDuration(userId, commute, direction);
  } catch (e) {
    if (e instanceof RoutingUnavailableError)
      return { ok: false, error: "Calcul d'itinéraire indisponible pour le moment, réessaie plus tard" };
    throw e;
  }

  const departure = values.anchor === "departure" ? values.time : null;
  const arrival = values.anchor === "arrival" ? values.time : null;
  const times = resolveTimes(departure, arrival, durationS);
  if (!times.ok) {
    const duration = formatDuration(times.durationMin);
    return {
      ok: false,
      field: "time",
      error:
        times.reason === "out_of_day"
          ? `Avec une durée estimée de ${duration}, le trajet sortirait de la journée`
          : `Horaire impossible : le trajet dure environ ${duration} (estimation hors trafic)`,
    };
  }

  const supabase = await createClient();
  const { data: owner } = await supabase.from("commutes").select("group_id").eq("id", commuteId).single();
  if (!owner) return { ok: false, error: "Trajet introuvable" };
  const fields = {
    departure_time: departure,
    arrival_time: arrival,
    estimated_duration_s: durationS,
    flex_before_min: values.flexBeforeMin,
    flex_after_min: values.flexAfterMin,
    valid_from: values.validFrom,
    valid_until: values.validUntil,
    is_active: commute.isActive,
  };
  const existing = new Map(commute.slots.filter((s) => s.direction === direction).map((s) => [s.weekday, s.id]));
  // Copied from the commute by a trigger; required by the generated types.
  const inherited = {
    owner_id: userId,
    group_id: owner.group_id,
    role: commute.role,
    origin_address_id: commute.originAddressId,
    destination_address_id: commute.destinationAddressId,
  };

  const results = await Promise.all(
    days.map((day) => {
      const id = existing.get(day);
      return id
        ? supabase.from("trips").update(fields).eq("id", id).eq("owner_id", userId)
        : supabase.from("trips").insert({ ...inherited, ...fields, commute_id: commuteId, slot: direction, weekdays: [day] });
    }),
  );
  if (results.some((r) => r.error)) return { ok: false, error: "Certains jours n'ont pas pu être enregistrés, réessaie" };
  return { ok: true };
}

export async function deleteMySlot(userId: string, slotId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("trips").delete().eq("id", slotId).eq("owner_id", userId);
  return !error;
}

export async function deleteMyCommute(userId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("commutes").delete().eq("id", id).eq("owner_id", userId);
  return !error;
}

export async function setMyCommuteActive(userId: string, id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("commutes").update({ is_active: isActive }).eq("id", id).eq("owner_id", userId);
  return !error;
}
