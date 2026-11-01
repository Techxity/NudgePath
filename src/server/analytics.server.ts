import { db, schema } from './db.server'

export const EVENTS = ['landing_view', 'get_started', 'signup', 'path_started', 'roles_shown', 'plan_created', 'task_done', 'resume_made', 'coach_msg', 'jobs_viewed', 'feedback'] as const
export type EventName = (typeof EVENTS)[number]

export function track(name: EventName, userId?: string | null) {
  // fire-and-forget; analytics must never break a request
  db.insert(schema.event).values({ name, userId: userId ?? null }).catch(() => {})
}
