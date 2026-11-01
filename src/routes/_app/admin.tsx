import { createFileRoute } from '@tanstack/react-router'
import { getAdmin } from '~/server/app.functions'

export const Route = createFileRoute('/_app/admin')({
  loader: () => getAdmin(),
  component: Admin,
})

const FUNNEL: [string, string][] = [
  ['landing_view', 'Landing views'],
  ['get_started', 'Get started clicks'],
  ['signup', 'Sign-ups'],
  ['path_started', 'Paths started'],
  ['plan_created', 'Plans created'],
  ['task_done', 'Tasks completed'],
  ['resume_made', 'Resumes made'],
  ['jobs_viewed', 'Jobs viewed'],
  ['coach_msg', 'Coach messages'],
  ['feedback', 'Feedback sent'],
]

function Admin() {
  const d = Route.useLoaderData()
  const max = Math.max(1, ...FUNNEL.map(([k]) => d.funnel[k] ?? 0))
  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-extrabold">Admin</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Users', d.users],
          ['Path 1 (explore)', d.explore],
          ['Path 2 (grow)', d.grow],
          ['Avg rating', d.avgRating ?? '—'],
        ].map(([k, v]) => (
          <div key={k} className="card">
            <p className="eyebrow">{k}</p>
            <p className="font-display text-3xl font-extrabold">{v}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="eyebrow mb-3">Funnel (all time)</h2>
        <div className="card space-y-2">
          {FUNNEL.map(([k, label]) => (
            <div key={k} className="grid grid-cols-[140px_1fr_48px] items-center gap-3 text-sm sm:grid-cols-[180px_1fr_60px]">
              <span>{label}</span>
              <span className="h-3 rounded bg-moss" style={{ width: `${((d.funnel[k] ?? 0) / max) * 100}%`, minWidth: 2 }} />
              <b className="text-right">{d.funnel[k] ?? 0}</b>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Latest feedback</h2>
        {d.feedback.length === 0 ? (
          <p className="text-mute">No feedback yet.</p>
        ) : (
          <ul className="card divide-y divide-line p-0">
            {d.feedback.map((f, i) => (
              <li key={i} className="flex gap-4 px-5 py-3 text-sm">
                <b className="w-8 shrink-0">{f.rating}/5</b>
                <span className="flex-1">{f.text || <span className="text-mute">—</span>}</span>
                <span className="text-mute">{f.at}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
