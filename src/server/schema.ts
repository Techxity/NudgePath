import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core'

const ts = (name: string) => integer(name, { mode: 'timestamp_ms' })
const now = () => new Date()

/* ── Better Auth tables ─────────────────────────────── */
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  country: text('country'),
  createdAt: ts('created_at').notNull().$defaultFn(now),
  updatedAt: ts('updated_at').notNull().$defaultFn(now),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: ts('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: ts('created_at').notNull().$defaultFn(now),
  updatedAt: ts('updated_at').notNull().$defaultFn(now),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: ts('access_token_expires_at'),
  refreshTokenExpiresAt: ts('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: ts('created_at').notNull().$defaultFn(now),
  updatedAt: ts('updated_at').notNull().$defaultFn(now),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: ts('expires_at').notNull(),
  createdAt: ts('created_at').$defaultFn(now),
  updatedAt: ts('updated_at').$defaultFn(now),
})

export const rateLimit = sqliteTable('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: integer('last_request').notNull(),
})

/* ── App tables ─────────────────────────────────────── */

/** A user's journey: "explore" (skills → role) or "grow" (already learning → hired). */
export const path = sqliteTable(
  'path',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    mode: text('mode', { enum: ['explore', 'grow'] }).notNull(),
    /** choosing = explore user still picking a role; active = has a plan */
    status: text('status', { enum: ['choosing', 'active'] }).notNull(),
    input: text('input', { mode: 'json' }).notNull(),
    roles: text('roles', { mode: 'json' }),
    role: text('role'),
    plan: text('plan', { mode: 'json' }),
    done: text('done', { mode: 'json' }).$type<string[]>().notNull().$defaultFn(() => []),
    projectLinks: text('project_links', { mode: 'json' }).$type<Record<string, string>>().notNull().$defaultFn(() => ({})),
    resume: text('resume', { mode: 'json' }),
    createdAt: ts('created_at').notNull().$defaultFn(now),
    updatedAt: ts('updated_at').notNull().$defaultFn(now),
  },
  (t) => [index('path_user_idx').on(t.userId)],
)

export const message = sqliteTable(
  'message',
  {
    id: text('id').primaryKey(),
    pathId: text('path_id').notNull().references(() => path.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull(),
    createdAt: ts('created_at').notNull().$defaultFn(now),
  },
  (t) => [index('message_path_idx').on(t.pathId)],
)

/** Daily AI credits per user ("*" = global counter). */
export const usage = sqliteTable(
  'usage',
  {
    userId: text('user_id').notNull(),
    day: text('day').notNull(),
    credits: integer('credits').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
)

export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  pathId: text('path_id'),
  rating: integer('rating').notNull(),
  text: text('text'),
  createdAt: ts('created_at').notNull().$defaultFn(now),
})

/** Minimal product analytics: event name + optional user, no payloads. */
export const event = sqliteTable(
  'event',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    userId: text('user_id'),
    createdAt: ts('created_at').notNull().$defaultFn(now),
  },
  (t) => [index('event_name_idx').on(t.name)],
)

export const jobsCache = sqliteTable('jobs_cache', {
  key: text('key').primaryKey(),
  data: text('data', { mode: 'json' }).notNull(),
  fetchedAt: ts('fetched_at').notNull(),
})
