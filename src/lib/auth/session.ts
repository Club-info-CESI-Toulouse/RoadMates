import "server-only";
import { createClient } from "@/lib/supabase/server";

// Signed-in user id from the verified JWT, or null.
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}
