import { Form, useNavigation } from "react-router";
import type { Route } from "./+types/practice";
import { requireUser, jsonWithHeaders } from "~/lib/supabase.server";

type QuestionRow = {
  id: string;
  section: string;
  subsection: string;
  question_text: string;
  correct_answer: string;
  explanation: string;
  source: string;
  question_options: Array<{
    id: string;
    option_text: string;
    is_correct: boolean;
    sort_index: number;
  }>;
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function meta() {
  return [{ title: "Practice — VHFReady" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { supabase, user, headers } = await requireUser(request, context);
  const url = new URL(request.url);
  const section = url.searchParams.get("section");
  const subsection = url.searchParams.get("subsection");
  const filter = url.searchParams.get("filter") ?? "all";

  let query = supabase
    .from("questions")
    .select(
      "id, section, subsection, question_text, correct_answer, explanation, source, question_options(id, option_text, is_correct, sort_index)",
    )
    .eq("active", true)
    .eq("quarantine", false)
    .limit(40);

  if (section) query = query.eq("section", section);
  if (subsection) query = query.eq("subsection", subsection);

  const { data: questions, error } = await query;
  if (error) {
    return jsonWithHeaders(
      {
        error: error.message,
        question: null,
        filters: { section, subsection, filter },
        sectionOptions: [] as string[],
      },
      { headers },
    );
  }

  let pool = (questions ?? []) as QuestionRow[];

  if (filter === "unanswered" || filter === "incorrect" || filter === "review") {
    const { data: state } = await supabase
      .from("user_question_review_state")
      .select("question_id, marked_for_review, last_result_correct, attempt_count")
      .eq("user_id", user.id);
    const map = new Map((state ?? []).map((s) => [s.question_id, s]));
    pool = pool.filter((q) => {
      const s = map.get(q.id);
      if (filter === "unanswered") return !s || s.attempt_count === 0;
      if (filter === "incorrect") return s?.last_result_correct === false;
      if (filter === "review") return s?.marked_for_review === true;
      return true;
    });
  }

  const question = pool.length ? pool[Math.floor(Math.random() * pool.length)]! : null;
  const options = question
    ? shuffle(question.question_options).map((o) => ({
        id: o.id,
        option_text: o.option_text,
      }))
    : [];

  const { data: sections } = await supabase
    .from("questions")
    .select("section")
    .eq("active", true)
    .limit(500);
  const sectionOptions = [...new Set((sections ?? []).map((s) => s.section))];

  return jsonWithHeaders(
    {
      question: question
        ? {
            id: question.id,
            section: question.section,
            subsection: question.subsection,
            question_text: question.question_text,
            options,
          }
        : null,
      filters: { section, subsection, filter },
      sectionOptions,
      error: null,
    },
    { headers },
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const { supabase, user, headers } = await requireUser(request, context);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "answer");
  const questionId = String(form.get("questionId") ?? "");

  if (intent === "review_later") {
    await supabase.from("user_question_review_state").upsert({
      user_id: user.id,
      question_id: questionId,
      marked_for_review: true,
      updated_at: new Date().toISOString(),
    });
    return jsonWithHeaders({ ok: true }, { headers });
  }

  if (intent === "flag") {
    const category = String(form.get("category") ?? "other");
    const comment = String(form.get("comment") ?? "");
    await supabase.from("content_flags").insert({
      reporter_id: user.id,
      content_type: "question",
      content_id: questionId,
      category,
      comment: comment || null,
    });
    return jsonWithHeaders({ flagged: true }, { headers });
  }

  const chosen = String(form.get("chosen") ?? "");
  const { data: question, error } = await supabase
    .from("questions")
    .select(
      "id, correct_answer, explanation, source, question_options(option_text, is_correct, sort_index)",
    )
    .eq("id", questionId)
    .single();
  if (error || !question) {
    return jsonWithHeaders({ error: error?.message ?? "Not found" }, { status: 404, headers });
  }

  const isCorrect = chosen === question.correct_answer;
  const { data: prior } = await supabase
    .from("user_question_review_state")
    .select("attempt_count")
    .eq("user_id", user.id)
    .eq("question_id", questionId)
    .maybeSingle();
  const attemptNumber = (prior?.attempt_count ?? 0) + 1;

  await supabase.from("user_question_attempts").insert({
    user_id: user.id,
    question_id: questionId,
    chosen_option_text: chosen,
    is_correct: isCorrect,
    attempt_number: attemptNumber,
  });

  await supabase.from("user_question_review_state").upsert({
    user_id: user.id,
    question_id: questionId,
    last_result_correct: isCorrect,
    attempt_count: attemptNumber,
    last_attempted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return jsonWithHeaders(
    {
      submitted: true,
      isCorrect,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
      source: question.source,
      chosen,
      options: question.question_options,
    },
    { headers },
  );
}

export default function Practice({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const q = loaderData.question;
  const result = actionData && "submitted" in actionData ? actionData : null;

  return (
    <main className="page">
      <h1>Practice</h1>
      <p className="muted">Question → answer → result → explanation → next.</p>

      <Form method="get" className="panel form" style={{ maxWidth: "100%" }}>
        <label>
          Section
          <select name="section" defaultValue={loaderData.filters.section ?? ""}>
            <option value="">All sections</option>
            {loaderData.sectionOptions.map((s: string) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Filter
          <select name="filter" defaultValue={loaderData.filters.filter}>
            <option value="all">All</option>
            <option value="unanswered">Unanswered</option>
            <option value="incorrect">Previously incorrect</option>
            <option value="review">Marked for review</option>
          </select>
        </label>
        <button className="btn btn-secondary" type="submit">
          Apply filters
        </button>
      </Form>

      {!q ? (
        <p className="panel" role="status">
          No questions match these filters (or content is not imported yet).
        </p>
      ) : (
        <section className="panel stack" aria-live="polite">
          <p className="muted">
            {q.section} · {q.subsection}
          </p>
          <h2 style={{ fontSize: "1.25rem" }}>{q.question_text}</h2>

          {!result ? (
            <Form method="post" className="stack">
              <input type="hidden" name="questionId" value={q.id} />
              <input type="hidden" name="intent" value="answer" />
              <div className="options" role="group" aria-label="Answer choices">
                {q.options.map((opt: { id: string; option_text: string }) => (
                  <label key={opt.id} className="option">
                    <input
                      type="radio"
                      name="chosen"
                      value={opt.option_text}
                      required
                    />
                    <span>{opt.option_text}</span>
                  </label>
                ))}
              </div>
              <button className="btn" type="submit" disabled={busy}>
                Submit answer
              </button>
            </Form>
          ) : (
            <div className="stack">
              <p
                className={result.isCorrect ? "status-ok" : "status-bad"}
                role="status"
              >
                {result.isCorrect ? "Correct" : "Incorrect"}
                {!result.isCorrect ? ` — correct answer: ${result.correctAnswer}` : ""}
              </p>
              <p>
                <strong>Explanation</strong>
                <br />
                {result.explanation}
              </p>
              <p className="muted">Source: {result.source}</p>
              <div className="cta-row">
                <Form method="get">
                  <button className="btn" type="submit">
                    Next question
                  </button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="questionId" value={q.id} />
                  <input type="hidden" name="intent" value="review_later" />
                  <button className="btn btn-secondary" type="submit">
                    Review later
                  </button>
                </Form>
              </div>
              <Form method="post" className="form" style={{ maxWidth: "100%" }}>
                <input type="hidden" name="questionId" value={q.id} />
                <input type="hidden" name="intent" value="flag" />
                <label>
                  Flag content for admin review
                  <select name="category" defaultValue="other">
                    <option value="question_appears_incorrect">
                      Question appears incorrect
                    </option>
                    <option value="answer_appears_incorrect">
                      Answer appears incorrect
                    </option>
                    <option value="explanation_unclear">Explanation unclear</option>
                    <option value="typo_or_formatting">Typo or formatting</option>
                    <option value="source_issue">Source issue</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Comment (optional)
                  <textarea name="comment" rows={2} maxLength={500} />
                </label>
                <button className="btn btn-secondary" type="submit">
                  Submit content flag
                </button>
              </Form>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
