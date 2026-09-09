import { Form, redirect } from "react-router";
import type { Route } from "./+types/mocks.$examId";
import { requireUser, jsonWithHeaders } from "~/lib/supabase.server";

export function meta() {
  return [{ title: "Mock exam — VHFReady" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const { supabase, headers } = await requireUser(request, context);
  const examId = params.examId!;
  const { data: exam, error } = await supabase
    .from("mock_exams")
    .select(
      "id, title, pass_mark_text, total_questions, mock_exam_questions(question_number, option_order, question_id, questions(id, question_text, correct_answer, explanation, source, section))",
    )
    .eq("id", examId)
    .single();
  if (error || !exam) {
    throw new Response("Not found", { status: 404 });
  }
  type MEQ = {
    question_number: number;
    option_order: string[];
    question_id: string | null;
    questions:
      | { id: string; question_text: string; section: string; correct_answer?: string }
      | { id: string; question_text: string; section: string; correct_answer?: string }[]
      | null;
  };
  const meq = (exam.mock_exam_questions ?? []) as unknown as MEQ[];
  const questions = meq
    .slice()
    .sort((a, b) => a.question_number - b.question_number)
    .map((row) => {
      const q = Array.isArray(row.questions) ? row.questions[0] : row.questions;
      return {
        question_number: row.question_number,
        question_id: q?.id,
        question_text: q?.question_text ?? "",
        section: q?.section ?? "",
        options: row.option_order,
      };
    });

  return jsonWithHeaders(
    {
      exam: {
        id: exam.id,
        title: exam.title,
        pass_mark_text: exam.pass_mark_text,
        total_questions: exam.total_questions,
      },
      questions,
    },
    { headers },
  );
}

function sectionPass(
  answers: Array<{ section: string; is_correct: boolean | null }>,
  sectionPrefix: string,
  required: number,
): boolean {
  const subset = answers.filter((a) => a.section.startsWith(sectionPrefix));
  const correct = subset.filter((a) => a.is_correct).length;
  return correct >= required;
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const { supabase, user, headers } = await requireUser(request, context);
  const examId = params.examId!;
  const form = await request.formData();

  const { data: exam } = await supabase
    .from("mock_exams")
    .select(
      "id, pass_mark_text, mock_exam_questions(question_number, question_id, questions(id, correct_answer, section))",
    )
    .eq("id", examId)
    .single();
  if (!exam) throw new Response("Not found", { status: 404 });

  type Row = {
    question_number: number;
    question_id: string | null;
    questions:
      | { id: string; correct_answer: string; section: string }
      | { id: string; correct_answer: string; section: string }[]
      | null;
  };
  const rows = (exam.mock_exam_questions ?? []) as unknown as Row[];

  const graded = rows.map((row) => {
    const q = Array.isArray(row.questions) ? row.questions[0] : row.questions;
    const chosen = String(form.get(`q_${row.question_number}`) ?? "");
    const correct = q?.correct_answer ?? "";
    const isCorrect = chosen ? chosen === correct : null;
    return {
      question_number: row.question_number,
      question_id: q?.id ?? row.question_id,
      chosen_option_text: chosen || null,
      is_correct: isCorrect,
      section: q?.section ?? "",
    };
  });

  const correctCount = graded.filter((g) => g.is_correct === true).length;
  const incorrectCount = graded.filter((g) => g.is_correct === false).length;
  const unansweredCount = graded.filter((g) => g.is_correct === null).length;
  const total = graded.length || 1;
  const percentage = Math.round((correctCount / total) * 1000) / 10;

  // Honour supplied dual-section pass text when present; do not invent other rules.
  const passed =
    exam.pass_mark_text.includes("60% in Section A (18/30)") &&
    exam.pass_mark_text.includes("60% in Section B (18/30)")
      ? sectionPass(graded, "Section A", 18) &&
        sectionPass(graded, "Section B", 18)
      : null;

  const { data: attempt, error } = await supabase
    .from("user_mock_attempts")
    .insert({
      user_id: user.id,
      mock_exam_id: examId,
      completed_at: new Date().toISOString(),
      score: correctCount,
      percentage,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      unanswered_count: unansweredCount,
      passed,
    })
    .select("id")
    .single();
  if (error || !attempt) {
    return jsonWithHeaders({ error: error?.message }, { status: 500, headers });
  }

  await supabase.from("user_mock_answers").insert(
    graded.map((g) => ({
      attempt_id: attempt.id,
      question_id: g.question_id,
      question_number: g.question_number,
      chosen_option_text: g.chosen_option_text,
      is_correct: g.is_correct,
      answered_at: g.chosen_option_text ? new Date().toISOString() : null,
    })),
  );

  return redirect(`/progress?mock=${attempt.id}`, { headers });
}

export default function MockExam({ loaderData }: Route.ComponentProps) {
  const { exam, questions } = loaderData;
  return (
    <main className="page">
      <h1>{exam.title}</h1>
      <p className="muted">Pass mark (as supplied): {exam.pass_mark_text}</p>
      <Form method="post" className="stack">
        {questions.map((q: {
          question_number: number;
          question_text: string;
          section: string;
          options: string[];
        }) => (
          <fieldset key={q.question_number} className="panel">
            <legend>
              Q{q.question_number}. {q.question_text}
            </legend>
            <p className="muted">{q.section}</p>
            <div className="options">
              {q.options.map((opt: string) => (
                <label key={opt} className="option">
                  <input
                    type="radio"
                    name={`q_${q.question_number}`}
                    value={opt}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button className="btn" type="submit">
          Submit exam
        </button>
      </Form>
    </main>
  );
}
