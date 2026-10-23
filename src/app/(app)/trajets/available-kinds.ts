import "server-only";
import { ADDRESS_KINDS } from "@/lib/addresses/constants";
import { getMyAddresses } from "@/lib/addresses/server";

export async function availableKinds(userId: string) {
  const addresses = await getMyAddresses(userId);
  return ADDRESS_KINDS.filter((kind) => addresses[kind]);
}
