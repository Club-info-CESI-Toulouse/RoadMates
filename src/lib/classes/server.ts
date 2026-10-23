import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Existing class names, offered as suggestions so classmates pick the same one. */
export async function listClassNames(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("class_names");
  return data ?? [];
}
