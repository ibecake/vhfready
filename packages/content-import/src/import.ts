import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import {
  FlashcardFileSchema,
  MockExamFileSchema,
  QuestionBankFileSchema,
  normalisedQuestionText,
  questionBankHash,
  flashcardHash,
  mockExamHash,
  validateContent,
  type QuestionBankRecord,
  type FlashcardRecord,
  type MockExamRecord,
  type ValidationIssue,
} from "@vhfready/content-validation";

export interface ImportPaths {
  questionBank: string;
  flashcards: string;
  mockExams: string;
}

export interface ImportOptions {
  paths: ImportPaths;
  dryRun: boolean;
  qualificationSlug: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
}

export interface ImportResult {
  dryRun: boolean;
  qualificationSlug: string;
  validationIssues: ValidationIssue[];
  blockingErrors: number;
  planned: {
    questions: number;
    flashcards: number;
    mockExams: number;
    mockExamQuestions: number;
  };
  applied?: {
    importBatchId: string;
    questionsUpserted: number;
    flashcardsUpserted: number;
    mockExamsUpserted: number;
    mockExamQuestionsInserted: number;
  };
  rejected: number;
  duplicates: number;
  warnings: number;
}

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function requireEnv(name: string, value?: string): string {
  if (!value) {
    throw new Error(`Missing required credential: ${name}`);
  }
  return value;
}

export async function runContentImport(
  options: ImportOptions,
): Promise<ImportResult> {
  const questionBankRaw = loadJson(options.paths.questionBank);
  const flashcardsRaw = loadJson(options.paths.flashcards);
  const mockExamsRaw = loadJson(options.paths.mockExams);

  const validation = validateContent({
    questionBankPath: basename(options.paths.questionBank),
    flashcardsPath: basename(options.paths.flashcards),
    mockExamsPath: basename(options.paths.mockExams),
    questionBank: questionBankRaw,
    flashcards: flashcardsRaw,
    mockExams: mockExamsRaw,
  });

  const blockingErrors = validation.issues.filter(
    (i) => i.severity === "error",
  ).length;
  const warnings = validation.issues.filter(
    (i) => i.severity === "warning",
  ).length;

  const questions = QuestionBankFileSchema.parse(questionBankRaw);
  const flashcards = FlashcardFileSchema.parse(flashcardsRaw);
  const mocks = MockExamFileSchema.parse(mockExamsRaw);

  const planned = {
    questions: questions.length,
    flashcards: flashcards.length,
    mockExams: mocks.length,
    mockExamQuestions: mocks.reduce((n, e) => n + e.Questions.length, 0),
  };

  const result: ImportResult = {
    dryRun: options.dryRun,
    qualificationSlug: options.qualificationSlug,
    validationIssues: validation.issues,
    blockingErrors,
    planned,
    rejected: blockingErrors,
    duplicates: 0,
    warnings,
  };

  if (blockingErrors > 0) {
    return result;
  }

  if (options.dryRun) {
    return result;
  }

  const url = requireEnv("SUPABASE_URL", options.supabaseUrl);
  const key = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    options.supabaseServiceRoleKey,
  );
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  result.applied = await applyImport(supabase, {
    qualificationSlug: options.qualificationSlug,
    questions,
    flashcards,
    mocks,
    paths: options.paths,
    validationIssues: validation.issues,
  });

  return result;
}

interface ApplyInput {
  qualificationSlug: string;
  questions: QuestionBankRecord[];
  flashcards: FlashcardRecord[];
  mocks: MockExamRecord[];
  paths: ImportPaths;
  validationIssues: ValidationIssue[];
}

