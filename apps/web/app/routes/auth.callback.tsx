import { redirect } from "react-router";
import type { Route } from "./+types/auth.callback";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const { supabase, headers, configured } = createSupabaseServerClient(
    request,
    context,
  );
  if (configured && supabase && code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  return redirect("/practice", { headers });
}

export default function AuthCallback() {
  return null;
}
