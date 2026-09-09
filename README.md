# VHFReady.com

Mobile-first radio exam practice (Cloudflare Workers + Supabase).

## Absolute rule

Educational questions, answers, flashcards, explanations, and mock exams come **only** from owner-supplied JSON. Agents must not invent or rewrite educational content. When uncertain: **flag, do not fix**.

## Layout

| Path | Purpose |
|------|---------|
| `apps/web` | React Router v7 app (Cloudflare Workers) |
| `packages/content-validation` | Zod schemas + Stage 0 validators |
| `packages/content-import` | Deterministic import CLI (service role) |
| `supabase/migrations` | PostgreSQL schema + RLS |
| `docs/context/` | Engineering context (`00`–`10`) |
| `docs/reports/` | Validation reports |
| `harec_*.json` | Supplied educational content (**do not modify**) |

## Commands

```bash
npm install
npm run validate:content
npm test
npm run typecheck
npm run build
npm run import:content --            # dry-run
npm run import:content -- --apply    # requires service role env
npm run dev
```

## Status

See [`docs/context/10-STATUS.md`](docs/context/10-STATUS.md).
