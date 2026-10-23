"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function openConversation(otherUserId: string): Promise<{ error: string }> {
  if (!(await getUserId())) return { error: "Session expirée, reconnecte-toi" };
  if (!z.uuid().safeParse(otherUserId).success) return { error: "Destinataire invalide" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_or_create_conversation", { p_other: otherUserId });
  if (error || !data) return { error: "Impossible d'ouvrir la conversation" };
  redirect(`/messagerie/${data}`);
}
