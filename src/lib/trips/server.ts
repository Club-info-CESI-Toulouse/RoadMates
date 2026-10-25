import "server-only";
import { listMyAddresses } from "@/lib/addresses/server";
import { getRoute, type LatLon } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";

async function drivingDuration(from: LatLon, to: LatLon) {
  return (await getRoute("driving", from, to)).durationS;
}

/** Re-estimates durations of trips using an address that just changed. Best effort. */
export async function refreshTripDurations(userId: string) {
  const supabase = await createClient();
  const [{ data: trips }, addresses] = await Promise.all([
    supabase.from("trips").select("id, origin_address_id, destination_address_id").eq("owner_id", userId),
    listMyAddresses(userId),
  ]);
  const byId = new Map(addresses.map((a) => [a.id, a]));

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
