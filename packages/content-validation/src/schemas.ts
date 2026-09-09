import { z } from "zod";

/** Non-empty trimmed string — does not alter stored educational wording beyond trim checks. */
const NonEmptyString = z.string().refine((s) => s.trim().length > 0, {
  message: "must be a non-empty string",
});

/**
 * Question bank record — field names match supplied JSON exactly.
 * Educational values are not normalised by the schema.
 */
export const QuestionBankRecordSchema = z
  .object({
    Section: NonEmptyString,
    Subsection: NonEmptyString,
    Question: NonEmptyString,
    "Correct answer": NonEmptyString,
    "3 incorrect answers": z
      .array(NonEmptyString)
      .length(3, { message: "must contain exactly 3 incorrect answers" }),
    Source: NonEmptyString,
    Explanation: NonEmptyString,
  })
  .superRefine((record, ctx) => {
    const incorrect = record["3 incorrect answers"];
    const unique = new Set(incorrect);
    if (unique.size !== incorrect.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["3 incorrect answers"],
        message: "incorrect answers must be unique",
      });
    }
    if (incorrect.includes(record["Correct answer"])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["3 incorrect answers"],
        message: "incorrect answers must not include the correct answer",
      });
    }
  });

export const QuestionBankFileSchema = z.array(QuestionBankRecordSchema);

export type QuestionBankRecord = z.infer<typeof QuestionBankRecordSchema>;

/**
 * Flashcard record — field names match supplied JSON exactly.
 */
export const FlashcardRecordSchema = z.object({
  Section: NonEmptyString,
  Subsection: NonEmptyString,
  Question: NonEmptyString,
  Answer: NonEmptyString,
});

export const FlashcardFileSchema = z.array(FlashcardRecordSchema);

export type FlashcardRecord = z.infer<typeof FlashcardRecordSchema>;

/**
 * Embedded mock-exam question — full payload, not an ID reference.
 */
export const MockExamQuestionSchema = z
  .object({
    "Question number": z.number().int().positive(),
    Section: NonEmptyString,
    Subsection: NonEmptyString,
    Question: NonEmptyString,
    Options: z
      .array(NonEmptyString)
      .length(4, { message: "must contain exactly 4 options" }),
    "Correct answer": NonEmptyString,
    Source: NonEmptyString,
    Explanation: NonEmptyString,
  })
  .superRefine((record, ctx) => {
    const opts = record.Options;
    if (new Set(opts).size !== opts.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["Options"],
        message: "options must be unique",
      });
    }
    if (!opts.includes(record["Correct answer"])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["Correct answer"],
        message: "correct answer must be one of Options",
      });
    }
  });

export const MockExamRecordSchema = z
  .object({
    "Exam Title": NonEmptyString,
    "Pass Mark": NonEmptyString,
    "Total Questions": z.number().int().positive(),
    Questions: z.array(MockExamQuestionSchema).min(1),
  })
  .superRefine((exam, ctx) => {
    if (exam["Total Questions"] !== exam.Questions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["Total Questions"],
        message: `Total Questions (${exam["Total Questions"]}) does not match Questions.length (${exam.Questions.length})`,
      });
    }
    const numbers = exam.Questions.map((q) => q["Question number"]);
    const seen = new Set<number>();
    for (const n of numbers) {
      if (seen.has(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["Questions"],
          message: `duplicate Question number ${n}`,
        });
      }
      seen.add(n);
    }
  });

export const MockExamFileSchema = z.array(MockExamRecordSchema);

export type MockExamRecord = z.infer<typeof MockExamRecordSchema>;
export type MockExamQuestion = z.infer<typeof MockExamQuestionSchema>;
