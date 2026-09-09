# 03 — Database

Stage 0 defines the **intended** conceptual model. Migrations begin in Stage 1. Adjust only if later imports prove a structural need.

## Design rules

1. Preserve supplied educational text exactly (no silent wording normalisation in storage).
2. Separate **canonical content** from **review / active metadata**.
3. Generate internal UUIDs; store content hashes; preserve import batch provenance.
4. Mock exams reference canonical questions where resolvable; preserve per-exam option order.
5. Enable RLS from day one.
6. Keep billing entitlement off educational tables (future join/feature flags only).

## Conceptual tables

### Identity & admin

- `profiles` — `id` (FK auth.users), display fields, `disabled_at`, timestamps
- `admin_roles` — `user_id`, `role`, granted_by/at — **not** editable profile metadata

### Catalogue

- `qualifications` — country/code/slug/name; first candidate: Ireland HAREC (admin-confirmed)
- `sections` / `subsections` — optional normalised catalogue keyed by qualification + supplied labels

### Canonical education

- `questions` — qualification_id, section, subsection, question_text, correct_answer, explanation, source, content_hash, source_filename, import_batch_id, active, timestamps  
  - No silent rewrite of text fields
- `question_options` — question_id, option_text, is_correct, sort_index (bank order: correct + 3 incorrect as supplied; practice UI may shuffle **display** only)
- `flashcards` — qualification_id, section, subsection, prompt (Question), answer, content_hash, import metadata, active
- `mock_exams` — title, pass_mark_text (exact string), total_questions, qualification_id, import metadata, active
- `mock_exam_questions` — mock_exam_id, question_id (nullable if unresolved → quarantine), question_number, option_order (exact Options array as supplied for that paper)

### Review metadata (separate)

- `content_reviews` — content_type, content_id, review_status, review_notes, reviewed_by, reviewed_at
- `content_flags` — reporter, content_type, content_id, category, comment, status, history

### User progress

- `user_question_attempts`
- `user_question_review_state` (mark for later)
- `user_flashcard_progress`
- `user_mock_attempts` / `user_mock_answers`

### Imports

- `imports` — filename, timestamp, counts, dry_run flag
- `import_errors` — row/index, severity, code, message, payload excerpt

## Content hash

SHA-256 over canonical educational fields (stable JSON serialisation). Used for idempotent re-import and change detection.

## IDs

Supplied JSON has **no source IDs**. Use:

- UUID primary keys
- `content_hash` uniqueness per qualification + content type
- Optional `source_key` derived from hash prefix for operator display — not an educational claim

## RLS (preview — Stage 1)

| Actor | Educational content | Own progress | Others' progress | Admin tables |
|-------|---------------------|--------------|------------------|--------------|
| Anon | Public marketing only | none | none | none |
| Authenticated user | Read active permitted content | CRUD own | none | none |
| Admin (via admin_roles) | Read all; activate/review metadata | as needed | read metadata | full (server/service paths) |

Users never UPDATE/DELETE canonical educational text via client policies.
