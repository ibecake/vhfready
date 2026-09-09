import { Form, redirect } from "react-router";
import type { Route } from "./+types/login";
import { createSupabaseServerClient, jsonWithHeaders } from "~/lib/supabase.server";

export function meta() {
  return [{ title: "Log in — VHFReady" }];
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const { supabase, headers, configured } = createSupabaseServerClient(
    request,
    context,
  );
  if (!configured || !supabase) {
    return jsonWithHeaders(
      { error: "Supabase is not configured" },
      { status: 503, headers },
    );
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return jsonWithHeaders({ error: error.message }, { status: 400, headers });
  }
  return redirect("/practice", { headers });
}

export default function Login({ actionData }: Route.ComponentProps) {
  return (
    <main className="page">
      <h1>Log in</h1>
      <p className="muted">Email and password via Supabase Auth.</p>
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
            autoComplete="current-password"
            required
          />
        </label>
        {actionData && "error" in actionData ? (
          <p className="status-bad" role="alert">
            {actionData.error}
          </p>
        ) : null}
        <button className="btn" type="submit">
          Log in
        </button>
      </Form>
    </main>
  );
}
