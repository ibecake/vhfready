import { createHash } from "node:crypto";
import type {
  FlashcardRecord,
  MockExamRecord,
  QuestionBankRecord,
} from "./schemas.js";

/** Whitespace-collapsed key for cross-file matching only — never written back as content. */
export function normalisedQuestionText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function contentHash(value: unknown): string {
  const json = JSON.stringify(value);
  return createHash("sha256").update(json, "utf8").digest("hex");
}

export function questionBankHash(record: QuestionBankRecord): string {
  return contentHash({
    Section: record.Section,
    Subsection: record.Subsection,
    Question: record.Question,
    "Correct answer": record["Correct answer"],
    "3 incorrect answers": record["3 incorrect answers"],
    Source: record.Source,
    Explanation: record.Explanation,
  });
}

export function flashcardHash(record: FlashcardRecord): string {
  return contentHash({
    Section: record.Section,
    Subsection: record.Subsection,
    Question: record.Question,
    Answer: record.Answer,
  });
}

export function mockExamHash(record: MockExamRecord): string {
  return contentHash(record);
}

export function optionSet(record: QuestionBankRecord): Set<string> {
  return new Set([
    record["Correct answer"],
    ...record["3 incorrect answers"],
  ]);
}
