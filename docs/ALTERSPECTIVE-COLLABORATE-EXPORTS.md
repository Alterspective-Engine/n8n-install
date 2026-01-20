# Alterspective Collaborate: Export Renderer (DOCX / PPTX / HTML)

This `n8n-install` stack can provide a **secure webhook** that the Alterspective Collaborate server calls to render:
- `docx`
- `pptx` (summary now; full-deck later)
- `html` (standalone/self-contained via `standalone + embed-resources`)

It uses a dedicated internal `pandoc-renderer` HTTP service (wrapping the `pandoc` CLI) and keeps automation **manual in v1**.

## What’s Included

- Docker service: `pandoc-renderer` (internal-only, no public ports)
- n8n workflow JSON: `n8n/backup/workflows/alterspective-collaborate-render-document-v1.json`

## Setup (n8n-install)

1) Ensure the `n8n` profile is enabled (see `.env` → `COMPOSE_PROFILES`).

2) Start services (per your normal install/run process).

3) In n8n UI, create a **Header Auth** credential:
   - Name: `alterspective-collaborate-api-key`
   - Header name: `X-N8N-API-KEY`
   - Header value: your shared secret

4) Import and activate the workflow:
   - File: `n8n/backup/workflows/alterspective-collaborate-render-document-v1.json`
   - Activate the workflow so the **production** webhook URL works.

## Configure Alterspective Collaborate (server)

Set these env vars on the collaboration server:

```bash
AUTOMATION_ENABLED=true
N8N_WEBHOOK_URL=https://<your-n8n-host>/webhook/alterspective-collaborate-render-v1
N8N_API_KEY=<same secret as the n8n credential>
N8N_API_KEY_HEADER=X-N8N-API-KEY
```

## Smoke Test (curl)

```bash
curl -X POST "https://<your-n8n-host>/webhook/alterspective-collaborate-render-v1" ^
  -H "Content-Type: application/json" ^
  -H "X-N8N-API-KEY: <secret>" ^
  --data "{\"format\":\"docx\",\"markdown\":\"# Hello\\n\\nThis is a test.\"}"
```

Expected response (JSON from `pandoc-renderer`):
- `{ "output": "...", "base64": true }` for `docx` / `pptx`
- `{ "output": "<html>...", "base64": false }` for `html`

## Security Notes

- Keep the webhook URL private (treat as an internal API).
- Use Cloudflare WAF/IP allowlists for `/webhook/*` where possible.
- Rotate `X-N8N-API-KEY` if it’s ever exposed.
