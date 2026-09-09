import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  QuestionBankRecordSchema,
  FlashcardRecordSchema,
  MockExamRecordSchema,
} from "./schemas.js";
import { validateContent } from "./validate.js";

describe("QuestionBankRecordSchema", () => {
  it("accepts a valid record", () => {
    const result = QuestionBankRecordSchema.safeParse({
      Section: "Section A: Technical",
      Subsection: "A.1 Safety",
      Question: "Example?",
      "Correct answer": "Yes",
      "3 incorrect answers": ["No", "Maybe", "Unknown"],
      Source: "Guide p.1",
      Explanation: "Because.",
    });
    assert.equal(result.success, true);
  });

  it("rejects wrong incorrect-answer count", () => {
    const result = QuestionBankRecordSchema.safeParse({
      Section: "S",
      Subsection: "Sub",
      Question: "Q?",
      "Correct answer": "A",
      "3 incorrect answers": ["B", "C"],
      Source: "S",
      Explanation: "E",
    });
    assert.equal(result.success, false);
  });

  it("rejects correct answer duplicated in incorrect options", () => {
    const result = QuestionBankRecordSchema.safeParse({
      Section: "S",
      Subsection: "Sub",
      Question: "Q?",
      "Correct answer": "A",
      "3 incorrect answers": ["A", "B", "C"],
      Source: "S",
      Explanation: "E",
    });
    assert.equal(result.success, false);
  });
});

describe("FlashcardRecordSchema", () => {
  it("rejects empty answer", () => {
    const result = FlashcardRecordSchema.safeParse({
      Section: "S",
      Subsection: "Sub",
      Question: "Q?",
      Answer: "   ",
    });
    assert.equal(result.success, false);
  });
});

describe("MockExamRecordSchema", () => {
  it("rejects Total Questions mismatch", () => {
    const result = MockExamRecordSchema.safeParse({
      "Exam Title": "Paper",
      "Pass Mark": "60%",
      "Total Questions": 2,
      Questions: [
        {
          "Question number": 1,
          Section: "A",
          Subsection: "A.1",
          Question: "Q1?",
          Options: ["a", "b", "c", "d"],
          "Correct answer": "a",
          Source: "S",
          Explanation: "E",
        },
      ],
    });
    assert.equal(result.success, false);
  });
});

describe("validateContent cross-file", () => {
  it("flags orphan flashcard and broken mock link as errors", () => {
    const report = validateContent({
      questionBankPath: "q.json",
      flashcardsPath: "f.json",
      mockExamsPath: "m.json",
      questionBank: [
        {
          Section: "Section A: Technical",
          Subsection: "A.1 Safety",
          Question: "Known question?",
          "Correct answer": "Yes",
          "3 incorrect answers": ["No", "Maybe", "N/A"],
          Source: "Src",
          Explanation: "Expl",
        },
      ],
      flashcards: [
        {
          Section: "Section A: Technical",
          Subsection: "A.1 Safety",
          Question: "Unknown flashcard?",
          Answer: "Something",
        },
      ],
      mockExams: [
        {
          "Exam Title": "Test Paper",
          "Pass Mark": "60%",
          "Total Questions": 1,
          Questions: [
            {
              "Question number": 1,
              Section: "Section A: Technical",
              Subsection: "A.1 Safety",
              Question: "Unknown mock question?",
              Options: ["a", "b", "c", "d"],
              "Correct answer": "a",
              Source: "S",
              Explanation: "E",
            },
          ],
        },
      ],
    });

    const codes = report.issues.map((i) => i.code);
    assert.ok(codes.includes("ORPHAN_FLASHCARD"));
    assert.ok(codes.includes("BROKEN_MOCK_QUESTION_REFERENCE"));
    assert.ok(codes.includes("PRODUCT_CONTENT_MISMATCH"));
  });

  it("accepts paired bank/flashcard/mock with matching content", () => {
    const bank = {
      Section: "Section A: Technical",
      Subsection: "A.1 Safety",
      Question: "Known question?",
      "Correct answer": "Yes",
      "3 incorrect answers": ["No", "Maybe", "N/A"],
      Source: "Src",
      Explanation: "Expl",
    };
    const report = validateContent({
      questionBankPath: "q.json",
      flashcardsPath: "f.json",
      mockExamsPath: "m.json",
      questionBank: [bank],
      flashcards: [
        {
          Section: bank.Section,
          Subsection: bank.Subsection,
          Question: bank.Question,
          Answer: `${bank["Correct answer"]}. ${bank.Explanation}`,
        },
      ],
      mockExams: [
        {
          "Exam Title": "Test Paper",
          "Pass Mark": "60% in Section A",
          "Total Questions": 1,
          Questions: [
            {
              "Question number": 1,
              Section: bank.Section,
              Subsection: bank.Subsection,
              Question: bank.Question,
              Options: ["Maybe", "Yes", "No", "N/A"],
              "Correct answer": "Yes",
              Source: bank.Source,
              Explanation: bank.Explanation,
            },
          ],
        },
      ],
    });
    assert.equal(
      report.issues.filter((i) => i.severity === "error").length,
      0,
    );
    assert.equal(report.stats.flashcards.matchedToBank, 1);
    assert.equal(report.stats.mockExams.linkedToBank, 1);
  });
});
