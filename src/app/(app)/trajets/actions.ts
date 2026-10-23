"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserId } from "@/lib/auth/session";
import { tripSchema, type TripInput } from "@/lib/trips/schema";
import { deleteMyTrip, saveMyTrip, setMyTripActive } from "@/lib/trips/server";

export type TripFormResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

const idSchema = z.uuid();
const SIGNED_OUT = "Session expirée, reconnecte-toi";

export async function saveTrip(input: TripInput, id?: string): Promise<TripFormResult> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: SIGNED_OUT };
  if (id && !idSchema.safeParse(id).success) return { ok: false, error: "Trajet introuvable" };

  const parsed = tripSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, fieldErrors, error: "Corrige les champs signalés" };
  }

  const result = await saveMyTrip(userId, parsed.data, id);
  if (!result.ok)
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.field ? { [result.field]: result.error } : undefined,
    };

  revalidatePath("/trajets", "layout");
  return { ok: true };
}

export async function toggleTrip(id: string, isActive: boolean) {
  const userId = await getUserId();
  if (!userId || !idSchema.safeParse(id).success) return;
  await setMyTripActive(userId, id, isActive);
  revalidatePath("/trajets", "layout");
}

export async function removeTrip(id: string) {
  const userId = await getUserId();
  if (!userId || !idSchema.safeParse(id).success) return;
  await deleteMyTrip(userId, id);
  revalidatePath("/trajets", "layout");
}
