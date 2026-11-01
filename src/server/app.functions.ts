import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { and, asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  COSTS,
  ChatOut,
  ExploreInput,
  GrowInput,
  PlanOut,
  ResumeOut,
  RolesOut,
  type Plan,
  type RoleOption,
} from '~/lib/types'
import { AIError, generate, userData } from './ai.server'
import { EVENTS, track } from './analytics.server'
import { auth, googleEnabled } from './auth.server'
import { QuotaError, creditsLeft, withCredits } from './credits.server'
import { db, schema } from './db.server'
import { liveJobs, sourcesFor } from './jobs.server'
import { authMiddleware } from './middleware'
import { chatTask, mock, planTask, resumeTask, rolesTask } from './prompts.server'

const id = () => crypto.randomUUID()

/** Turn known errors into friendly messages; hide everything else. */
async function safe<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof QuotaError || err instanceof AIError) throw new Error(err.message)
    if (err instanceof z.ZodError) throw new Error('Please check your answers and try again.')
    if (err instanceof Error && /sign in|not found/i.test(err.message)) throw err
    console.error(err)
    throw new Error('Something went wrong. Please try again.')
  }
}

async function ownPath(pathId: string, userId: string) {
  const p = await db.query.path.findFirst({
    where: and(eq(schema.path.id, pathId), eq(schema.path.userId, userId)),
  })
  if (!p) throw new Error('Path not found.')
  return p
}

/* ── Session (public) ───────────────────────────────── */

export const getMe = createServerFn({ method: 'GET' }).handler(async () => {
  const s = await auth.api.getSession({ headers: getRequestHeaders() as unknown as Headers })
  return {
    user: s ? { id: s.user.id, name: s.user.name, email: s.user.email } : null,
    googleEnabled,
  }
})

const PublicEvent = z.object({ name: z.enum(['landing_view', 'get_started']) })
export const trackPublic = createServerFn({ method: 'POST' })
  .validator(PublicEvent)
  .handler(async ({ data }) => {
    track(data.name)
    return { ok: true }
  })

/* ── Dashboard ──────────────────────────────────────── */

export const getDashboard = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const rows = await db.query.path.findMany({
      where: eq(schema.path.userId, context.user.id),
      orderBy: desc(schema.path.updatedAt),
    })
    const paths = rows.map((p) => {
      const plan = p.plan as Plan | null
      const total = plan ? plan.phases.reduce((n, ph) => n + ph.tasks.length, 0) : 0
      return {
        id: p.id,
        mode: p.mode,
        status: p.status,
        role: p.role,
        progress: total ? Math.round((p.done.length / total) * 100) : 0,
        weeks: plan ? plan.phases[plan.phases.length - 1].endWeek : null,
        createdAt: p.createdAt.toISOString(),
      }
    })
    return { user: context.user, paths, credits: await creditsLeft(context.user.id) }
  })

/* ── Journey 1: skills → roles ──────────────────────── */

export const startExplore = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(ExploreInput)
  .handler(({ data, context }) =>
    safe(async () => {
      const { task, content } = rolesTask(data)
      const out = await withCredits(context.user.id, COSTS.roles, () =>
        generate({ schema: RolesOut, task, messages: [{ role: 'user', content }], maxTokens: 900, mock: () => mock.roles(data) }),
      )
      const pathId = id()
      await db.insert(schema.path).values({
        id: pathId,
        userId: context.user.id,
        mode: 'explore',
        status: 'choosing',
        input: data,
        roles: out.roles.sort((a, b) => b.match - a.match),
      })
      await db.update(schema.user).set({ country: data.country }).where(eq(schema.user.id, context.user.id))
      track('path_started', context.user.id)
      track('roles_shown', context.user.id)
      return { pathId }
    }),
  )

export const chooseRole = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ pathId: z.string().uuid(), index: z.number().int().min(0).max(3) }))
  .handler(({ data, context }) =>
    safe(async () => {
      const p = await ownPath(data.pathId, context.user.id)
      const roles = (p.roles ?? []) as RoleOption[]
      const role = roles[data.index]
      if (!role || p.mode !== 'explore') throw new Error('Path not found.')
      const input = ExploreInput.parse(p.input)
      const { task, content } = planTask({ role: role.title, skills: input.skills, country: input.country, hours: input.hours, months: input.months })
      const plan = await withCredits(context.user.id, COSTS.plan, () =>
        generate({ schema: PlanOut, task, messages: [{ role: 'user', content }], maxTokens: 2200, mock: () => mock.plan(role.title, input.months) }),
      )
      await db
        .update(schema.path)
        .set({ status: 'active', role: role.title, plan, done: [], updatedAt: new Date() })
        .where(eq(schema.path.id, p.id))
      track('plan_created', context.user.id)
      return { ok: true }
    }),
  )

