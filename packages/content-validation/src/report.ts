import type { ValidationReport } from "./types.js";

export function formatMarkdownReport(report: ValidationReport): string {
  const lines: string[] = [];
  lines.push("# Stage 0 — Content Validation Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push(
    "Educational content was validated structurally only. No educational text was rewritten or invented.",
  );
  lines.push("");
  lines.push("## Dataset summaries");
  lines.push("");
  lines.push("| File | Records | Errors | Warnings | Infos |");
  lines.push("|------|---------|--------|----------|-------|");
  for (const s of report.summaries) {
    lines.push(
      `| \`${s.file}\` | ${s.recordCount} | ${s.errors} | ${s.warnings} | ${s.infos} |`,
    );
  }
  lines.push("");
  lines.push("## Aggregate stats");
  lines.push("");
  lines.push("### Question bank");
  lines.push("");
  lines.push(
    `- Unique questions: ${report.stats.questionBank.uniqueQuestions}`,
  );
  lines.push(`- Sections:`);
  for (const [k, v] of Object.entries(report.stats.questionBank.sections)) {
    lines.push(`  - ${k}: ${v}`);
  }
  lines.push(`- Subsections: ${Object.keys(report.stats.questionBank.subsections).length}`);
  for (const [k, v] of Object.entries(
    report.stats.questionBank.subsections,
  ).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`  - ${k}: ${v}`);
  }
  lines.push("");
  lines.push("### Flashcards");
  lines.push("");
  lines.push(`- Matched to bank: ${report.stats.flashcards.matchedToBank}`);
  lines.push(`- Orphans: ${report.stats.flashcards.orphanCount}`);
  lines.push(
    `- Exact \`{correct}. {explanation}\` answer pattern: ${report.stats.flashcards.answerPatternMatches}`,
  );
  lines.push("");
  lines.push("### Mock exams");
  lines.push("");
  lines.push(`- Exams: ${report.stats.mockExams.examCount}`);
  lines.push(
    `- Embedded questions: ${report.stats.mockExams.totalEmbeddedQuestions}`,
  );
  lines.push(`- Linked to bank: ${report.stats.mockExams.linkedToBank}`);
  lines.push(`- Unlinked: ${report.stats.mockExams.unlinkedToBank}`);
  lines.push(
    `- Unique questions across exams: ${report.stats.mockExams.uniqueQuestionsAcrossExams}`,
  );
  lines.push(
    `- Bank questions never in a mock: ${report.stats.mockExams.bankQuestionsNeverInMock}`,
  );
  lines.push(
    `- Exams missing time limit: ${report.stats.mockExams.examsMissingTimeLimit}`,
  );
  lines.push("");
  lines.push("## Product / governance flags");
  lines.push("");
  for (const f of report.stats.productFlags) {
    lines.push(`- ${f}`);
  }
  lines.push("");
  lines.push("## Issues");
  lines.push("");

  const bySeverity = {
    error: report.issues.filter((i) => i.severity === "error"),
    warning: report.issues.filter((i) => i.severity === "warning"),
    info: report.issues.filter((i) => i.severity === "info"),
  };

  for (const severity of ["error", "warning", "info"] as const) {
    lines.push(`### ${severity.toUpperCase()} (${bySeverity[severity].length})`);
    lines.push("");
    if (bySeverity[severity].length === 0) {
      lines.push("_None_");
      lines.push("");
      continue;
    }
    for (const issue of bySeverity[severity]) {
      const loc = [
        issue.file ? `\`${issue.file}\`` : null,
        issue.index !== undefined ? `index=${issue.index}` : null,
        issue.examTitle ? `exam="${issue.examTitle}"` : null,
        issue.questionNumber !== undefined
          ? `Q#${issue.questionNumber}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");
      lines.push(`- **${issue.code}**${loc ? ` — ${loc}` : ""}`);
      lines.push(`  - ${issue.message}`);
    }
    lines.push("");
  }

  lines.push("## Schema notes (actual, not assumed)");
  lines.push("");
  lines.push(
    "- Question bank fields: `Section`, `Subsection`, `Question`, `Correct answer`, `3 incorrect answers` (array of 3), `Source`, `Explanation`",
  );
  lines.push(
    "- Flashcard fields: `Section`, `Subsection`, `Question`, `Answer`",
  );
  lines.push(
    "- Mock exam fields: `Exam Title`, `Pass Mark` (string), `Total Questions`, `Questions[]` with embedded options (not ID references)",
  );
  lines.push("- No supplied record IDs in any file");
  lines.push("- No time-limit field on mock exams");
  lines.push("");
  lines.push("## Verdict");
  lines.push("");
  const blocking = bySeverity.error.length;
  if (blocking === 0) {
    lines.push(
      "**No structural blocking errors** in supplied JSON. Warnings require human product/qualification decisions before publishing marine-VHF SEO claims or inventing missing regulatory metadata.",
    );
  } else {
    lines.push(
      `**${blocking} blocking error(s)** — do not import affected records as active content without source JSON correction by a human.`,
    );
  }
  lines.push("");
  return lines.join("\n");
}
