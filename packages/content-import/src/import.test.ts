import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runContentImport } from "./import.js";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("runContentImport dry-run", () => {
  it("plans import without writing when dryRun=true", async () => {
    const dir = join(tmpdir(), `vhfready-import-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const bank = [
      {
        Section: "Section A: Technical",
        Subsection: "A.1 Safety",
        Question: "Dry run question?",
        "Correct answer": "Yes",
        "3 incorrect answers": ["No", "Maybe", "N/A"],
        Source: "Src",
        Explanation: "Expl",
      },
    ];
    const flash = [
      {
        Section: "Section A: Technical",
        Subsection: "A.1 Safety",
        Question: "Dry run question?",
        Answer: "Yes. Expl",
      },
    ];
    const mocks = [
      {
        "Exam Title": "Dry Paper",
        "Pass Mark": "60%",
        "Total Questions": 1,
        Questions: [
          {
            "Question number": 1,
            Section: "Section A: Technical",
            Subsection: "A.1 Safety",
            Question: "Dry run question?",
            Options: ["No", "Yes", "Maybe", "N/A"],
            "Correct answer": "Yes",
            Source: "Src",
            Explanation: "Expl",
          },
        ],
      },
    ];
    const qPath = join(dir, "q.json");
    const fPath = join(dir, "f.json");
    const mPath = join(dir, "m.json");
    writeFileSync(qPath, JSON.stringify(bank));
    writeFileSync(fPath, JSON.stringify(flash));
    writeFileSync(mPath, JSON.stringify(mocks));

    const result = await runContentImport({
      dryRun: true,
      qualificationSlug: "ireland/harec",
      paths: { questionBank: qPath, flashcards: fPath, mockExams: mPath },
    });

    assert.equal(result.dryRun, true);
    assert.equal(result.blockingErrors, 0);
    assert.equal(result.planned.questions, 1);
    assert.equal(result.planned.mockExams, 1);
    assert.equal(result.applied, undefined);

    rmSync(dir, { recursive: true, force: true });
  });
});
