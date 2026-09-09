# 01 — Architecture

## High-level

```
                 vhfready.com
                      |
                      v
                 Cloudflare
          DNS / TLS / CDN / WAF
                      |
                      v
          Cloudflare Workers (+ static assets)
           React Router v7 (SSR)
                      |
           +----------+----------+
           |                     |
           v                     v
     Supabase Auth       Supabase PostgreSQL
                                   |
                                   v
                        User progress / content
```

GitHub is source control only — not production hosting.

## Framework choice

**React Router v7 (Remix lineage) on Cloudflare Workers** — GA Cloudflare adapter, SSR for SEO qualification pages, Vite + Wrangler local parity, no OpenNext complexity.

Next.js is deferred unless a strong need appears; OpenNext Cloudflare adds adapter surface area without a Stage 0 requirement.

See `09-DECISIONS.md` (D001).

## Major subsystems

| Subsystem | Responsibility |
|-----------|----------------|
| Public marketing / SEO routes | Qualification landing pages only when content exists |
| Auth | Supabase Auth (email); sessions; no service-role in browser |
| Practice engine | Serve canonical questions/options; track attempts |
| Flashcards | Render supplied cards; track user confidence state |
| Mock exams | Honour supplied papers; score per supplied pass-mark text |
| Progress | Per-user aggregates; resume interrupted study |
| Content flags | User reports; admin workflow; never auto-edit content |
| Admin | Users, content inspect/activate, imports, reviews, stats |
| Import tooling | Deterministic JSON import with validation + batch metadata |

## Data ownership

- **Canonical educational text** lives in database tables populated from JSON imports.
- **Review / active / flag state** is separate metadata; never overwrites canonical wording.
- **User progress** is private per user (RLS).

## Edge / hosting notes

- Single Cloudflare Worker origin for the app (static assets + SSR).
- Do **not** introduce Cloudflare Load Balancing unless multiple independent production origins exist.
- Cache static assets aggressively; keep educational API responses appropriately private/uncached where user-specific.

## Environments

| Environment | Purpose |
|-------------|---------|
| Local development | Vite + Wrangler + local/remote Supabase |
| Preview | Cloudflare preview deploy per PR |
| Production | `vhfready.com` |

## Secrets

Platform secret stores only (Cloudflare + Supabase). Never commit `.env` with secrets, service-role keys, or API tokens.
