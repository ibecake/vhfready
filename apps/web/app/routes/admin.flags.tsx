import { Form } from "react-router";
import type { Route } from "./+types/admin.flags";
import { requireAdmin, jsonWithHeaders } from "~/lib/supabase.server";

export function meta() {
  return [{ title: "Content flags — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { supabase, headers } = await requireAdmin(request, context);
  const { data } = await supabase
    .from("content_flags")
    .select(
      "id, content_type, content_id, category, comment, status, created_at, reporter_id",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  return jsonWithHeaders({ flags: data ?? [] }, { headers });
}

export async function action({ request, context }: Route.ActionArgs) {
  const { supabase, user, headers } = await requireAdmin(request, context);
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  const { data: existing } = await supabase
    .from("content_flags")
    .select("status")
    .eq("id", id)
    .single();
  await supabase.from("content_flags").update({ status }).eq("id", id);
  await supabase.from("content_flag_events").insert({
    flag_id: id,
    actor_id: user.id,
    from_status: existing?.status ?? null,
    to_status: status,
  });
  return jsonWithHeaders({ ok: true }, { headers });
}

export default function AdminFlags({ loaderData }: Route.ComponentProps) {
  return (
    <main className="page">
      <h1>Content flags</h1>
      <p className="muted">
        Flags never automatically change educational content.
      </p>
      <div className="table-wrap panel">
        <table>
          <thead>
            <tr>
              <th>Created</th>
              <th>Type</th>
              <th>Category</th>
              <th>Status</th>
              <th>Update</th>
            </tr>
          </thead>
          <tbody>
            {(loaderData.flags as Array<{
              id: string;
              created_at: string;
              content_type: string;
              category: string;
              status: string;
              comment: string | null;
            }>).map((f) => (
              <tr key={f.id}>
                <td>{new Date(f.created_at).toLocaleString()}</td>
                <td>{f.content_type}</td>
                <td>
                  {f.category}
                  {f.comment ? <div className="muted">{f.comment}</div> : null}
                </td>
                <td>{f.status}</td>
                <td>
                  <Form method="post" className="cta-row">
                    <input type="hidden" name="id" value={f.id} />
                    <select name="status" defaultValue={f.status}>
                      <option value="open">Open</option>
                      <option value="under_review">Under Review</option>
                      <option value="resolved_no_change">
                        Resolved - No Change
                      </option>
                      <option value="resolved_source_update_required">
                        Resolved - Source Update Required
                      </option>
                      <option value="disabled">Disabled</option>
                    </select>
                    <button className="btn btn-secondary" type="submit">
                      Save
                    </button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
