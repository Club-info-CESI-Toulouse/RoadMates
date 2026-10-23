import "server-only";
import { decrypt, encrypt } from "@/lib/crypto/address";
import type { Place } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";
import type { AddressKind } from "./constants";

export type MyAddress = Place & { kind: AddressKind; isDefault: boolean; id: string | null };

const samePoint = (a: Place, b: Place) =>
  Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lon - b.lon) < 1e-6;

async function getCampus(userId: string): Promise<Place | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("groups (establishments (name, address, latitude, longitude))")
    .eq("id", userId)
    .single();
  const school = data?.groups?.establishments;
  if (!school?.address || school.latitude == null || school.longitude == null) return null;
  return { label: `${school.name} · ${school.address}`, lat: school.latitude, lon: school.longitude };
}

// The signed-in user's addresses, decrypted server-side. The school falls back to
// the establishment address (public data) when no custom one is saved.
export async function getMyAddresses(
  userId: string,
): Promise<Partial<Record<AddressKind, MyAddress>>> {
  const supabase = await createClient();
  const [{ data: rows }, campus] = await Promise.all([
    supabase
      .from("addresses")
      .select("id, kind, payload_encrypted")
      .eq("user_id", userId)
      .in("kind", ["home", "work", "school"]),
    getCampus(userId),
  ]);

  const result: Partial<Record<AddressKind, MyAddress>> = {};
  for (const row of rows ?? []) {
    const kind = row.kind as AddressKind;
    const place = decrypt<Place>(row.payload_encrypted);
    const isDefault = kind === "school" && !!campus && samePoint(place, campus);
    result[kind] = { ...place, kind, isDefault, id: row.id };
  }
  if (!result.school && campus) {
    result.school = { ...campus, kind: "school", isDefault: true, id: null };
  }
  return result;
}

export async function saveMyAddress(userId: string, kind: AddressKind, place: Place) {
  const supabase = await createClient();
  const payload_encrypted = encrypt<Place>(place);
  const { data: existing } = await supabase
    .from("addresses")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .maybeSingle();

  const { data, error } = existing
    ? await supabase
        .from("addresses")
        .update({ payload_encrypted })
        .eq("id", existing.id)
        .select("id")
        .single()
    : await supabase
        .from("addresses")
        .insert({ user_id: userId, kind, payload_encrypted })
        .select("id")
        .single();
  return error ? null : data.id;
}

/** Ensures the address exists as a row (default campus is materialized) and returns its id. */
export async function ensureAddressRow(userId: string, address: MyAddress) {
  return address.id ?? saveMyAddress(userId, address.kind, address);
}

export async function deleteMyAddress(userId: string, kind: AddressKind) {
  const supabase = await createClient();
  const { error } = await supabase.from("addresses").delete().eq("user_id", userId).eq("kind", kind);
  if (!error) return true;

  // Still used by a trip: the school can fall back to the campus in place.
  const campus = kind === "school" ? await getCampus(userId) : null;
  return campus ? (await saveMyAddress(userId, kind, campus)) !== null : false;
}
