import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Logo } from '~/components/ui'
import { getMe, trackPublic } from '~/server/app.functions'

export const Route = createFileRoute('/')({
  loader: () => getMe(),
  component: Landing,
})

const PATHS = [
  {
    mode: 'explore' as const,
    tag: 'Path 1',
    title: 'I have skills, but no clear role',
    body: 'List what you can do. See roles that fit and what to learn to get hired.',
  },
  {
    mode: 'grow' as const,
    tag: 'Path 2',
    title: 'I’m learning and want to get hired',
    body: 'Get a plan, portfolio projects, a resume and jobs for your country.',
  },
]

function Landing() {
  const { user } = Route.useLoaderData()
  useEffect(() => {
    trackPublic({ data: { name: 'landing_view' } }).catch(() => {})
  }, [])
  const go = () => trackPublic({ data: { name: 'get_started' } }).catch(() => {})
  const startTo = user ? '/start' : '/auth'

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Logo />
        {user ? (
          <Link to="/home" className="btn-ghost btn-sm">Dashboard</Link>
        ) : (
          <Link to="/auth" search={{ mode: 'in' }} className="btn-ghost btn-sm">Sign in</Link>
        )}
      </header>

      <section className="pt-12 pb-14 sm:pt-20">
        <h1 className="max-w-3xl text-4xl font-extrabold sm:text-6xl">
          Turn your skills into <span className="text-moss">work</span>.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-mute">
          Get a clear role, a step-by-step plan and a timeline to learn and start earning.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to={startTo} onClick={go} className="btn px-7 py-3 text-lg">Get started — free</Link>
          <span className="text-sm text-mute">Takes 2 minutes</span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {PATHS.map((p) => (
          <Link
            key={p.mode}
            to={startTo}
            search={user ? { mode: p.mode } : { mode: 'up', next: p.mode }}
            onClick={go}
            className="card group block transition hover:border-ink"
          >
            <span className="eyebrow">{p.tag}</span>
            <h2 className="mt-2 text-2xl font-bold">{p.title}</h2>
            <p className="mt-2 text-mute">{p.body}</p>
            <span className="mt-4 inline-block font-bold text-moss group-hover:underline">Start →</span>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 border-t border-line py-14 mt-14 sm:grid-cols-3">
        {[
          ['1', 'Tell us', 'Your skills, country and time you have.'],
          ['2', 'Get a path', 'A role, what to learn, and a week-by-week plan.'],
          ['3', 'Earn', 'Portfolio, resume and jobs that fit your region.'],
        ].map(([n, t, d]) => (
          <div key={n}>
            <span className="font-display text-3xl font-extrabold text-moss">{n}</span>
            <h3 className="mt-1 text-lg font-bold">{t}</h3>
            <p className="text-mute">{d}</p>
          </div>
        ))}
      </section>

      <footer className="flex flex-wrap justify-between gap-2 border-t border-line py-6 text-sm text-mute">
        <span>© NudgePath</span>
        <Link to="/privacy" className="hover:text-ink">Privacy</Link>
      </footer>
    </div>
  )
}
