import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db, schema } from './db.server'
import { env } from './env.server'
import { track } from './analytics.server'

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET || 'dev-only-secret-change-me-dev-only-secret',
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      rateLimit: schema.rateLimit,
    },
  }),
  user: {
    additionalFields: { country: { type: 'string', required: false, input: true } },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 days
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 60,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 3 },
    },
  },
  advanced: {
    // Hosts like Vercel/Netlify/Cloudflare set these; used for per-IP rate limits.
    ipAddress: { ipAddressHeaders: ['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for'] },
    useSecureCookies: env.isProd,
    defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: env.isProd },
  },
  trustedOrigins: [env.BETTER_AUTH_URL],
  databaseHooks: {
    user: { create: { after: async (u) => track('signup', u.id) } },
  },
  plugins: [tanstackStartCookies()],
})

export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
