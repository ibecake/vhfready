# Stage 0 — Content Validation Report

Generated: 2026-09-09T15:41:21.630Z

Educational content was validated structurally only. No educational text was rewritten or invented.

## Dataset summaries

| File | Records | Errors | Warnings | Infos |
|------|---------|--------|----------|-------|
| `harec_question_bank_v2.json` | 301 | 0 | 2 | 1 |
| `harec_flashcards_v2.json` | 301 | 0 | 1 | 0 |
| `harec_mock_exams_v2.json` | 5 | 0 | 6 | 5 |

## Aggregate stats

### Question bank

- Unique questions: 301
- Sections:
  - Section A: Technical: 146
  - Section B: Operating Rules, Procedures, Regulations: 155
- Subsections: 18
  - A.1 Safety: 20
  - A.2 Interference and Immunity: 18
  - A.3 Electrical, Electromagnetic, and Radio Theory: 20
  - A.4 Components and Circuits: 18
  - A.5 Transmitters and Receivers: 20
  - A.6 Antennas and Transmission Lines: 20
  - A.7 Propagation: 18
  - A.8 Measurements: 12
  - B.1 Phonetic Alphabet: 10
  - B.10 Irish Laws, Regulations, and Licence Conditions: 15
  - B.2 Q-Codes: 18
  - B.3 International Distress Signs, Emergency Traffic and Natural Disaster Communications: 15
  - B.4 Call Signs: 15
  - B.5 Radio Spectrum Allocation in Ireland and IARU Band Plans: 20
  - B.6 Social Responsibility of Radio Amateur Operation and the Code of Conduct: 15
  - B.7 Operating Procedures and Non-Interference: 20
  - B.8 ITU Radio Regulations: 12
  - B.9 CEPT Regulations: 15

### Flashcards

- Matched to bank: 301
- Orphans: 0
- Exact `{correct}. {explanation}` answer pattern: 301

### Mock exams

- Exams: 5
- Embedded questions: 300
- Linked to bank: 300
- Unlinked: 0
- Unique questions across exams: 199
- Bank questions never in a mock: 102
- Exams missing time limit: 5

## Product / governance flags

- PRODUCT_CONTENT_MISMATCH: Platform brief describes marine VHF qualifications; supplied JSON is Irish HAREC amateur radio. Do not invent marine content.
- PDF_REFERENCE_ONLY: IRTS PDF files in repo must not be scraped into educational records by the agent.

## Issues

### ERROR (0)

_None_

### WARNING (11)

- **MISSING_SOURCE_ID** — `harec_question_bank_v2.json`
  - All 301 question-bank records lack supplied id/sourceId fields
- **MISSING_QUALIFICATION_FIELD** — `harec_question_bank_v2.json`
  - Question bank has no explicit qualification/country field; do not invent marine VHF qualification codes
- **MISSING_SOURCE_ID** — `harec_flashcards_v2.json`
  - All 301 flashcard records lack supplied id/sourceId fields
- **MISSING_SOURCE_ID** — `harec_mock_exams_v2.json`
  - All 5 mock exam records lack supplied id fields; embedded questions also lack bank ID references
- **MISSING_TIME_LIMIT** — `harec_mock_exams_v2.json` · index=0 · exam="Irish HAREC Mock Exam Paper 1"
  - Mock exam has no time-limit field; do not invent official examination timing
- **MISSING_TIME_LIMIT** — `harec_mock_exams_v2.json` · index=1 · exam="Irish HAREC Mock Exam Paper 2"
  - Mock exam has no time-limit field; do not invent official examination timing
- **MISSING_TIME_LIMIT** — `harec_mock_exams_v2.json` · index=2 · exam="Irish HAREC Mock Exam Paper 3"
  - Mock exam has no time-limit field; do not invent official examination timing
- **MISSING_TIME_LIMIT** — `harec_mock_exams_v2.json` · index=3 · exam="Irish HAREC Mock Exam Paper 4"
  - Mock exam has no time-limit field; do not invent official examination timing
- **MISSING_TIME_LIMIT** — `harec_mock_exams_v2.json` · index=4 · exam="Irish HAREC Mock Exam Paper 5"
  - Mock exam has no time-limit field; do not invent official examination timing
- **PRODUCT_CONTENT_MISMATCH**
  - PRODUCT_CONTENT_MISMATCH: Platform brief describes marine VHF qualifications; supplied JSON is Irish HAREC amateur radio. Do not invent marine content.
- **PDF_REFERENCE_ONLY**
  - PDF_REFERENCE_ONLY: IRTS PDF files in repo must not be scraped into educational records by the agent.

### INFO (6)

- **PASS_MARK_FREE_TEXT** — `harec_mock_exams_v2.json` · index=0 · exam="Irish HAREC Mock Exam Paper 1"
  - Pass mark is free text: 60% in Section A (18/30) AND 60% in Section B (18/30)
- **PASS_MARK_FREE_TEXT** — `harec_mock_exams_v2.json` · index=1 · exam="Irish HAREC Mock Exam Paper 2"
  - Pass mark is free text: 60% in Section A (18/30) AND 60% in Section B (18/30)
- **PASS_MARK_FREE_TEXT** — `harec_mock_exams_v2.json` · index=2 · exam="Irish HAREC Mock Exam Paper 3"
  - Pass mark is free text: 60% in Section A (18/30) AND 60% in Section B (18/30)
- **PASS_MARK_FREE_TEXT** — `harec_mock_exams_v2.json` · index=3 · exam="Irish HAREC Mock Exam Paper 4"
  - Pass mark is free text: 60% in Section A (18/30) AND 60% in Section B (18/30)
- **PASS_MARK_FREE_TEXT** — `harec_mock_exams_v2.json` · index=4 · exam="Irish HAREC Mock Exam Paper 5"
  - Pass mark is free text: 60% in Section A (18/30) AND 60% in Section B (18/30)
- **BANK_QUESTIONS_ABSENT_FROM_MOCKS** — `harec_question_bank_v2.json`
  - 102 question-bank records do not appear in any mock exam

## Schema notes (actual, not assumed)

- Question bank fields: `Section`, `Subsection`, `Question`, `Correct answer`, `3 incorrect answers` (array of 3), `Source`, `Explanation`
- Flashcard fields: `Section`, `Subsection`, `Question`, `Answer`
- Mock exam fields: `Exam Title`, `Pass Mark` (string), `Total Questions`, `Questions[]` with embedded options (not ID references)
- No supplied record IDs in any file
- No time-limit field on mock exams

## Verdict

**No structural blocking errors** in supplied JSON. Warnings require human product/qualification decisions before publishing marine-VHF SEO claims or inventing missing regulatory metadata.
