import type { Route } from "./+types/progress";
import { requireUser, jsonWithHeaders } from "~/lib/supabase.server";

export function meta() {
  return [{ title: "Progress — VHFReady" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { supabase, user, headers } = await requireUser(request, context);

  const [{ count: attemptCount }, { data: reviewState }, { data: mocks }, { data: flash }] =
    await Promise.all([
      supabase
        .from("user_question_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("user_question_review_state")
        .select("question_id, last_result_correct, marked_for_review, attempt_count")
        .eq("user_id", user.id),
      supabase
        .from("user_mock_attempts")
        .select("id, percentage, passed, correct_count, incorrect_count, unanswered_count, completed_at, mock_exams(title)")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(10),
      supabase
        .from("user_flashcard_progress")
        .select("status")
        .eq("user_id", user.id),
    ]);

  const answered = reviewState?.filter((r) => (r.attempt_count ?? 0) > 0) ?? [];
  const correct = answered.filter((r) => r.last_result_correct).length;
  const marked = reviewState?.filter((r) => r.marked_for_review).length ?? 0;
  const flashCounts = {
    confident: flash?.filter((f) => f.status === "confident").length ?? 0,
    needs_review: flash?.filter((f) => f.status === "needs_review").length ?? 0,
    seen: flash?.filter((f) => f.status === "seen").length ?? 0,
  };

  return jsonWithHeaders(
    {
      attemptCount: attemptCount ?? 0,
      uniqueAnswered: answered.length,
      correctPercentage: answered.length
        ? Math.round((correct / answered.length) * 1000) / 10
        : 0,
      markedForReview: marked,
      mocks: mocks ?? [],
      flashCounts,
    },
    { headers },
  );
}

export default function Progress({ loaderData }: Route.ComponentProps) {
  return (
    <main className="page">
      <h1>Progress</h1>
      <div className="stack">
        <section className="panel">
          <h2 style={{ fontSize: "1.15rem" }}>Questions</h2>
          <p>Attempts logged: {loaderData.attemptCount}</p>
          <p>Unique questions answered: {loaderData.uniqueAnswered}</p>
          <p>Recent correctness: {loaderData.correctPercentage}%</p>
          <p>Marked for review: {loaderData.markedForReview}</p>
        </section>
        <section className="panel">
          <h2 style={{ fontSize: "1.15rem" }}>Flashcards</h2>
          <p>Confident: {loaderData.flashCounts.confident}</p>
          <p>Needs review: {loaderData.flashCounts.needs_review}</p>
          <p>Seen: {loaderData.flashCounts.seen}</p>
        </section>
        <section className="panel">
          <h2 style={{ fontSize: "1.15rem" }}>Mock exams</h2>
          {!loaderData.mocks.length ? (
            <p className="muted">No mock attempts yet.</p>
          ) : (
            <ul>
              {(loaderData.mocks as unknown as Array<{
                id: string;
                percentage: number;
                passed: boolean | null;
                mock_exams: { title: string } | { title: string }[] | null;
              }>).map((m) => {
                const title = Array.isArray(m.mock_exams)
                  ? m.mock_exams[0]?.title
                  : m.mock_exams?.title;
                return (
                <li key={m.id}>
                  {title ?? "Mock"} — {m.percentage}%
                  {m.passed === null
                    ? ""
                    : m.passed
                      ? " (pass)"
                      : " (fail)"}
                </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
