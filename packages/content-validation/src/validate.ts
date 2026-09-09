import {
  FlashcardFileSchema,
  MockExamFileSchema,
  QuestionBankFileSchema,
  type FlashcardRecord,
  type MockExamRecord,
  type QuestionBankRecord,
} from "./schemas.js";
import {
  flashcardHash,
  normalisedQuestionText,
  optionSet,
  questionBankHash,
} from "./hash.js";
import {
  countBySeverity,
  type DatasetSummary,
  type ValidationIssue,
  type ValidationReport,
} from "./types.js";

export interface ValidateInputs {
  questionBankPath: string;
  flashcardsPath: string;
  mockExamsPath: string;
  questionBank: unknown;
  flashcards: unknown;
  mockExams: unknown;
}

function pushIssue(issues: ValidationIssue[], issue: ValidationIssue): void {
  issues.push(issue);
}

function zodIssues(
  file: string,
  parsed: { success: false; error: { issues: Array<{ path: (string | number)[]; message: string }> } },
): ValidationIssue[] {
  return parsed.error.issues.map((zi) => ({
    severity: "error" as const,
    code: "SCHEMA_INVALID",
    message: zi.message,
    file,
    details: { path: zi.path },
  }));
}

export function validateContent(inputs: ValidateInputs): ValidationReport {
  const issues: ValidationIssue[] = [];
  const summaries: DatasetSummary[] = [];

  const qbParsed = QuestionBankFileSchema.safeParse(inputs.questionBank);
  const fcParsed = FlashcardFileSchema.safeParse(inputs.flashcards);
  const meParsed = MockExamFileSchema.safeParse(inputs.mockExams);

  let questions: QuestionBankRecord[] = [];
  let flashcards: FlashcardRecord[] = [];
  let mocks: MockExamRecord[] = [];

  if (!qbParsed.success) {
    issues.push(...zodIssues(inputs.questionBankPath, qbParsed));
  } else {
    questions = qbParsed.data;
  }

  if (!fcParsed.success) {
    issues.push(...zodIssues(inputs.flashcardsPath, fcParsed));
  } else {
    flashcards = fcParsed.data;
  }

  if (!meParsed.success) {
    issues.push(...zodIssues(inputs.mockExamsPath, meParsed));
  } else {
    mocks = meParsed.data;
  }

  // --- Question bank cross-record checks ---
  const questionTextIndex = new Map<string, number[]>();
  const questionHashIndex = new Map<string, number[]>();
  const sections: Record<string, number> = {};
  const subsections: Record<string, number> = {};

  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i]!;
    const key = normalisedQuestionText(q.Question);
    const list = questionTextIndex.get(key) ?? [];
    list.push(i);
    questionTextIndex.set(key, list);

    const hash = questionBankHash(q);
    const hList = questionHashIndex.get(hash) ?? [];
    hList.push(i);
    questionHashIndex.set(hash, hList);

    sections[q.Section] = (sections[q.Section] ?? 0) + 1;
    subsections[q.Subsection] = (subsections[q.Subsection] ?? 0) + 1;
  }

  if (questions.length > 0) {
    pushIssue(issues, {
      severity: "warning",
      code: "MISSING_SOURCE_ID",
      message: `All ${questions.length} question-bank records lack supplied id/sourceId fields`,
      file: inputs.questionBankPath,
    });
  }

  for (const [text, idxs] of questionTextIndex) {
    if (idxs.length > 1) {
      pushIssue(issues, {
        severity: "error",
        code: "DUPLICATE_QUESTION_TEXT",
        message: `Duplicate question text at indices ${idxs.join(", ")}`,
        file: inputs.questionBankPath,
        details: { indices: idxs, preview: text.slice(0, 120) },
      });
    }
  }

  for (const [hash, idxs] of questionHashIndex) {
    if (idxs.length > 1) {
      pushIssue(issues, {
        severity: "error",
        code: "DUPLICATE_QUESTION_RECORD",
        message: `Duplicate full question records at indices ${idxs.join(", ")}`,
        file: inputs.questionBankPath,
        details: { indices: idxs, contentHash: hash },
      });
    }
  }

  pushIssue(issues, {
    severity: "warning",
    code: "MISSING_QUALIFICATION_FIELD",
    message:
      "Question bank has no explicit qualification/country field; do not invent marine VHF qualification codes",
    file: inputs.questionBankPath,
  });

  // --- Flashcards ---
  const flashHashes = new Map<string, number[]>();
  const flashTexts = new Map<string, number[]>();
  let matchedToBank = 0;
  let orphanCount = 0;
  let answerPatternMatches = 0;

  if (flashcards.length > 0) {
    pushIssue(issues, {
      severity: "warning",
      code: "MISSING_SOURCE_ID",
      message: `All ${flashcards.length} flashcard records lack supplied id/sourceId fields`,
      file: inputs.flashcardsPath,
    });
  }

  for (let i = 0; i < flashcards.length; i += 1) {
    const fc = flashcards[i]!;
    const key = normalisedQuestionText(fc.Question);
    const tList = flashTexts.get(key) ?? [];
    tList.push(i);
    flashTexts.set(key, tList);

    const hash = flashcardHash(fc);
    const hList = flashHashes.get(hash) ?? [];
    hList.push(i);
    flashHashes.set(hash, hList);

    const bankIdxs = questionTextIndex.get(key);
    if (!bankIdxs || bankIdxs.length === 0) {
      orphanCount += 1;
      pushIssue(issues, {
        severity: "error",
        code: "ORPHAN_FLASHCARD",
        message: "Flashcard question text not found in question bank",
        file: inputs.flashcardsPath,
        index: i,
        details: { preview: key.slice(0, 120) },
      });
    } else {
      matchedToBank += 1;
      const bank = questions[bankIdxs[0]!]!;
      const expected = `${bank["Correct answer"]}. ${bank.Explanation}`;
      if (fc.Answer === expected) {
        answerPatternMatches += 1;
      } else if (!fc.Answer.includes(bank["Correct answer"])) {
        pushIssue(issues, {
          severity: "warning",
          code: "FLASHCARD_ANSWER_MISMATCH",
          message:
            "Flashcard Answer does not contain the paired question Correct answer (flag; do not rewrite)",
          file: inputs.flashcardsPath,
          index: i,
        });
      } else {
        pushIssue(issues, {
          severity: "info",
          code: "FLASHCARD_ANSWER_FORMAT_VARIANT",
          message:
            "Flashcard Answer includes correct answer but does not match Exact '{correct}. {explanation}' pattern",
          file: inputs.flashcardsPath,
          index: i,
        });
      }
    }
  }

  for (const [text, idxs] of flashTexts) {
    if (idxs.length > 1) {
      pushIssue(issues, {
        severity: "error",
        code: "DUPLICATE_FLASHCARD_TEXT",
        message: `Duplicate flashcard question text at indices ${idxs.join(", ")}`,
        file: inputs.flashcardsPath,
        details: { indices: idxs, preview: text.slice(0, 120) },
      });
    }
  }

  // Bank questions without flashcards
  for (const [text, idxs] of questionTextIndex) {
    if (!flashTexts.has(text)) {
      pushIssue(issues, {
        severity: "warning",
        code: "QUESTION_WITHOUT_FLASHCARD",
        message: `Question bank index ${idxs[0]} has no matching flashcard`,
        file: inputs.questionBankPath,
        index: idxs[0],
      });
    }
  }

  // --- Mock exams ---
  let totalEmbedded = 0;
  let linkedToBank = 0;
  let unlinkedToBank = 0;
  const mockQuestionKeys = new Set<string>();
  let examsMissingTimeLimit = 0;

  if (mocks.length > 0) {
    pushIssue(issues, {
      severity: "warning",
      code: "MISSING_SOURCE_ID",
      message: `All ${mocks.length} mock exam records lack supplied id fields; embedded questions also lack bank ID references`,
      file: inputs.mockExamsPath,
    });
  }

  for (let ei = 0; ei < mocks.length; ei += 1) {
    const exam = mocks[ei]!;
    examsMissingTimeLimit += 1;
    pushIssue(issues, {
      severity: "warning",
      code: "MISSING_TIME_LIMIT",
      message:
        "Mock exam has no time-limit field; do not invent official examination timing",
      file: inputs.mockExamsPath,
      examTitle: exam["Exam Title"],
      index: ei,
    });

    pushIssue(issues, {
      severity: "info",
      code: "PASS_MARK_FREE_TEXT",
      message: `Pass mark is free text: ${exam["Pass Mark"]}`,
      file: inputs.mockExamsPath,
      examTitle: exam["Exam Title"],
      index: ei,
    });

    for (const mq of exam.Questions) {
      totalEmbedded += 1;
      const key = normalisedQuestionText(mq.Question);
      mockQuestionKeys.add(key);
      const bankIdxs = questionTextIndex.get(key);
      if (!bankIdxs || bankIdxs.length === 0) {
        unlinkedToBank += 1;
        pushIssue(issues, {
          severity: "error",
          code: "BROKEN_MOCK_QUESTION_REFERENCE",
          message:
            "Mock exam question text not found in question bank (embedded payload cannot be linked to canonical record)",
          file: inputs.mockExamsPath,
          examTitle: exam["Exam Title"],
          questionNumber: mq["Question number"],
          details: { preview: key.slice(0, 120) },
        });
      } else {
        linkedToBank += 1;
        const bank = questions[bankIdxs[0]!]!;
        if (bank["Correct answer"] !== mq["Correct answer"]) {
          pushIssue(issues, {
            severity: "error",
            code: "MOCK_CORRECT_ANSWER_MISMATCH",
            message:
              "Mock correct answer differs from question bank for same question text",
            file: inputs.mockExamsPath,
            examTitle: exam["Exam Title"],
            questionNumber: mq["Question number"],
          });
        }
        if (bank.Explanation !== mq.Explanation) {
          pushIssue(issues, {
            severity: "warning",
            code: "MOCK_EXPLANATION_MISMATCH",
            message:
              "Mock explanation text differs from question bank (flag; do not merge automatically)",
            file: inputs.mockExamsPath,
            examTitle: exam["Exam Title"],
            questionNumber: mq["Question number"],
          });
        }
        if (bank.Source !== mq.Source) {
          pushIssue(issues, {
            severity: "warning",
            code: "MOCK_SOURCE_MISMATCH",
            message: "Mock source text differs from question bank",
            file: inputs.mockExamsPath,
            examTitle: exam["Exam Title"],
            questionNumber: mq["Question number"],
          });
        }
        const bankOpts = optionSet(bank);
        const mockOpts = new Set(mq.Options);
        if (
          bankOpts.size !== mockOpts.size ||
          [...bankOpts].some((o) => !mockOpts.has(o))
        ) {
          pushIssue(issues, {
            severity: "error",
            code: "MOCK_OPTION_SET_MISMATCH",
            message: "Mock option set differs from question bank",
            file: inputs.mockExamsPath,
            examTitle: exam["Exam Title"],
            questionNumber: mq["Question number"],
          });
        }
      }
    }
  }

  let bankQuestionsNeverInMock = 0;
  for (const key of questionTextIndex.keys()) {
    if (!mockQuestionKeys.has(key)) {
      bankQuestionsNeverInMock += 1;
    }
  }
  if (bankQuestionsNeverInMock > 0) {
    pushIssue(issues, {
      severity: "info",
      code: "BANK_QUESTIONS_ABSENT_FROM_MOCKS",
      message: `${bankQuestionsNeverInMock} question-bank records do not appear in any mock exam`,
      file: inputs.questionBankPath,
    });
  }

  const productFlags: string[] = [
    "PRODUCT_CONTENT_MISMATCH: Platform brief describes marine VHF qualifications; supplied JSON is Irish HAREC amateur radio. Do not invent marine content.",
    "PDF_REFERENCE_ONLY: IRTS PDF files in repo must not be scraped into educational records by the agent.",
  ];

  pushIssue(issues, {
    severity: "warning",
    code: "PRODUCT_CONTENT_MISMATCH",
    message: productFlags[0]!,
  });
  pushIssue(issues, {
    severity: "warning",
    code: "PDF_REFERENCE_ONLY",
    message: productFlags[1]!,
  });

  const qbCounts = countBySeverity(
    issues.filter((i) => i.file === inputs.questionBankPath),
  );
  const fcCounts = countBySeverity(
    issues.filter((i) => i.file === inputs.flashcardsPath),
  );
  const meCounts = countBySeverity(
    issues.filter((i) => i.file === inputs.mockExamsPath),
  );

  summaries.push({
    file: inputs.questionBankPath,
    recordCount: questions.length,
    ...qbCounts,
  });
  summaries.push({
    file: inputs.flashcardsPath,
    recordCount: flashcards.length,
    ...fcCounts,
  });
  summaries.push({
    file: inputs.mockExamsPath,
    recordCount: mocks.length,
    ...meCounts,
  });

  return {
    generatedAt: new Date().toISOString(),
    summaries,
    issues,
    stats: {
      questionBank: {
        sections,
        subsections,
        uniqueQuestions: questionTextIndex.size,
      },
      flashcards: {
        matchedToBank,
        orphanCount,
        answerPatternMatches,
      },
      mockExams: {
        examCount: mocks.length,
        totalEmbeddedQuestions: totalEmbedded,
        linkedToBank,
        unlinkedToBank,
        uniqueQuestionsAcrossExams: mockQuestionKeys.size,
        bankQuestionsNeverInMock,
        examsMissingTimeLimit,
      },
      productFlags,
    },
  };
}

export function reportHasBlockingErrors(report: ValidationReport): boolean {
  return report.issues.some((i) => i.severity === "error");
}
