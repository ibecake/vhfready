# 00 — Project

## Name

**VHFReady.com** — exam-practice platform for radio qualifications.

## Product goal

A simple, fast, mobile-first website where a learner can:

1. Visit VHFReady.com
2. Select a country/qualification
3. Create an account (email)
4. Log in securely
5. Answer practice questions
6. Study flashcards
7. Take predefined mock examinations
8. See progress and performance
9. Review incorrect answers
10. Mark items for later revision
11. Flag questionable educational content for admin review
12. Resume progress across devices

Administrators manage users, educational content visibility/review state, imports, flags, qualifications, mock-exam definitions, and basic usage statistics.

## Absolute educational content rule

The development agent is **not** an educational content author.

It must **not** create, infer, rewrite, modify, improve, paraphrase, correct, or supplement questions, answers, distractors, flashcards, explanations, or mock-exam content.

All educational facts come exclusively from owner-supplied JSON.

If content is missing, malformed, contradictory, or incomplete: **flag — do not fix**.

## Supplied content (Stage 0 inventory)

| File | Role | Records |
|------|------|---------|
| `harec_question_bank_v2.json` | Practice question bank | 301 |
| `harec_flashcards_v2.json` | Flashcards | 301 |
| `harec_mock_exams_v2.json` | Mock examinations | 5 exams (60 questions each) |

Supporting PDFs present in the repository (study guide errata, syllabus, sample exam paper) are **reference material only**. They are **not** educational JSON sources and must not be scraped into questions/answers.

## Critical discovery: product vs supplied content

The product brief describes a **marine VHF** exam-practice platform (routes such as `/ireland/src`, `/uk/src`, `/canada/roc-m`, `/australia/srocp`).

The **only supplied educational JSON** is **Irish HAREC** (amateur radio / Amateur Station Licence) content:

- Sections/subsections match HAREC Technical + Operating Rules syllabus structure
- Mock exam titles are `Irish HAREC Mock Exam Paper 1–5`
- Sources cite IRTS HAREC Study Guide and related Irish/ITU/CEPT material

**Action:** Flag for human product/content decision. Do **not** invent marine VHF (SRC/ROC-M/etc.) educational content. Build the platform so qualifications are data-driven; import only what is supplied. Public SEO qualification pages must be created only when corresponding supplied content exists.

## Non-goals (current stages)

- Billing / payments (structure for future Free/Premium only)
- Affiliate / exam-provider directories (separate from educational correctness)
- Cloudflare Load Balancing (not required with a single edge origin)
- AI-generated or AI-rewritten educational material

## Operating principles

Prefer: simple, secure, fast, testable, documented, cheap to operate.

Complexity belongs in content provenance, not infrastructure.
