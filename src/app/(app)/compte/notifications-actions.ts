"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserId } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function savePushSubscription(input: unknown): Promise<boolean> {
  const userId = await getUserId();
  const parsed = subscriptionSchema.safeParse(input);
  if (!userId || !parsed.success) return false;
  // The same device may have been registered by another account: it now belongs to this one.
  await createAdminClient().from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: userId,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });
  return !error;
}

export async function removePushSubscription(endpoint: string) {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
}

export async function setNotificationPreference(channel: "push" | "email", enabled: boolean) {
  const userId = await getUserId();
  if (!userId || !["push", "email"].includes(channel)) return;
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update(channel === "push" ? { push_enabled: !!enabled } : { email_enabled: !!enabled })
    .eq("id", userId);
  revalidatePath("/compte");
}
