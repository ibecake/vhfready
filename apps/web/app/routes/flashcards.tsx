import { Form } from "react-router";
import type { Route } from "./+types/flashcards";
import { requireUser, jsonWithHeaders } from "~/lib/supabase.server";

export function meta() {
  return [{ title: "Flashcards — VHFReady" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { supabase, user, headers } = await requireUser(request, context);
  const url = new URL(request.url);
  const section = url.searchParams.get("section");

  let query = supabase
    .from("flashcards")
    .select("id, section, subsection, prompt, answer")
    .eq("active", true)
    .eq("quarantine", false)
    .limit(30);
  if (section) query = query.eq("section", section);

  const { data, error } = await query;
  const { data: progress } = await supabase
    .from("user_flashcard_progress")
    .select("flashcard_id, status")
    .eq("user_id", user.id);

  return jsonWithHeaders(
    {
      cards: data ?? [],
      progress: Object.fromEntries(
        (progress ?? []).map((p) => [p.flashcard_id, p.status]),
      ),
      section,
      error: error?.message ?? null,
    },
    { headers },
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const { supabase, user, headers } = await requireUser(request, context);
  const form = await request.formData();
  const flashcardId = String(form.get("flashcardId") ?? "");
  const status = String(form.get("status") ?? "seen");

  const { data: existing } = await supabase
    .from("user_flashcard_progress")
    .select("view_count")
    .eq("user_id", user.id)
    .eq("flashcard_id", flashcardId)
    .maybeSingle();

  await supabase.from("user_flashcard_progress").upsert({
    user_id: user.id,
    flashcard_id: flashcardId,
    status,
    view_count: (existing?.view_count ?? 0) + 1,
    last_viewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return jsonWithHeaders({ ok: true }, { headers });
}

export default function Flashcards({ loaderData }: Route.ComponentProps) {
  const cards = loaderData.cards as Array<{
    id: string;
    section: string;
    subsection: string;
    prompt: string;
    answer: string;
  }>;

  return (
    <main className="page">
      <h1>Flashcards</h1>
      <p className="muted">Only supplied flashcard wording is shown.</p>
      {!cards.length ? (
        <p className="panel">No flashcards available yet.</p>
      ) : (
        <div className="stack">
          {cards.slice(0, 5).map((card) => (
            <details key={card.id} className="panel">
              <summary>
                <span className="muted">
                  {card.section} · {card.subsection}
                </span>
                <br />
                {card.prompt}
              </summary>
              <div className="flashcard flipped" style={{ marginTop: "1rem" }}>
                {card.answer}
              </div>
              <Form method="post" className="cta-row" style={{ marginTop: "1rem" }}>
                <input type="hidden" name="flashcardId" value={card.id} />
                <button className="btn btn-secondary" name="status" value="needs_review">
                  Needs review
                </button>
                <button className="btn" name="status" value="confident">
                  Confident
                </button>
              </Form>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}
