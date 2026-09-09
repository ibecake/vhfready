# 02 — Data Contract

Formal contract for owner-supplied educational JSON. Schemas are implemented in `packages/content-validation`.

**Do not modify supplied JSON to “fit” the app.** Validate; flag; import or reject.

---

## Common observations (all files)

- No `id` / `sourceId` fields — internal IDs and content hashes must be generated at import time.
- No explicit `qualification` / `country` field — HAREC/Ireland is implied by titles and sources only. Treat qualification assignment as **admin-confirmed metadata**, not invented educational fact.
- Field names use human-readable Title Case with spaces (e.g. `"Correct answer"`).

---

## A. Question bank — `harec_question_bank_v2.json`

**Root:** JSON array.

### Record shape

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `Section` | string | yes | Non-empty |
| `Subsection` | string | yes | Non-empty |
| `Question` | string | yes | Non-empty; unique within bank (Stage 0) |
| `Correct answer` | string | yes | Non-empty |
| `3 incorrect answers` | `string[3]` | yes | Exactly 3 non-empty unique strings; must not include correct answer |
| `Source` | string | yes | Non-empty (flag if empty) |
| `Explanation` | string | yes | Non-empty (flag if empty) |

### Observed Stage 0 values

- **301** records
- Sections: `Section A: Technical` (146), `Section B: Operating Rules, Procedures, Regulations` (155)
- 18 distinct subsections (A.1–A.8, B.1–B.10)

---

## B. Flashcards — `harec_flashcards_v2.json`

**Root:** JSON array.

### Record shape

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `Section` | string | yes | Non-empty |
| `Subsection` | string | yes | Non-empty |
| `Question` | string | yes | Non-empty |
| `Answer` | string | yes | Non-empty |

### Observed Stage 0 relationship to question bank

- **301** cards, 1:1 with question bank by normalised question text.
- Every `Answer` matches pattern: `{Correct answer}. {Explanation}` from the paired question.
- Flashcards do **not** carry separate Source fields.

---

## C. Mock exams — `harec_mock_exams_v2.json`

**Root:** JSON array of exam objects.

### Exam shape

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `Exam Title` | string | yes | Non-empty |
| `Pass Mark` | string | yes | Free-text (not a numeric field) |
| `Total Questions` | number | yes | Must equal `Questions.length` |
| `Questions` | array | yes | Non-empty |

**Absent (do not invent):** time limit, official regulator code, numeric pass threshold fields, question ID references.

### Embedded mock question shape

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `Question number` | number | yes | Unique within exam; typically 1..N |
| `Section` | string | yes | Non-empty |
| `Subsection` | string | yes | Non-empty |
| `Question` | string | yes | Non-empty |
| `Options` | `string[4]` | yes | Exactly 4 unique non-empty strings |
| `Correct answer` | string | yes | Must be one of `Options` |
| `Source` | string | yes | Non-empty |
| `Explanation` | string | yes | Non-empty |

### Observed Stage 0 mock facts

- 5 papers: `Irish HAREC Mock Exam Paper 1` … `Paper 5`
- Each: 60 questions (30 Section A + 30 Section B)
- Pass mark text (identical across papers):  
  `60% in Section A (18/30) AND 60% in Section B (18/30)`
- All 300 embedded mock questions match the question bank by question text; correct answer, explanation, source, and option **sets** match the bank.
- Option **order** varies across papers for repeated questions (80 questions appear in multiple papers with shuffled options).
- 199 unique bank questions appear in at least one mock; 102 bank questions appear in none.

### Import implication

Mock exams **embed** full question payloads rather than referencing bank IDs. Import tooling should resolve to canonical question records by content hash / normalised question text and store **mock_exam_questions** as ordered references plus preserved option order for that paper — without rewriting educational text.

---

## D. Validation severity

| Severity | Meaning |
|----------|---------|
| **error** | Record must not be imported as active educational content without human fix of the **source JSON** |
| **warning** | Structurally valid but suspicious / incomplete metadata — import may quarantine or mark `needs_review` |
| **info** | Notable for operators; no reject |

Never auto-repair educational fields.