/* ── Journey 2: already learning → portfolio, resume, work ── */

export const startGrow = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(GrowInput)
  .handler(({ data, context }) =>
    safe(async () => {
      const { task, content } = planTask({ role: data.target, skills: data.skills, country: data.country, hours: data.hours, months: data.months, learning: data.learning, goal: data.goal })
      const plan = await withCredits(context.user.id, COSTS.plan, () =>
        generate({ schema: PlanOut, task, messages: [{ role: 'user', content }], maxTokens: 2200, mock: () => mock.plan(data.target, data.months) }),
      )
      const pathId = id()
      await db.insert(schema.path).values({
        id: pathId,
        userId: context.user.id,
        mode: 'grow',
        status: 'active',
        input: data,
        role: data.target,
        plan,
      })
      await db.update(schema.user).set({ country: data.country }).where(eq(schema.user.id, context.user.id))
      track('path_started', context.user.id)
      track('plan_created', context.user.id)
      return { pathId }
    }),
  )

/* ── Path ───────────────────────────────────────────── */

export const getPath = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(z.object({ pathId: z.string().uuid() }))
  .handler(({ data, context }) =>
    safe(async () => {
      const p = await ownPath(data.pathId, context.user.id)
      const messages = await db.query.message.findMany({
        where: eq(schema.message.pathId, p.id),
        orderBy: asc(schema.message.createdAt),
        limit: 60,
      })
      const input = p.input as { country: string; skills: string[]; months: number; hours: number }
      return {
        id: p.id,
        mode: p.mode,
        status: p.status,
        role: p.role,
        input,
        roles: (p.roles ?? null) as RoleOption[] | null,
        plan: (p.plan ?? null) as Plan | null,
        done: p.done,
        projectLinks: p.projectLinks,
        resume: (p.resume ?? null) as z.infer<typeof ResumeOut> | null,
        messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
        credits: await creditsLeft(context.user.id),
        userName: context.user.name,
        createdAt: p.createdAt.toISOString(),
      }
    }),
  )

export const toggleTask = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ pathId: z.string().uuid(), taskId: z.string().max(12), done: z.boolean() }))
  .handler(({ data, context }) =>
    safe(async () => {
      const p = await ownPath(data.pathId, context.user.id)
      const plan = p.plan as Plan | null
      const valid = new Set([
        ...(plan?.phases.flatMap((ph) => ph.tasks.map((t) => t.id)) ?? []),
        ...(plan?.projects.map((pr) => pr.id) ?? []),
      ])
      if (!valid.has(data.taskId)) throw new Error('Path not found.')
      const done = new Set(p.done)
      if (data.done) done.add(data.taskId)
      else done.delete(data.taskId)
      await db.update(schema.path).set({ done: [...done], updatedAt: new Date() }).where(eq(schema.path.id, p.id))
      if (data.done) track('task_done', context.user.id)
      return { done: [...done] }
    }),
  )

export const setProjectLink = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    z.object({
      pathId: z.string().uuid(),
      projectId: z.string().max(12),
      url: z.union([z.literal(''), z.string().url().max(200).refine((u) => /^https:\/\//.test(u), 'Use an https:// link')]),
    }),
  )
  .handler(({ data, context }) =>
    safe(async () => {
      const p = await ownPath(data.pathId, context.user.id)
      const links = { ...p.projectLinks }
      if (data.url) links[data.projectId] = data.url
      else delete links[data.projectId]
      await db.update(schema.path).set({ projectLinks: links, updatedAt: new Date() }).where(eq(schema.path.id, p.id))
      return { ok: true }
    }),
  )

export const makeResume = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ pathId: z.string().uuid(), background: z.string().max(1500).default('') }))
  .handler(({ data, context }) =>
    safe(async () => {
      const p = await ownPath(data.pathId, context.user.id)
      const plan = p.plan as Plan | null
      if (!plan || !p.role) throw new Error('Pick a role first.')
      const input = p.input as { skills: string[]; country: string }
      const done = new Set(p.done)
      const payload = {
        name: context.user.name,
        role: p.role,
        skills: input.skills,
        country: input.country,
        doneTasks: plan.phases.flatMap((ph) => ph.tasks).filter((t) => done.has(t.id)).map((t) => t.title),
        projects: plan.projects.map((pr) => ({ title: pr.title, brief: pr.brief, link: p.projectLinks[pr.id], done: done.has(pr.id) })),
        background: data.background,
      }
      const { task, content } = resumeTask(payload)
      const resume = await withCredits(context.user.id, COSTS.resume, () =>
        generate({ schema: ResumeOut, task, messages: [{ role: 'user', content }], maxTokens: 1400, mock: () => mock.resume(context.user.name, p.role!, input.skills) }),
      )
      await db.update(schema.path).set({ resume, updatedAt: new Date() }).where(eq(schema.path.id, p.id))
      track('resume_made', context.user.id)
      return resume
    }),
  )

