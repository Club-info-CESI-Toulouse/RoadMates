import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentProfile = {
  id: string;
  email: string;
  displayName: string;
  groupName: string | null;
};

// Data access layer: the signed-in user's own profile. Redirects when signed out.
export async function getCurrentProfile(): Promise<CurrentProfile> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, groups (name)")
    .eq("id", claims.sub)
    .single();
  if (!profile) redirect("/connexion");

  return {
    id: profile.id,
    email: claims.email ?? "",
    displayName: profile.display_name,
    groupName: profile.groups?.name ?? null,
  };
}
