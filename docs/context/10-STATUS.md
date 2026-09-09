# 10 — Status

## Current stage

**Stage 0 — Discovery** (complete)

## Completed this stage

- [x] Inspected supplied question, flashcard, and mock-exam JSON (actual schemas documented)
- [x] Created `/docs/context/` framework (`00`–`10`)
- [x] Created formal Zod validation schemas (`packages/content-validation`)
- [x] Ran validation; wrote `docs/reports/stage-0-content-validation.md` (+ JSON report)
- [x] Recorded architectural decisions (framework, import linking, qualification caution)
- [x] Lint / typecheck / unit tests / content validation gate green (0 structural errors)

## Not started

- Stage 1 — Database migrations + RLS
- Stage 2 — Import tooling
- Stages 3–12 — Auth through QA/deployment

## Blockers / flags for humans

1. **Product vs content mismatch:** Brief targets marine VHF; JSON is Irish HAREC amateur radio. Need owner decision on product scope and/or additional JSON.
2. **No source IDs** in JSON — import will use generated UUIDs + content hashes.
3. **No mock time limit** in JSON — app must not invent official timing rules.
4. **Pass mark** is free text — scoring logic must parse carefully or apply explicitly coded rules derived only from that string with admin confirmation.

## Validation snapshot (Stage 0)

| Dataset | Records | Structural errors | Notes |
|---------|---------|-------------------|-------|
| Question bank | 301 | 0 | No IDs; no explicit qualification field |
| Flashcards | 301 | 0 | 1:1 with bank; answer = `{correct}. {explanation}` |
| Mock exams | 5 / 300 Qs | 0 | All link to bank by text; no time limit; options shuffled per paper |

Full report: `docs/reports/stage-0-content-validation.md`

## Next stage entry criteria

Met. Stage 1 may begin: schemas understood, validators green for supplied files, docs present, mismatch flagged (not “fixed” by inventing marine content).
