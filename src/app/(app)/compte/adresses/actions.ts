"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addressInputSchema, type AddressInput } from "@/lib/addresses/constants";
import { deleteMyAddress, saveMyAddress } from "@/lib/addresses/server";
import { getUserId } from "@/lib/auth/session";
import { refreshRoutesForAddress } from "@/lib/commutes/server";
import { refreshTripDurations } from "@/lib/trips/server";

export type AddressActionResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string>; trips?: number };

const id = z.uuid();
const SIGNED_OUT = { ok: false, error: "Session expirée, reconnecte-toi" } as const;

export async function saveAddressAction(input: AddressInput, addressId?: string): Promise<AddressActionResult> {
  const userId = await getUserId();
  if (!userId) return SIGNED_OUT;
  if (addressId && !id.safeParse(addressId).success) return { ok: false, error: "Adresse introuvable" };
  const parsed = addressInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    if (fieldErrors.place) fieldErrors.place = "Choisis une adresse dans la liste";
    return { ok: false, fieldErrors };
  }

  const result = await saveMyAddress(userId, parsed.data, addressId);
  if (!result.ok) return { ok: false, error: result.error };
  if (addressId) await Promise.all([refreshTripDurations(userId), refreshRoutesForAddress(userId, addressId)]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAddressAction(
  addressId: string,
  options: { reassignTo?: string; deleteTrips?: boolean } = {},
): Promise<AddressActionResult> {
  const userId = await getUserId();
  if (!userId) return SIGNED_OUT;
  if (!id.safeParse(addressId).success || (options.reassignTo && !id.safeParse(options.reassignTo).success))
    return { ok: false, error: "Adresse introuvable" };

  const result = await deleteMyAddress(userId, addressId, {
    reassignTo: options.reassignTo,
    deleteTrips: options.deleteTrips === true,
  });
  if (!result.ok) return { ok: false, error: result.error, trips: result.trips };
  if (options.reassignTo) await refreshTripDurations(userId);
  revalidatePath("/", "layout");
  return { ok: true };
}
