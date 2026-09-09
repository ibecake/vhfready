# 09 — Decisions

Format: `Dnnn` — date — status — decision — rationale — consequences.

---

## D001 — Application framework: React Router v7 on Cloudflare Workers

- **Date:** 2026-09-09
- **Status:** Accepted (Stage 0)
- **Decision:** Use React Router v7 (SSR) deployed to Cloudflare Workers via the official Cloudflare Vite plugin / adapter.
- **Rationale:** Cloudflare documents GA full-stack support for React Router v7. Fits SEO qualification pages, Supabase session handling on the server, and avoids Next.js/OpenNext adapter complexity while the product is still early.
- **Consequences:** App lives under a Workers + Vite project (created in a later stage). Next.js remains an option only if requirements change.

## D002 — Educational JSON left unmodified at repository root

- **Date:** 2026-09-09
- **Status:** Accepted
- **Decision:** Do not rewrite or relocate supplied JSON in ways that alter bytes; validation reads paths as supplied (`harec_*.json` at repo root). Optional copies/symlinks only if bit-identical and documented.
- **Rationale:** Absolute educational content rule; provenance clarity.
- **Consequences:** Import tooling accepts configurable paths defaulting to repo-root filenames.

## D003 — Mock exams resolve to canonical questions by content match

- **Date:** 2026-09-09
- **Status:** Accepted (import design)
- **Decision:** Because mock JSON embeds full questions (no IDs), import links `mock_exam_questions.question_id` by normalised question text + verifying correct answer / option set / explanation / source. Preserve each paper’s `Options` order separately. Unresolved rows are errors/quarantine — never invent links.
- **Rationale:** Stage 0 validation shows 300/300 mock items match the bank on those fields.
- **Consequences:** Re-imports must re-resolve; hash changes break links intentionally for human review.

## D004 — Qualification metadata is admin-confirmed

- **Date:** 2026-09-09
- **Status:** Accepted
- **Decision:** Do not silently treat “marine VHF SRC” as the qualification for HAREC JSON. Seed a draft qualification from exam titles (`Irish HAREC`) marked `needs_review` / inactive until an admin confirms slug/routing (`/ireland/harec` or product-chosen path).
- **Rationale:** Product brief vs supplied content mismatch; no educational invention.
- **Consequences:** SEO routes for SRC/ROC-M/etc. wait for supplied content.

## D005 — Auth method

- **Date:** 2026-09-09
- **Status:** Accepted (Stage 3)
- **Decision:** Email + password with email verification and password reset via Supabase Auth.
- **Rationale:** Familiar for adult learners; works well with Supabase Auth session cookies on React Router SSR.
- **Consequences:** `/signup`, `/login`, `/logout`, `/auth/callback`, account disable flow implemented; password reset uses Supabase hosted recovery.

## D006 — Cloudflare Load Balancing

- **Date:** 2026-09-09
- **Status:** Accepted (not used)
- **Decision:** Do not configure Cloudflare Load Balancing.
- **Rationale:** Single Worker origin; global edge already distributes delivery.
- **Consequences:** Document if multi-origin is ever introduced.

## D007 — Monorepo layout

- **Date:** 2026-09-09
- **Status:** Accepted
- **Decision:** npm workspaces with `apps/web`, `packages/content-validation`, `packages/content-import`, and `supabase/migrations`.
- **Rationale:** Keeps Cloudflare app separate from import/validation tooling that needs the service role.
- **Consequences:** CI runs validate → test → typecheck → build across workspaces.
