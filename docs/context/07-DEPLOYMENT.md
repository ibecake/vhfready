# 07 — Deployment

## Platforms

| Concern | Platform |
|---------|----------|
| Source control | GitHub |
| App edge | Cloudflare Workers (+ static assets) |
| DNS / TLS / CDN | Cloudflare |
| DB / Auth | Supabase |
| CI | GitHub Actions and/or Cloudflare Builds |

## Domain

- Production: `vhfready.com`
- `www` → apex redirect (when DNS configured)
- Preview: Cloudflare preview URLs per PR

## Pipeline

```
Developer → GitHub PR → CI (lint/typecheck/test/build) → Cloudflare Preview → Production
```

## Caching (intent)

- Static assets: long cache + hash filenames
- SSR HTML: short/private as appropriate
- User-specific JSON: no shared CDN cache

## Secrets

Cloudflare + GitHub Actions encrypted secrets. Never commit `.env` with credentials.

## Load balancing

Not used. Single Worker origin. Revisit only with multiple independent origins + documented health checks.
