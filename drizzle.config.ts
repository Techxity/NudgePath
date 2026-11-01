import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL ?? 'file:./data/nudgepath.db'

export default defineConfig({
  schema: './src/server/schema.ts',
  dialect: url.startsWith('libsql://') ? 'turso' : 'sqlite',
  dbCredentials: url.startsWith('libsql://')
    ? { url, authToken: process.env.DATABASE_AUTH_TOKEN }
    : { url },
})
