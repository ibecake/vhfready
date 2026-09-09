# VHFReady.com

Mobile-first radio exam practice platform (Cloudflare + Supabase).

## Absolute rule

Educational questions, answers, flashcards, explanations, and mock exams come **only** from owner-supplied JSON. Agents must not invent or rewrite educational content. When uncertain: **flag, do not fix**.

## Repository layout

| Path | Purpose |
|------|---------|
| `docs/context/` | Persistent engineering context (`00`–`10`) |
| `docs/reports/` | Generated validation reports |
| `packages/content-validation/` | Zod schemas + Stage 0 validators |
| `harec_*.json` | Supplied educational content (do not modify) |
| `IRTS_*.pdf` | Reference PDFs only — not import sources |

## Stage 0 commands

```bash
npm install
npm run validate:content
npm run typecheck
npm test -w @vhfready/content-validation
```

## Current status

See [`docs/context/10-STATUS.md`](docs/context/10-STATUS.md).
