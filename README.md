# NEXORA AI — GymBot 💪

Secure WhatsApp AI automation for gyms. Captures trial leads, follows up automatically, converts to members.

**Stack:** Fastify · Groq (LLaMA 3.3) · Supabase · Twilio · node-cron

---

## Why this stack
- **Fastify** — 3x faster than Express, with JSON schema validation that rejects malformed/malicious requests *before* they reach your code.
- **Groq** — free, fast LLM inference.
- **Supabase** — Postgres with parameterized queries (SQL-injection safe) and a free tier.
- **Twilio** — for demo/testing. Swap to Meta Cloud API for production clients (one function change).

---

## Security features (built in)

| Threat | Protection |
|---|---|
| Fake webhook requests | Twilio signature validation on every incoming message |
| DDoS / bill-spike | Global rate limiting (100 req/min, auto-ban abusers) |
| API key brute-force | Timing-safe key comparison, header-only (never query string) |
| SQL injection | Supabase parameterized queries, no raw SQL anywhere |
| Oversized payloads | 64KB body limit, input length caps |
| Malformed input | JSON schema validation on all admin routes |
| Prompt injection | AI system prompt has hard guardrails + scope limits |
| XSS / clickjacking | Helmet secure headers |
| Leaked secrets | All secrets in env; config fails fast if missing/weak |
| Lead PII exposure | Admin routes auth-gated; Supabase RLS enabled |

---

## Setup

```bash
npm install
cp .env.example .env        # fill in your keys
# generate a strong admin key:
openssl rand -hex 24
```

Run `schema.sql` in your Supabase SQL editor.

**Important:** In `SUPABASE_KEY` use the **service_role** key (not anon), and keep RLS enabled — this blocks anyone with your public anon key from reading leads.

```bash
npm start
```

For local testing, expose with ngrok and set `PUBLIC_URL` to the ngrok URL:
```bash
ngrok http 3000
```
Point your Twilio WhatsApp webhook to `https://<your-url>/whatsapp/webhook`.

> The `PUBLIC_URL` **must exactly match** the URL Twilio calls, or signature validation will (correctly) reject every request.

---

## Admin API

All routes require header `x-api-key: <ADMIN_API_KEY>`.

```bash
# Mark a lead as paid member (stops follow-ups)
curl -X POST https://your-url/admin/member \
  -H "x-api-key: YOUR_KEY" -H "content-type: application/json" \
  -d '{"phone":"+919XXXXXXXXX"}'

# View all leads
curl https://your-url/admin/leads -H "x-api-key: YOUR_KEY"

# Broadcast offer to all trial leads ({name} is personalised)
curl -X POST https://your-url/admin/broadcast \
  -H "x-api-key: YOUR_KEY" -H "content-type: application/json" \
  -d '{"message":"Hi {name}! ₹500 off this week 🔥"}'
```

---

## Per-client deployment
1. Set the `GYM_*` env vars for the client
2. Deploy a fresh instance (Koyeb / Render free tier)
3. Point that gym's WhatsApp webhook to the new instance
4. ~30 minutes per client

---

Built by NEXORA AI · nexora-ai.carrd.co
