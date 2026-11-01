# NudgePath

Turn the skills you have into work. Two paths:

1. **Find a role** — list your skills → 3 matching entry-level roles (fit %, skills you have, gaps, rough local pay) → pick one → week-by-week plan.
2. **Get hired** — already learning? → plan for what's left, portfolio projects, an AI-written resume (PDF), and job/freelance sites for your country + live remote listings.

Every path has: **Plan · Portfolio · Resume · Jobs · Coach**, progress tracking, a timeline, and a 1–5 feedback prompt. `/admin` shows the funnel and feedback.

## Stack

| | |
|---|---|
| App | TanStack Start (React 19, file routes, server functions) + Tailwind v4 |
| Auth | Better Auth — email + password, optional "Continue with Google" |
| DB | SQLite via Drizzle + libSQL. Local file in dev, [Turso](https://turso.tech) (free) in prod |
| AI | Free tiers with automatic fallback: Gemini → Groq → OpenRouter |
| Jobs | Region-aware search links + [Remotive](https://remotive.com) public API (cached 12h) |

## Run locally

```bash
npm install
cp .env.example .env          # set AI_MOCK=1 to try it without any API keys
npm run db:push               # creates data/nudgepath.db
npm run dev                   # http://localhost:3000
```

## Deploy (Netlify or Vercel, free)

1. Create a free Turso DB: `turso db create nudgepath` → copy URL + token.
2. Locally: `DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run db:push`
3. Push the repo to GitHub, import it in Netlify or Vercel (build command `npm run build`; the preset is detected automatically).
4. Add env vars from `.env.example` — at minimum `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, and one AI key.

Any Node host also works: `npm run build && npm start`.

## AI usage limits

- Each user gets `DAILY_CREDITS_PER_USER` (default 20) per day. Costs: find roles 2 · plan 3 · resume 2 · coach message 1.
- `DAILY_CREDITS_GLOBAL` caps the whole app per day so the free tiers can't be exhausted.
- Credits are reserved atomically before a call and refunded if the AI fails.
- Every call has a hard output-token cap; inputs are length-limited; chat sends only the last 8 messages.
- If a provider errors or rate-limits, the next one in `AI_PROVIDERS` is tried. AI output is validated against a schema before it is saved.

## Security

- All private server functions run `authMiddleware` and filter by the signed-in user's id (route guards are UX only).
- CSRF middleware on server functions; HTTP-only, SameSite=Lax, Secure cookies in prod; 14-day sessions.
- Rate limits on sign-in (5/min) and sign-up (3/min) per IP, stored in the DB so they work on serverless.
- Inputs validated with zod; AI output validated with zod; React escapes all rendered text (no `dangerouslySetInnerHTML`).
- User text is wrapped as data in prompts to reduce prompt injection. The model is told never to invent URLs; only `https://` links the user entered are rendered.
- Security headers in production: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.
- Secrets live only in `*.server.ts` files, which the build blocks from the client bundle.
- Users can delete a path or their whole account (cascades to all their data). `/privacy` explains what is stored.
- Admin is limited to `ADMIN_EMAILS`.

## Project layout

```
src/
  routes/            index (landing), auth, privacy, _app/{home,start,path.$id,admin}, api/auth/$
  server/
    app.functions.ts server functions (the API)
    ai.server.ts     providers, fallback, JSON validation
    prompts.server.ts prompts + mock answers
    credits.server.ts daily quotas
    jobs.server.ts   job sources by country + Remotive
    auth.server.ts   Better Auth config
    schema.ts        Drizzle tables
  lib/types.ts       shared zod schemas (inputs + AI output)
  start.ts           CSRF + security headers
```

## Analytics

Events (no payloads): landing_view, get_started, signup, path_started, roles_shown, plan_created, task_done, resume_made, jobs_viewed, coach_msg, feedback. See `/admin`.
