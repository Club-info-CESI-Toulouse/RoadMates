import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Classes users can pick. They are created by hand in the database. */
export async function listClassNames(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("class_names");
  return data ?? [];
}
