#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateContent, reportHasBlockingErrors } from "./validate.js";
import { formatMarkdownReport } from "./report.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

const defaults = {
  questionBank: resolve(repoRoot, "harec_question_bank_v2.json"),
  flashcards: resolve(repoRoot, "harec_flashcards_v2.json"),
  mockExams: resolve(repoRoot, "harec_mock_exams_v2.json"),
  outDir: resolve(repoRoot, "docs/reports"),
};

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function rel(path: string): string {
  return path.startsWith(repoRoot) ? path.slice(repoRoot.length + 1) : path;
}

function main(): void {
  const questionBankPath = defaults.questionBank;
  const flashcardsPath = defaults.flashcards;
  const mockExamsPath = defaults.mockExams;

  const report = validateContent({
    questionBankPath: rel(questionBankPath),
    flashcardsPath: rel(flashcardsPath),
    mockExamsPath: rel(mockExamsPath),
    questionBank: loadJson(questionBankPath),
    flashcards: loadJson(flashcardsPath),
    mockExams: loadJson(mockExamsPath),
  });

  mkdirSync(defaults.outDir, { recursive: true });
  const mdPath = resolve(defaults.outDir, "stage-0-content-validation.md");
  const jsonPath = resolve(defaults.outDir, "stage-0-content-validation.json");
  writeFileSync(mdPath, formatMarkdownReport(report), "utf8");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");

  const errors = report.issues.filter((i) => i.severity === "error").length;
  const warnings = report.issues.filter((i) => i.severity === "warning").length;
  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Errors: ${errors}; Warnings: ${warnings}`);

  // Stage 0: warnings are expected (missing IDs, product mismatch). Exit 1 only on structural errors.
  if (reportHasBlockingErrors(report)) {
    process.exitCode = 1;
  }
}

main();
