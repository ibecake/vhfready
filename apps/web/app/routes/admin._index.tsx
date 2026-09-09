import { Link } from "react-router";
import type { Route } from "./+types/admin._index";
import { requireAdmin, jsonWithHeaders } from "~/lib/supabase.server";

export function meta() {
  return [{ title: "Admin — VHFReady" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { supabase, headers } = await requireAdmin(request, context);
  const [
    { count: users },
    { count: questions },
    { count: flags },
    { count: imports },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("questions").select("*", { count: "exact", head: true }),
    supabase
      .from("content_flags")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    supabase.from("imports").select("*", { count: "exact", head: true }),
  ]);
  return jsonWithHeaders(
    {
      users: users ?? 0,
      questions: questions ?? 0,
      openFlags: flags ?? 0,
      imports: imports ?? 0,
    },
    { headers },
  );
}

export default function AdminHome({ loaderData }: Route.ComponentProps) {
  return (
    <main className="page">
      <h1>Admin</h1>
      <div className="stack">
        <section className="panel">
          <p>Users: {loaderData.users}</p>
          <p>Questions: {loaderData.questions}</p>
          <p>Open content flags: {loaderData.openFlags}</p>
          <p>Import batches: {loaderData.imports}</p>
        </section>
        <nav className="cta-row">
          <Link className="btn" to="/admin/questions">
            Questions
          </Link>
          <Link className="btn btn-secondary" to="/admin/flags">
            Content flags
          </Link>
          <Link className="btn btn-secondary" to="/admin/imports">
            Imports
          </Link>
        </nav>
      </div>
    </main>
  );
}
