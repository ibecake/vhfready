import { Link } from "react-router";
import type { Route } from "./+types/mocks";
import { requireUser, jsonWithHeaders } from "~/lib/supabase.server";

export function meta() {
  return [{ title: "Mock exams — VHFReady" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { supabase, headers } = await requireUser(request, context);
  const { data, error } = await supabase
    .from("mock_exams")
    .select("id, title, pass_mark_text, total_questions, time_limit_seconds")
    .eq("active", true)
    .eq("quarantine", false)
    .order("title");
  return jsonWithHeaders({ exams: data ?? [], error: error?.message }, { headers });
}

export default function Mocks({ loaderData }: Route.ComponentProps) {
  return (
    <main className="page">
      <h1>Mock exams</h1>
      <p className="muted">
        Only predefined papers from supplied JSON. Pass marks shown exactly as
        provided — no invented time limits.
      </p>
      <div className="stack">
        {(loaderData.exams as Array<{
          id: string;
          title: string;
          pass_mark_text: string;
          total_questions: number;
          time_limit_seconds: number | null;
        }>).map((exam) => (
          <article key={exam.id} className="panel">
            <h2 style={{ fontSize: "1.2rem" }}>{exam.title}</h2>
            <p className="muted">
              {exam.total_questions} questions · Pass mark: {exam.pass_mark_text}
              {exam.time_limit_seconds
                ? ` · Time limit: ${exam.time_limit_seconds}s`
                : " · No time limit specified in source"}
            </p>
            <Link className="btn" to={`/mocks/${exam.id}`}>
              Start
            </Link>
          </article>
        ))}
        {!loaderData.exams.length ? (
          <p className="panel">No mock exams imported yet.</p>
        ) : null}
      </div>
    </main>
  );
}