export const sendChat = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ pathId: z.string().uuid(), text: z.string().trim().min(1).max(600) }))
  .handler(({ data, context }) =>
    safe(async () => {
      const p = await ownPath(data.pathId, context.user.id)
      const plan = p.plan as Plan | null
      if (!plan || !p.role) throw new Error('Pick a role first.')
      const history = await db.query.message.findMany({
        where: eq(schema.message.pathId, p.id),
        orderBy: desc(schema.message.createdAt),
        limit: 8,
      })
      const total = plan.phases.reduce((n, ph) => n + ph.tasks.length, 0)
      const system = chatTask({
        role: p.role,
        country: (p.input as { country: string }).country,
        summary: plan.summary,
        progress: `${p.done.length}/${total} tasks done`,
      })
      const messages = [
        ...history.reverse().map((m) => ({
          role: m.role,
          content: m.role === 'user' ? userData(m.content) : JSON.stringify({ reply: m.content }),
        })),
        { role: 'user' as const, content: userData(data.text) },
      ]
      const out = await withCredits(context.user.id, COSTS.chat, () =>
        generate({ schema: ChatOut, task: system, messages, maxTokens: 500, mock: mock.chat }),
      )
      const mine = { id: id(), pathId: p.id, userId: context.user.id, role: 'user' as const, content: data.text }
      const theirs = { id: id(), pathId: p.id, userId: context.user.id, role: 'assistant' as const, content: out.reply }
      await db.insert(schema.message).values([mine, { ...theirs, createdAt: new Date(Date.now() + 1) }])
      track('coach_msg', context.user.id)
      return { user: { id: mine.id, role: mine.role, content: mine.content }, reply: { id: theirs.id, role: theirs.role, content: theirs.content }, credits: await creditsLeft(context.user.id) }
    }),
  )

export const getJobs = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(z.object({ pathId: z.string().uuid(), term: z.string().trim().min(2).max(60) }))
  .handler(({ data, context }) =>
    safe(async () => {
      const p = await ownPath(data.pathId, context.user.id)
      const country = (p.input as { country: string }).country
      track('jobs_viewed', context.user.id)
      return { sources: sourcesFor(country, data.term), live: await liveJobs(data.term, country), country }
    }),
  )

export const deletePath = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ pathId: z.string().uuid() }))
  .handler(({ data, context }) =>
    safe(async () => {
      await ownPath(data.pathId, context.user.id)
      await db.delete(schema.path).where(and(eq(schema.path.id, data.pathId), eq(schema.path.userId, context.user.id)))
      return { ok: true }
    }),
  )

export const sendFeedback = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ pathId: z.string().uuid().optional(), rating: z.number().int().min(1).max(5), text: z.string().trim().max(1000).optional() }))
  .handler(({ data, context }) =>
    safe(async () => {
      await db.insert(schema.feedback).values({ id: id(), userId: context.user.id, pathId: data.pathId, rating: data.rating, text: data.text || null })
      track('feedback', context.user.id)
      return { ok: true }
    }),
  )

/** Deletes the account and everything tied to it (cascade). */
export const deleteAccount = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(({ context }) =>
    safe(async () => {
      await db.delete(schema.user).where(eq(schema.user.id, context.user.id))
      return { ok: true }
    }),
  )

/* ── Admin ──────────────────────────────────────────── */

export const getAdmin = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!context.user.isAdmin) throw new Error('Not found.')
    const [users, paths, fb, events] = await Promise.all([
      db.select({ id: schema.user.id }).from(schema.user),
      db.select({ mode: schema.path.mode, status: schema.path.status }).from(schema.path),
      db.query.feedback.findMany({ orderBy: desc(schema.feedback.createdAt), limit: 50 }),
      db.select({ name: schema.event.name }).from(schema.event),
    ])
    const counts = Object.fromEntries(EVENTS.map((e) => [e, 0])) as Record<string, number>
    for (const e of events) counts[e.name] = (counts[e.name] ?? 0) + 1
    return {
      users: users.length,
      explore: paths.filter((p) => p.mode === 'explore').length,
      grow: paths.filter((p) => p.mode === 'grow').length,
      funnel: counts,
      avgRating: fb.length ? +(fb.reduce((n, f) => n + f.rating, 0) / fb.length).toFixed(1) : null,
      feedback: fb.map((f) => ({ rating: f.rating, text: f.text, at: f.createdAt.toISOString().slice(0, 10) })),
    }
  })