async function applyImport(
  supabase: SupabaseClient,
  input: ApplyInput,
): Promise<NonNullable<ImportResult["applied"]>> {
  const { data: qualification, error: qErr } = await supabase
    .from("qualifications")
    .select("id")
    .eq("slug", input.qualificationSlug)
    .single();
  if (qErr || !qualification) {
    throw new Error(
      `Qualification slug not found: ${input.qualificationSlug}. Create/confirm it before import.`,
    );
  }
  const qualificationId = qualification.id as string;

  const { data: importRow, error: importErr } = await supabase
    .from("imports")
    .insert({
      source_filename: [
        basename(input.paths.questionBank),
        basename(input.paths.flashcards),
        basename(input.paths.mockExams),
      ].join(", "),
      content_type: "mixed",
      dry_run: false,
      warning_count: input.validationIssues.filter((i) => i.severity === "warning")
        .length,
      notes: "Stage 2 deterministic import — educational text preserved exactly",
    })
    .select("id")
    .single();
  if (importErr || !importRow) {
    throw new Error(`Failed to create import batch: ${importErr?.message}`);
  }
  const importBatchId = importRow.id as string;

  for (const issue of input.validationIssues) {
    await supabase.from("import_errors").insert({
      import_id: importBatchId,
      severity: issue.severity,
      code: issue.code,
      message: issue.message,
      record_index: issue.index ?? null,
      payload_excerpt: issue.examTitle
        ? `exam=${issue.examTitle}`
        : issue.details
          ? JSON.stringify(issue.details).slice(0, 500)
          : null,
    });
  }

  // Upsert questions
  let questionsUpserted = 0;
  const questionIdByNorm = new Map<string, string>();

  for (const [index, record] of input.questions.entries()) {
    const hash = questionBankHash(record);
    const row = {
      qualification_id: qualificationId,
      section: record.Section,
      subsection: record.Subsection,
      question_text: record.Question,
      correct_answer: record["Correct answer"],
      explanation: record.Explanation,
      source: record.Source,
      content_hash: hash,
      source_filename: basename(input.paths.questionBank),
      import_batch_id: importBatchId,
      active: true,
      quarantine: false,
    };

    const { data: upserted, error } = await supabase
      .from("questions")
      .upsert(row, { onConflict: "qualification_id,content_hash" })
      .select("id")
      .single();
    if (error || !upserted) {
      await supabase.from("import_errors").insert({
        import_id: importBatchId,
        severity: "error",
        code: "QUESTION_UPSERT_FAILED",
        message: error?.message ?? "unknown",
        record_index: index,
      });
      throw new Error(`Question upsert failed at index ${index}: ${error?.message}`);
    }
    questionsUpserted += 1;
    questionIdByNorm.set(normalisedQuestionText(record.Question), upserted.id);

    // Replace options deterministically: correct first, then 3 incorrect in supplied order
    await supabase.from("question_options").delete().eq("question_id", upserted.id);
    const options = [
      { text: record["Correct answer"], is_correct: true },
      ...record["3 incorrect answers"].map((text) => ({
        text,
        is_correct: false,
      })),
    ];
    const optionRows = options.map((o, sort_index) => ({
      question_id: upserted.id,
      option_text: o.text,
      is_correct: o.is_correct,
      sort_index,
    }));
    const { error: optErr } = await supabase
      .from("question_options")
      .insert(optionRows);
    if (optErr) {
      throw new Error(`Option insert failed: ${optErr.message}`);
    }
  }

  // Flashcards
  let flashcardsUpserted = 0;
  for (const [index, record] of input.flashcards.entries()) {
    const hash = flashcardHash(record);
    const related =
      questionIdByNorm.get(normalisedQuestionText(record.Question)) ?? null;
    const { error } = await supabase.from("flashcards").upsert(
      {
        qualification_id: qualificationId,
        section: record.Section,
        subsection: record.Subsection,
        prompt: record.Question,
        answer: record.Answer,
        content_hash: hash,
        source_filename: basename(input.paths.flashcards),
        import_batch_id: importBatchId,
        related_question_id: related,
        active: true,
        quarantine: false,
      },
      { onConflict: "qualification_id,content_hash" },
    );
    if (error) {
      throw new Error(`Flashcard upsert failed at ${index}: ${error.message}`);
    }
    flashcardsUpserted += 1;
  }

  // Mock exams
  let mockExamsUpserted = 0;
  let mockExamQuestionsInserted = 0;
  for (const exam of input.mocks) {
    const hash = mockExamHash(exam);
    const { data: mockRow, error: mockErr } = await supabase
      .from("mock_exams")
      .upsert(
        {
          qualification_id: qualificationId,
          title: exam["Exam Title"],
          pass_mark_text: exam["Pass Mark"],
          total_questions: exam["Total Questions"],
          time_limit_seconds: null,
          content_hash: hash,
          source_filename: basename(input.paths.mockExams),
          import_batch_id: importBatchId,
          active: true,
          quarantine: false,
        },
        { onConflict: "qualification_id,content_hash" },
      )
      .select("id")
      .single();
    if (mockErr || !mockRow) {
      throw new Error(`Mock exam upsert failed: ${mockErr?.message}`);
    }
    mockExamsUpserted += 1;

    await supabase
      .from("mock_exam_questions")
      .delete()
      .eq("mock_exam_id", mockRow.id);

    const meqRows = exam.Questions.map((mq) => {
      const qid =
        questionIdByNorm.get(normalisedQuestionText(mq.Question)) ?? null;
      return {
        mock_exam_id: mockRow.id,
        question_id: qid,
        question_number: mq["Question number"],
        option_order: mq.Options,
        unresolved: qid === null,
        unresolved_reason:
          qid === null ? "No matching question-bank record" : null,
      };
    });
    const { error: meqErr } = await supabase
      .from("mock_exam_questions")
      .insert(meqRows);
    if (meqErr) {
      throw new Error(`Mock exam questions insert failed: ${meqErr.message}`);
    }
    mockExamQuestionsInserted += meqRows.length;
  }

  await supabase
    .from("imports")
    .update({
      completed_at: new Date().toISOString(),
      imported_count:
        questionsUpserted + flashcardsUpserted + mockExamsUpserted,
      rejected_count: 0,
      error_count: 0,
    })
    .eq("id", importBatchId);

  return {
    importBatchId,
    questionsUpserted,
    flashcardsUpserted,
    mockExamsUpserted,
    mockExamQuestionsInserted,
  };
}
