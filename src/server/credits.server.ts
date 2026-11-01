import { and, eq, sql } from 'drizzle-orm'
import { db, schema } from './db.server'
import { env } from './env.server'

const today = () => new Date().toISOString().slice(0, 10)

export class QuotaError extends Error {}

async function bump(userId: string, cost: number, limit: number) {
  const day = today()
  const rows = await db
    .insert(schema.usage)
    .values({ userId, day, credits: cost })
    .onConflictDoUpdate({
      target: [schema.usage.userId, schema.usage.day],
      set: { credits: sql`${schema.usage.credits} + ${cost}` },
      setWhere: sql`${schema.usage.credits} + ${cost} <= ${limit}`,
    })
    .returning({ credits: schema.usage.credits })
  return rows.length > 0
}

async function refund(userId: string, cost: number) {
  await db
    .update(schema.usage)
    .set({ credits: sql`max(0, ${schema.usage.credits} - ${cost})` })
    .where(and(eq(schema.usage.userId, userId), eq(schema.usage.day, today())))
}

/** Reserve credits up front, run the AI call, refund if it fails. */
export async function withCredits<T>(userId: string, cost: number, fn: () => Promise<T>): Promise<T> {
  if (!(await bump('*', cost, env.DAILY_CREDITS_GLOBAL))) {
    throw new QuotaError('NudgePath has hit today’s free AI limit. Please come back tomorrow.')
  }
  if (!(await bump(userId, cost, env.DAILY_CREDITS_PER_USER))) {
    await refund('*', cost)
    throw new QuotaError('You’ve used today’s AI credits. They reset at midnight (UTC).')
  }
  try {
    return await fn()
  } catch (err) {
    await refund(userId, cost)
    await refund('*', cost)
    throw err
  }
}

export async function creditsLeft(userId: string) {
  const row = await db.query.usage.findFirst({
    where: and(eq(schema.usage.userId, userId), eq(schema.usage.day, today())),
  })
  return { left: Math.max(0, env.DAILY_CREDITS_PER_USER - (row?.credits ?? 0)), total: env.DAILY_CREDITS_PER_USER }
}
