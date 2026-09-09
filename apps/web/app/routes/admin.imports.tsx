import type { Route } from "./+types/admin.imports";
import { requireAdmin, jsonWithHeaders } from "~/lib/supabase.server";

export function meta() {
  return [{ title: "Imports — Admin" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { supabase, headers } = await requireAdmin(request, context);
  const { data: imports } = await supabase
    .from("imports")
    .select(
      "id, source_filename, content_type, dry_run, started_at, completed_at, imported_count, rejected_count, warning_count, duplicate_count, error_count, notes",
    )
    .order("started_at", { ascending: false })
    .limit(50);
  const { data: errors } = await supabase
    .from("import_errors")
    .select("id, import_id, severity, code, message, record_index, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return jsonWithHeaders({ imports: imports ?? [], errors: errors ?? [] }, { headers });
}

export default function AdminImports({ loaderData }: Route.ComponentProps) {
  return (
    <main className="page">
      <h1>Imports</h1>
      <p className="muted">
        Run imports via CLI (`npm run import:content -- --apply`) with the
        service role key — never from the browser.
      </p>
      <div className="table-wrap panel">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Files</th>
              <th>Imported</th>
              <th>Rejected</th>
              <th>Warnings</th>
              <th>Errors</th>
            </tr>
          </thead>
          <tbody>
            {(loaderData.imports as Array<{
              id: string;
              started_at: string;
              source_filename: string;
              imported_count: number;
              rejected_count: number;
              warning_count: number;
              error_count: number;
            }>).map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.started_at).toLocaleString()}</td>
                <td>{row.source_filename}</td>
                <td>{row.imported_count}</td>
                <td>{row.rejected_count}</td>
                <td>{row.warning_count}</td>
                <td>{row.error_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Recent import messages</h2>
      <div className="table-wrap panel">
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Code</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {(loaderData.errors as Array<{
              id: string;
              severity: string;
              code: string;
              message: string;
            }>).map((e) => (
              <tr key={e.id}>
                <td>{e.severity}</td>
                <td>{e.code}</td>
                <td>{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
