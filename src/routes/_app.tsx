import { Link, Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Logo } from '~/components/ui'
import { authClient } from '~/lib/auth-client'
import { getMe } from '~/server/app.functions'

export const Route = createFileRoute('/_app')({
  // UX guard only — every server function checks the session itself.
  beforeLoad: async () => {
    const me = await getMe()
    if (!me.user) throw redirect({ to: '/auth', search: { mode: 'in' }, replace: true })
    return { user: me.user }
  },
  component: AppLayout,
})

function AppLayout() {
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Logo small />
          <nav className="ml-auto flex items-center gap-1 text-sm font-bold">
            <Link to="/home" className="rounded-full px-3 py-1.5 text-mute hover:text-ink" activeProps={{ className: 'text-ink' }}>
              Dashboard
            </Link>
            <button
              className="rounded-full px-3 py-1.5 text-mute hover:text-ink"
              onClick={async () => {
                await authClient.signOut()
                navigate({ to: '/', replace: true })
              }}
              title={user.email}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
