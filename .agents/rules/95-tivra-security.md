# 95 — TivraNews Security & Redirect Safety Rules

## 1. Zero Open Redirects
- Outbound affiliate links and tracked redirects must strictly validate against approved merchant allowlists.
- Never permit arbitrary unvalidated URL parameters to trigger uncontrolled redirects.

## 2. Secrets & Credential Protection
- Never expose API tokens (Cuelinks API token, Amazon keys, AdSense publisher secrets, Cloudflare tokens) in client-side bundles or public repositories.
- Keep credentials strictly in environment variables and secure secrets managers.
