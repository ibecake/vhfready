# 03 — Database

Stage 1 migrations live in `supabase/migrations/`.

## Design rules

1. Preserve supplied educational text exactly (no silent wording normalisation in storage).
2. Separate **canonical content** from **review / active metadata**.
3. Generate internal UUIDs; store content hashes; preserve import batch provenance.
4. Mock exams reference canonical questions where resolvable; preserve per-exam option order.
5. Enable RLS from day one.
6. Keep billing entitlement off educational tables (future join/feature flags only).

## Migration

- `supabase/migrations/20260909153000_stage1_core_schema.sql`

Apply with Supabase CLI (`supabase db push` / `supabase migration up`) against the project linked for this environment.

## Tables (implemented)

### Identity & admin

- `profiles` — FK `auth.users`; email; display_name; `disabled_at`
- `admin_roles` — not profile metadata; `is_admin()` security-definer helper

### Catalogue

- `qualifications` — seeded draft `ireland/harec` (**inactive**, `needs_review=true`)
- `sections` / `subsections`

### Canonical education

- `questions` + `question_options`
- `flashcards`
- `mock_exams` + `mock_exam_questions` (`option_order` jsonb; `unresolved` if link fails)

### Review metadata

- `content_reviews`
- `content_flags` + `content_flag_events`

### User progress

- `user_question_attempts`
- `user_question_review_state`
- `user_flashcard_progress`
- `user_mock_attempts` / `user_mock_answers`

### Imports

- `imports` / `import_errors`

## RLS summary

| Actor | Educational content | Own progress | Others' progress | Admin tables |
|-------|---------------------|--------------|------------------|--------------|
| Anon | Active qualifications list only | none | none | none |
| Authenticated | Read active non-quarantine content | CRUD own | none | none |
| Admin (`admin_roles`) | Read all; update active/meta | read | read | full |

Users cannot INSERT/UPDATE/DELETE canonical educational text via client policies. Service role is used only by server-side import CLI.
