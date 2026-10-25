import "server-only";
import { decrypt, encrypt } from "@/lib/crypto/address";
import type { Place } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";
import type { AddressIcon, AddressInput } from "./constants";

export type MyAddress = Place & { id: string; name: string; icon: AddressIcon; confirmed: boolean };

async function getCampus(userId: string): Promise<Place | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("groups (establishments (address, latitude, longitude))")
    .eq("id", userId)
    .single();
  const school = data?.groups?.establishments;
  if (!school?.address || school.latitude == null || school.longitude == null) return null;
  return { label: school.address, lat: school.latitude, lon: school.longitude };
}

/** Creates the default "CESI" address (campus, to confirm) once per account. */
async function seedDefaultAddress(userId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("default_address_seeded").eq("id", userId).single();
  if (!profile || profile.default_address_seeded) return;
  const campus = await getCampus(userId);
  if (campus)
    await supabase.from("addresses").insert({
      user_id: userId,
      name: "CESI",
      icon: "star",
      confirmed: false,
      payload_encrypted: encrypt<Place>(campus),
    });
  await supabase.from("profiles").update({ default_address_seeded: true }).eq("id", userId);
}

// The signed-in user's addresses, decrypted server-side, oldest first.
export async function listMyAddresses(userId: string): Promise<MyAddress[]> {
  await seedDefaultAddress(userId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("addresses")
    .select("id, name, icon, confirmed, payload_encrypted")
    .eq("user_id", userId)
    .order("created_at");
  return (data ?? []).map((row) => ({
    ...decrypt<Place>(row.payload_encrypted),
    id: row.id,
    name: row.name,
    icon: row.icon,
    confirmed: row.confirmed,
  }));
}

export async function getMyAddress(userId: string, id: string): Promise<MyAddress | null> {
  return (await listMyAddresses(userId)).find((a) => a.id === id) ?? null;
}

export type SaveAddressResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveMyAddress(userId: string, input: AddressInput, id?: string): Promise<SaveAddressResult> {
  const supabase = await createClient();
  const row = {
    name: input.name,
    icon: input.icon,
    confirmed: true,
    payload_encrypted: encrypt<Place>(input.place),
  };
  const { data, error } = id
    ? await supabase.from("addresses").update(row).eq("id", id).eq("user_id", userId).select("id").single()
    : await supabase.from("addresses").insert({ ...row, user_id: userId }).select("id").single();
  if (error?.message.includes("address_limit"))
    return { ok: false, error: "Tu as déjà 10 adresses : supprimes-en une d'abord" };
  if (error || !data) return { ok: false, error: "Impossible d'enregistrer, réessaie" };
  return { ok: true, id: data.id };
}

/** Number of the user's trips using this address. */
export async function countTripsUsing(userId: string, id: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("trips")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .or(`origin_address_id.eq.${id},destination_address_id.eq.${id}`);
  return count ?? 0;
}

/**
 * Deletes an address. Trips using it are moved to `reassignTo`, or deleted when
 * `deleteTrips` is set; otherwise nothing happens and the trip count is returned.
 */
export async function deleteMyAddress(
  userId: string,
  id: string,
  options: { reassignTo?: string; deleteTrips?: boolean } = {},
): Promise<{ ok: true } | { ok: false; trips?: number; error?: string }> {
  const supabase = await createClient();
  const trips = await countTripsUsing(userId, id);
  if (trips > 0) {
    if (options.reassignTo && options.reassignTo !== id) {
      const target = await getMyAddress(userId, options.reassignTo);
      if (!target) return { ok: false, error: "Adresse de remplacement introuvable" };
      // A trip would go from the target to itself: it can't exist any more.
      await supabase
        .from("trips")
        .delete()
        .eq("owner_id", userId)
        .or(
          `and(origin_address_id.eq.${id},destination_address_id.eq.${target.id}),and(origin_address_id.eq.${target.id},destination_address_id.eq.${id})`,
        );
      await supabase.from("trips").update({ origin_address_id: target.id }).eq("owner_id", userId).eq("origin_address_id", id);
      await supabase.from("trips").update({ destination_address_id: target.id }).eq("owner_id", userId).eq("destination_address_id", id);
    } else if (options.deleteTrips) {
      await supabase.from("trips").delete().eq("owner_id", userId).or(`origin_address_id.eq.${id},destination_address_id.eq.${id}`);
    } else {
      return { ok: false, trips };
    }
  }
  const { error } = await supabase.from("addresses").delete().eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: "Suppression impossible, réessaie" } : { ok: true };
}
