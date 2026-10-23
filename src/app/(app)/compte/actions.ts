"use server";

import { revalidatePath } from "next/cache";
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
