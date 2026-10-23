import "server-only";
import { decrypt, encrypt } from "@/lib/crypto/address";
import type { Place } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";
import type { AddressKind } from "./constants";

export type MyAddress = Place & { kind: AddressKind; isDefault: boolean };

// The signed-in user's addresses, decrypted server-side. The school falls back to
// the establishment address (public data) when no custom one is saved.
export async function getMyAddresses(userId: string): Promise<Partial<Record<AddressKind, MyAddress>>> {
  const supabase = await createClient();
  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("addresses")
      .select("kind, payload_encrypted")
      .eq("user_id", userId)
      .in("kind", ["home", "work", "school"]),
    supabase
      .from("profiles")
      .select("groups (establishments (name, address, latitude, longitude))")
      .eq("id", userId)
      .single(),
  ]);

  const result: Partial<Record<AddressKind, MyAddress>> = {};
  for (const row of rows ?? []) {
    const kind = row.kind as AddressKind;
    result[kind] = { ...decrypt<Place>(row.payload_encrypted), kind, isDefault: false };
  }

  const school = profile?.groups?.establishments;
  if (!result.school && school?.address && school.latitude != null && school.longitude != null) {
    result.school = {
      kind: "school",
      label: `${school.name} · ${school.address}`,
      lat: school.latitude,
      lon: school.longitude,
      isDefault: true,
    };
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

  const { error } = existing
    ? await supabase.from("addresses").update({ payload_encrypted }).eq("id", existing.id)
    : await supabase.from("addresses").insert({ user_id: userId, kind, payload_encrypted });
  return !error;
}

export async function deleteMyAddress(userId: string, kind: AddressKind) {
  const supabase = await createClient();
  const { error } = await supabase.from("addresses").delete().eq("user_id", userId).eq("kind", kind);
  return !error;
}
