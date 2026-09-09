export type Severity = "error" | "warning" | "info";

export interface ValidationIssue {
  severity: Severity;
  code: string;
  message: string;
  file?: string;
  index?: number;
  examTitle?: string;
  questionNumber?: number;
  details?: Record<string, unknown>;
}

export interface DatasetSummary {
  file: string;
  recordCount: number;
  errors: number;
  warnings: number;
  infos: number;
}

export interface ValidationReport {
  generatedAt: string;
  summaries: DatasetSummary[];
  issues: ValidationIssue[];
  stats: {
    questionBank: {
      sections: Record<string, number>;
      subsections: Record<string, number>;
      uniqueQuestions: number;
    };
    flashcards: {
      matchedToBank: number;
      orphanCount: number;
      answerPatternMatches: number;
    };
    mockExams: {
      examCount: number;
      totalEmbeddedQuestions: number;
      linkedToBank: number;
      unlinkedToBank: number;
      uniqueQuestionsAcrossExams: number;
      bankQuestionsNeverInMock: number;
      examsMissingTimeLimit: number;
    };
    productFlags: string[];
  };
}

export function countBySeverity(issues: ValidationIssue[]): {
  errors: number;
  warnings: number;
  infos: number;
} {
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  for (const issue of issues) {
    if (issue.severity === "error") errors += 1;
    else if (issue.severity === "warning") warnings += 1;
    else infos += 1;
  }
  return { errors, warnings, infos };
}
