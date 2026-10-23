"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { displayNameSchema } from "@/lib/auth/schema";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/app/(auth)/actions";

export async function updateDisplayName(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = displayNameSchema.safeParse(formData.get("displayName"));
  if (!parsed.success) return { fieldErrors: { displayName: parsed.error.issues[0].message } };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { error: "Session expirée, reconnecte-toi" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", auth.claims.sub);
  if (error) return { error: "Impossible d'enregistrer, réessaie" };

  revalidatePath("/compte");
  return { message: "Pseudo enregistré" };
}

const DELETE_CONFIRMATION = "SUPPRIMER";

/** Deletes the account and all its data. Open rides are cancelled first so partners are told. */
export async function deleteAccount(_: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("confirm") !== DELETE_CONFIRMATION)
    return { fieldErrors: { confirm: `Tape ${DELETE_CONFIRMATION} pour confirmer` } };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return { error: "Session expirée, reconnecte-toi" };

  const admin = createAdminClient();
  await admin
    .from("trip_requests")
    .update({ status: "cancelled", cancel_reason: "cancelled", cancelled_by: userId })
    .or(`driver_id.eq.${userId},passenger_id.eq.${userId}`)
    .in("status", ["pending", "accepted"])
    .gt("dropoff_at", new Date().toISOString());

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: "Suppression impossible pour le moment, réessaie" };
  await supabase.auth.signOut();
  redirect("/connexion");
}
