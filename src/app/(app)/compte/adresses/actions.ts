"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ADDRESS_KINDS, type AddressKind } from "@/lib/addresses/constants";
import { deleteMyAddress, saveMyAddress } from "@/lib/addresses/server";
import { getUserId } from "@/lib/auth/session";
import { refreshTripDurations } from "@/lib/trips/server";
import { placeSchema, type Place } from "@/lib/geo/types";

type Result = { ok: boolean; error?: string };
const kindSchema = z.enum(ADDRESS_KINDS);

export async function saveAddress(kind: AddressKind, place: Place): Promise<Result> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Session expirée, reconnecte-toi" };
  const k = kindSchema.safeParse(kind);
  const p = placeSchema.safeParse(place);
  if (!k.success || !p.success) return { ok: false, error: "Adresse invalide" };

  if (!(await saveMyAddress(userId, k.data, p.data)))
    return { ok: false, error: "Impossible d'enregistrer, réessaie" };
  await refreshTripDurations(userId);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resetAddress(kind: AddressKind): Promise<Result> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Session expirée, reconnecte-toi" };
  const k = kindSchema.safeParse(kind);
  if (!k.success) return { ok: false, error: "Adresse invalide" };

  if (!(await deleteMyAddress(userId, k.data)))
    return { ok: false, error: "Adresse utilisée par un trajet : modifie-la ou supprime d'abord le trajet" };
  await refreshTripDurations(userId);
  revalidatePath("/", "layout");
  return { ok: true };
}
