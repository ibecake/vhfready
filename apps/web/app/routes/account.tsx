import { Form } from "react-router";
import type { Route } from "./+types/account";
import { requireUser, jsonWithHeaders } from "~/lib/supabase.server";

export function meta() {
  return [{ title: "Account — VHFReady" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { supabase, user, headers } = await requireUser(request, context);
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name, created_at, disabled_at")
    .eq("id", user.id)
    .single();
  return jsonWithHeaders({ profile, userId: user.id }, { headers });
}

export async function action({ request, context }: Route.ActionArgs) {
  const { supabase, user, headers } = await requireUser(request, context);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "update_name") {
    const display_name = String(form.get("display_name") ?? "").slice(0, 80);
    await supabase
      .from("profiles")
      .update({ display_name })
      .eq("id", user.id);
    return jsonWithHeaders({ updated: true }, { headers });
  }

  if (intent === "delete") {
    // Soft-disable locally; hard auth user deletion requires service role in a secured admin path.
    await supabase
      .from("profiles")
      .update({ disabled_at: new Date().toISOString() })
      .eq("id", user.id);
    await supabase.auth.signOut();
    return jsonWithHeaders(
      {
        deleted: true,
        note: "Profile disabled. Full auth-user deletion is completed by an admin/service job.",
      },
      { headers },
    );
  }

  return jsonWithHeaders({ error: "Unknown intent" }, { status: 400, headers });
}

export default function Account({ loaderData, actionData }: Route.ComponentProps) {
  const profile = loaderData.profile as {
    email: string;
    display_name: string;
    created_at: string;
  } | null;

  return (
    <main className="page">
      <h1>Account</h1>
      <section className="panel stack">
        <p>Email: {profile?.email}</p>
        <p className="muted">Joined: {profile?.created_at}</p>
        <Form method="post" className="form">
          <input type="hidden" name="intent" value="update_name" />
          <label>
            Display name
            <input
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
            />
          </label>
          <button className="btn" type="submit">
            Save
          </button>
        </Form>
        <Form method="post" onSubmit={(e) => {
          if (!confirm("Disable this account?")) e.preventDefault();
        }}>
          <input type="hidden" name="intent" value="delete" />
          <button className="btn btn-secondary" type="submit">
            Disable account
          </button>
        </Form>
        {actionData && "note" in actionData ? (
          <p role="status">{actionData.note}</p>
        ) : null}
      </section>
    </main>
  );
}
