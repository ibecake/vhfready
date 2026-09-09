import { Form } from "react-router";
import type { Route } from "./+types/admin.questions";
import { requireAdmin, jsonWithHeaders } from "~/lib/supabase.server";

export function meta() {
  return [{ title: "Questions — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { supabase, headers } = await requireAdmin(request, context);
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  let query = supabase
    .from("questions")
    .select(
      "id, section, subsection, question_text, source, active, quarantine, content_hash, import_batch_id, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(50);
  if (q) query = query.ilike("question_text", `%${q}%`);
  const { data } = await query;
  return jsonWithHeaders({ questions: data ?? [], q }, { headers });
}

export async function action({ request, context }: Route.ActionArgs) {
  const { supabase, user, headers } = await requireAdmin(request, context);
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const active = form.get("active") === "true";
  await supabase.from("questions").update({ active }).eq("id", id);
  await supabase.from("content_reviews").upsert({
    content_type: "question",
    content_id: id,
    review_status: active ? "reviewed_ok" : "disabled",
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    review_notes: active ? "Activated by admin" : "Deactivated by admin",
  });
  return jsonWithHeaders({ ok: true }, { headers });
}

export default function AdminQuestions({ loaderData }: Route.ComponentProps) {
  return (
    <main className="page">
      <h1>Questions</h1>
      <p className="muted">
        Inspect and activate/deactivate only. Canonical text is not editable
        here.
      </p>
      <Form method="get" className="form panel" style={{ maxWidth: "100%" }}>
        <label>
          Search question text
          <input name="q" defaultValue={loaderData.q} />
        </label>
        <button className="btn" type="submit">
          Search
        </button>
      </Form>
      <div className="table-wrap panel">
        <table>
          <thead>
            <tr>
              <th>Question</th>
              <th>Meta</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {(loaderData.questions as Array<{
              id: string;
              question_text: string;
              section: string;
              subsection: string;
              source: string;
              active: boolean;
              content_hash: string;
            }>).map((row) => (
              <tr key={row.id}>
                <td>{row.question_text}</td>
                <td>
                  <div>{row.section}</div>
                  <div className="muted">{row.subsection}</div>
                  <div className="muted">{row.source}</div>
                  <div className="muted">hash {row.content_hash.slice(0, 12)}</div>
                </td>
                <td>
                  <Form method="post">
                    <input type="hidden" name="id" value={row.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={row.active ? "false" : "true"}
                    />
                    <button className="btn btn-secondary" type="submit">
                      {row.active ? "Disable" : "Enable"}
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
