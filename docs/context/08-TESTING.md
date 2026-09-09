# 08 — Testing

## Stage gates

Every stage ends with:

1. Lint
2. Typecheck
3. Relevant tests
4. Production build where appropriate
5. Docs + decisions + status updates
6. Commit without unresolved blocking errors

## Content validation (Stage 0+)

Package: `@vhfready/content-validation`

- Structural Zod schemas for each JSON type
- Duplicate / orphan / reference checks
- Machine-readable + markdown reports under `docs/reports/`

## Application tests (later stages)

- Unit: scoring, filters, hash/idempotency
- Integration: import dry-run/apply, RLS policies
- E2E: signup → practice → flashcards → mock → progress → flag → admin

## Responsive QA (Stage 12)

320px, typical phones, tablet, desktop.

## Security QA (Stage 10)

Explicit RLS and auth boundary tests listed in `04-SECURITY.md`.
