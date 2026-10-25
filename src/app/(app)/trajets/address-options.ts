import "server-only";
import type { AddressOption } from "@/lib/addresses/constants";
import { listMyAddresses } from "@/lib/addresses/server";

/** The user's addresses for the trip form (names only, no location). */
export async function addressOptions(userId: string): Promise<AddressOption[]> {
  return (await listMyAddresses(userId)).map(({ id, name, icon }) => ({ id, name, icon }));
}
