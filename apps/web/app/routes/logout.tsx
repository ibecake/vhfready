import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { supabase, headers, configured } = createSupabaseServerClient(
    request,
    context,
  );
  if (configured && supabase) {
    await supabase.auth.signOut();
  }
  return redirect("/", { headers });
}

export default function Logout() {
  return null;
}
