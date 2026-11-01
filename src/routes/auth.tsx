import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ErrorText, Logo } from '~/components/ui'
import { authClient } from '~/lib/auth-client'
import { getMe } from '~/server/app.functions'

const Search = z.object({
  mode: z.enum(['in', 'up']).catch('up'),
  next: z.enum(['explore', 'grow']).optional().catch(undefined),
})

export const Route = createFileRoute('/auth')({
  validateSearch: Search,
  loader: async () => {
    const me = await getMe()
    if (me.user) throw redirect({ to: '/home' })
    return me
  },
  component: AuthPage,
})

function AuthPage() {
  const { mode, next } = Route.useSearch()
  const { googleEnabled } = Route.useLoaderData()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(true)
  }, [])
  const isUp = mode === 'up'
  const after = next ? `/start?mode=${next}` : '/home'

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email') ?? '').trim()
    const password = String(f.get('password') ?? '')
    setBusy(true)
    setError('')
    const res = isUp
      ? await authClient.signUp.email({ email, password, name: String(f.get('name') ?? '').trim().slice(0, 60) || email.split('@')[0] })
      : await authClient.signIn.email({ email, password })
    setBusy(false)
    if (res.error) {
      setError(
        res.error.status === 429
          ? 'Too many tries. Wait a minute and try again.'
          : isUp
            ? res.error.message || 'Could not create your account.'
            : 'Email or password is incorrect.',
      )
      return
    }
    navigate({ href: after, replace: true })
  }

  async function google() {
    setBusy(true)
    await authClient.signIn.social({ provider: 'google', callbackURL: after })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col px-4 py-6">
      <Logo />
      <div className="my-auto py-10">
        <h1 className="text-3xl font-extrabold">{isUp ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-1 text-mute">{isUp ? 'Free. Your plan is saved so you can come back.' : 'Pick up where you left off.'}</p>

        {googleEnabled && (
          <>
            <button type="button" onClick={google} disabled={busy} className="btn-ghost mt-6 w-full py-2.5">
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.6 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
                <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z" />
              </svg>
              Continue with Google
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-mute">
              <span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" />
            </div>
          </>
        )}

        <form method="post" onSubmit={submit} className={`${googleEnabled ? '' : 'mt-6'} space-y-3`}>
          {isUp && (
            <input name="name" className="input" placeholder="First name" autoComplete="given-name" maxLength={60} aria-label="First name" />
          )}
          <input name="email" type="email" required className="input" placeholder="Email" autoComplete="email" maxLength={120} aria-label="Email" />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            className="input"
            placeholder={isUp ? 'Password (8+ characters)' : 'Password'}
            autoComplete={isUp ? 'new-password' : 'current-password'}
            aria-label="Password"
          />
          <ErrorText>{error}</ErrorText>
          <button className="btn w-full py-3" disabled={busy || !ready}>
            {busy ? 'Please wait…' : isUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-mute">
          {isUp ? 'Have an account? ' : 'New here? '}
          <Link to="/auth" search={{ mode: isUp ? 'in' : 'up', next }} className="font-bold text-moss">
            {isUp ? 'Sign in' : 'Create one'}
          </Link>
        </p>
        {isUp && (
          <p className="mt-3 text-center text-xs text-mute">
            By continuing you agree to our <Link to="/privacy" className="underline">privacy notice</Link>.
          </p>
        )}
      </div>
    </div>
  )
}
