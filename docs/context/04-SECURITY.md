# 04 — Security

## Principles

- Enforce authorisation in Supabase RLS and server/edge code — never UI-only.
- Never expose Supabase **service-role** keys to the browser or client bundles.
- Admin privilege lives in `admin_roles`, not user-editable profile/auth metadata.
- Canonical educational content is immutable to normal users.
- Content flags never auto-mutate educational text.

## Threat areas (Stage 10 checklist)

- [ ] RLS: User A cannot read/modify User B progress
- [ ] Normal users cannot access admin APIs/data
- [ ] Normal users cannot modify canonical content
- [ ] Normal users cannot self-promote to admin
- [ ] Service-role absent from client bundles
- [ ] XSS via question/explanation rendering (treat content as untrusted HTML — escape by default)
- [ ] CSRF / cookie session posture for auth flows
- [ ] Injection via search/filter parameters
- [ ] Login abuse / content-report abuse (rate limits)
- [ ] Cloudflare WAF / bot basics / security headers
- [ ] Dependency vulnerabilities

## Auth (Stage 3 decision pending implementation)

Preferred candidate: **email + password** with verification and reset (simplest familiar flow for exam students). Magic link remains acceptable if product prefers passwordless. Final choice recorded in `09-DECISIONS.md` at Stage 3.

## Cloudflare edge controls (Stage 11)

- TLS via Cloudflare
- Security headers (CSP, HSTS, etc.)
- Rate limiting on auth and flag endpoints
- No traditional Load Balancing unless multi-origin is justified

## Secrets

| Secret | Where |
|--------|-------|
| `SUPABASE_ANON_KEY` | Client-safe + edge |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/import/CI only |
| `SUPABASE_URL` | Config |
| Cloudflare API tokens | CI secrets only |
