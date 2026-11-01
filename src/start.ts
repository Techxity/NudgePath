import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'

const csrf = createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' })

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

/** Security headers on every response. */
const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next()
  const h = result.response.headers
  h.set('X-Content-Type-Options', 'nosniff')
  h.set('X-Frame-Options', 'DENY')
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (process.env.NODE_ENV === 'production') {
    h.set('Content-Security-Policy', CSP)
    h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  return result
})

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders, csrf],
}))
