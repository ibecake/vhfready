# 10 — Status

## Current stage

**Stages 0–3 foundation landed** (app scaffold + schema + import CLI). Live Supabase project + Cloudflare production DNS still require owner credentials.

## Completed

### Stage 0 — Discovery
- [x] JSON schema inspection + `/docs/context` + Zod validators + validation report
- [x] Product/content mismatch flagged (marine VHF brief vs HAREC JSON)

### Stage 1 — Database
- [x] `supabase/migrations/20260909153000_stage1_core_schema.sql` (tables, indexes, RLS, draft IE/HAREC qualification)

### Stage 2 — Content import
- [x] `@vhfready/content-import` dry-run/apply CLI (validate → hash → upsert; mock option order preserved)
- [x] Dry-run test without secrets

### Stage 3 — Auth (app foundation)
- [x] React Router v7 + Cloudflare Workers app (`apps/web`)
- [x] Email/password signup, login, logout, auth callback
- [x] Profile/account page; admin gate via `is_admin()` RPC
- [x] Practice / flashcards / mocks / progress / content flags / admin screens wired to Supabase

## Partial / pending credentials

- Apply migration to a real Supabase project
- Run `npm run import:content -- --apply` with service role
- Bind `SUPABASE_URL` + `SUPABASE_ANON_KEY` in Cloudflare
- Configure `vhfready.com` DNS/TLS
- Password-reset email templates in Supabase dashboard
- Hard auth-user deletion job (profile disable is implemented; service-role delete is admin/ops)

## Still ahead

- Stage 10 security test pass against live RLS
- Stage 11 production DNS/WAF hardening
- Stage 12 full device QA matrix
- Broader admin (users list, flashcard/mock curation UI polish)
- Marine VHF qualifications **only when JSON is supplied**

## Validation snapshot

`npm run validate:content` → **0 structural errors**, warnings for missing IDs / time limits / product mismatch.

## How to run locally

```bash
npm install
npm run validate:content
npm test
cp apps/web/.env.example apps/web/.env   # fill Supabase anon URL/key
# apply supabase/migrations to your project
npm run import:content -- --dry-run
# SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run import:content -- --apply
npm run dev
```
