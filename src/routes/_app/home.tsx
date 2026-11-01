import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Credits, ErrorText } from '~/components/ui'
import { authClient } from '~/lib/auth-client'
import { deleteAccount, deletePath, getDashboard } from '~/server/app.functions'

export const Route = createFileRoute('/_app/home')({
  loader: () => getDashboard(),
  component: Home,
})

function Home() {
  const { user, paths, credits } = Route.useLoaderData()
  const router = useRouter()
  const first = user.name.split(' ')[0]

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Hi {first}</h1>
          <p className="text-mute">{paths.length ? 'Pick up where you left off.' : 'Let’s find your path.'}</p>
        </div>
        <Credits {...credits} />
      </div>

      {paths.length > 0 && (
        <section className="space-y-3">
          <h2 className="eyebrow">Your paths</h2>
          {paths.map((p) => (
            <div key={p.id} className="card flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="eyebrow">{p.mode === 'explore' ? 'Find a role' : 'Get hired'}</p>
                <h3 className="truncate text-xl font-bold">{p.role ?? 'Choose your role'}</h3>
                {p.status === 'active' ? (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 w-40 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-moss" style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="text-sm text-mute">
                      {p.progress}% · {p.weeks} weeks
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-mute">3 roles matched — pick one to get your plan.</p>
                )}
              </div>
              <Link to="/path/$id" params={{ id: p.id }} className="btn btn-sm">
                {p.status === 'active' ? 'Continue' : 'Choose role'}
              </Link>
              <button
                className="text-sm text-mute hover:text-flag"
                onClick={async () => {
                  if (!confirm('Delete this path?')) return
                  await deletePath({ data: { pathId: p.id } })
                  router.invalidate()
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2 className="eyebrow mb-3">{paths.length ? 'Start a new path' : 'Choose a path'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/start" search={{ mode: 'explore' }} className="card block transition hover:border-ink">
            <h3 className="text-xl font-bold">I have skills, no clear role</h3>
            <p className="mt-1 text-mute">See roles that fit and what to learn.</p>
          </Link>
          <Link to="/start" search={{ mode: 'grow' }} className="card block transition hover:border-ink">
            <h3 className="text-xl font-bold">I’m learning, want to get hired</h3>
            <p className="mt-1 text-mute">Plan, portfolio, resume and jobs.</p>
          </Link>
        </div>
      </section>

      <Account />
    </div>
  )
}

function Account() {
  const [error, setError] = useState('')
  return (
    <details className="border-t border-line pt-6 text-sm">
      <summary className="cursor-pointer text-mute">Account & data</summary>
      <div className="mt-3 space-y-2 text-mute">
        <p>We store your name, email, the answers you give and your plans. Nothing is sold or shared.</p>
        <button
          className="font-bold text-flag hover:underline"
          onClick={async () => {
            if (!confirm('Delete your account and all your data? This cannot be undone.')) return
            try {
              await deleteAccount()
              await authClient.signOut().catch(() => {})
              window.location.href = '/'
            } catch (e) {
              setError((e as Error).message)
            }
          }}
        >
          Delete my account
        </button>
        <ErrorText>{error}</ErrorText>
      </div>
    </details>
  )
}
