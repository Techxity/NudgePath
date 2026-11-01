import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from './auth.server'
import { env } from './env.server'

/** Every private server function uses this. Route guards are UX only. */
export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const s = await auth.api.getSession({ headers: getRequestHeaders() as unknown as Headers })
  if (!s) throw new Error('Please sign in.')
  const isAdmin = env.ADMIN_EMAILS.includes(s.user.email.toLowerCase())
  return next({
    context: {
      user: { id: s.user.id, name: s.user.name, email: s.user.email, country: (s.user as { country?: string | null }).country ?? null, isAdmin },
    },
  })
})
