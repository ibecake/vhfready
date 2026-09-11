import { Form, redirect } from "react-router";
import type { Route } from "./+types/signup";
import { createSupabaseServerClient, jsonWithHeaders } from "~/lib/supabase.server";

export function meta() {
  return [{ title: "Sign up — VHFReady" }];
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const { supabase, headers, configured, supabaseUrlHost } =
    createSupabaseServerClient(request, context);
  if (!configured || !supabase) {
    return jsonWithHeaders(
      { error: "Supabase is not configured. Check apps/web/.dev.vars" },
      { status: 503, headers },
    );
  }
  const origin = new URL(request.url).origin;
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      const detail =
        error.message.toLowerCase().includes("fetch")
          ? `Cannot reach Supabase at ${supabaseUrlHost}. Check SUPABASE_URL / SUPABASE_ANON_KEY in apps/web/.dev.vars (no quotes), then restart npm run dev.`
          : error.message;
      return jsonWithHeaders({ error: detail }, { status: 400, headers });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signup failed";
    return jsonWithHeaders(
      {
        error: `${message} (host: ${supabaseUrlHost ?? "unknown"}). Check .dev.vars and restart the dev server.`,
      },
      { status: 400, headers },
    );
  }
  return redirect("/login?verify=1", { headers });
}

export default function Signup({ actionData }: Route.ComponentProps) {
  return (
    <main className="page">
      <h1>Create account</h1>
      <p className="muted">
        Use your email. Verify before studying so progress syncs across devices.
      </p>
      <Form method="post" className="form panel">
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        {actionData && "error" in actionData ? (
          <p className="status-bad" role="alert">
            {actionData.error}
          </p>
        ) : null}
        <button className="btn" type="submit">
          Sign up
        </button>
      </Form>
    </main>
  );
}
