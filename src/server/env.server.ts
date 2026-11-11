const e = process.env

const int = (v: string | undefined, d: number) => {
  const n = Number.parseInt(v ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : d
}

export const env = {
  DATABASE_URL: e.DATABASE_URL || 'file:./data/nudgepath.db',
  DATABASE_AUTH_TOKEN: e.DATABASE_AUTH_TOKEN || '',
  BETTER_AUTH_URL: e.BETTER_AUTH_URL || 'http://localhost:3000',
  BETTER_AUTH_SECRET: e.BETTER_AUTH_SECRET || '',

  AI_PROVIDERS: (e.AI_PROVIDERS || 'gemini,groq,openrouter')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  AI_MOCK: e.AI_MOCK === '1',
  GEMINI_API_KEY: e.GEMINI_API_KEY || '',
  GEMINI_MODEL: e.GEMINI_MODEL || 'gemini-3.8-flash',
  GROQ_API_KEY: e.GROQ_API_KEY || '',
  GROQ_MODEL: e.GROQ_MODEL || 'openai/gpt-oss-20b',
  OPENROUTER_API_KEY: e.OPENROUTER_API_KEY || '',
  OPENROUTER_MODEL: e.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free',

  DAILY_CREDITS_PER_USER: int(e.DAILY_CREDITS_PER_USER, 20),
  DAILY_CREDITS_GLOBAL: int(e.DAILY_CREDITS_GLOBAL, 3000),

  ADMIN_EMAILS: (e.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  GOOGLE_CLIENT_ID: e.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: e.GOOGLE_CLIENT_SECRET || '',
  LIVE_JOBS: e.LIVE_JOBS !== '0',
  isProd: e.NODE_ENV === 'production',
}

if (env.isProd && env.BETTER_AUTH_SECRET.length < 32) {
  throw new Error('BETTER_AUTH_SECRET must be set (32+ chars) in production.')
}
