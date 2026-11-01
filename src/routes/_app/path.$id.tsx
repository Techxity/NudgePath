import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { Credits, ErrorText, Spinner, Thinking } from '~/components/ui'
import { COSTS, type Plan, type Resume } from '~/lib/types'
import { chooseRole, getJobs, getPath, makeResume, sendChat, sendFeedback, setProjectLink, toggleTask } from '~/server/app.functions'

const TABS = ['plan', 'portfolio', 'resume', 'jobs', 'coach'] as const
type Tab = (typeof TABS)[number]

export const Route = createFileRoute('/_app/path/$id')({
  validateSearch: z.object({ tab: z.enum(TABS).optional().catch(undefined) }),
  loader: ({ params }) => getPath({ data: { pathId: params.id } }),
  component: PathPage,
})

type Data = Awaited<ReturnType<typeof getPath>>

function PathPage() {
  const data = Route.useLoaderData()
  if (data.status === 'choosing') return <RolePicker data={data} />
  return <ActivePath data={data} />
}

/* ── Journey 1, step 2: pick a role ─────────────────── */

function RolePicker({ data }: { data: Data }) {
  const router = useRouter()
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')
  if (busy !== null) return <Thinking lines={[`Planning your path to ${data.roles![busy].title}…`, 'About 15 seconds']} />
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Roles that fit you</p>
          <h1 className="text-3xl font-extrabold">Pick one to plan</h1>
        </div>
        <Credits {...data.credits} />
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="grid gap-4 md:grid-cols-3">
        {data.roles!.map((r, i) => (
          <div key={r.title} className="card flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xl font-bold">{r.title}</h2>
              <span className="shrink-0 rounded-full bg-moss-soft px-2.5 py-0.5 text-sm font-bold text-moss">{r.match}%</span>
            </div>
            <p className="mt-2 text-mute">{r.why}</p>
            <p className="mt-4 eyebrow">You have</p>
            <p className="text-sm">{r.have.join(' · ') || '—'}</p>
            <p className="mt-3 eyebrow">To learn</p>
            <p className="text-sm">{r.learn.join(' · ')}</p>
            <p className="mt-3 text-sm text-mute">{r.pay}</p>
            <span className="flex-1" />
            <button
              className="btn mt-5 w-full"
              onClick={async () => {
                setBusy(i)
                setError('')
                try {
                  await chooseRole({ data: { pathId: data.id, index: i } })
                  await router.invalidate()
                } catch (e) {
                  setError((e as Error).message)
                }
                setBusy(null)
              }}
            >
              Plan this role
            </button>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-mute">Planning uses {COSTS.plan} AI credits</p>
    </div>
  )
}

/* ── Active path ────────────────────────────────────── */

function currentWeek(createdAt: string) {
  return Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / (7 * 864e5)) + 1)
}

function ActivePath({ data }: { data: Data }) {
  const { tab = 'plan' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const plan = data.plan!
  const [done, setDone] = useState<string[]>(data.done)
  const [credits, setCredits] = useState(data.credits)
  useEffect(() => {
    setDone(data.done)
  }, [data.done])

  const taskIds = plan.phases.flatMap((p) => p.tasks.map((t) => t.id))
  const pct = Math.round((taskIds.filter((t) => done.includes(t)).length / taskIds.length) * 100)
  const weeks = plan.phases[plan.phases.length - 1].endWeek
  const week = Math.min(weeks, currentWeek(data.createdAt))

  async function toggle(taskId: string, on: boolean) {
    setDone((d) => (on ? [...d, taskId] : d.filter((x) => x !== taskId)))
    try {
      const r = await toggleTask({ data: { pathId: data.id, taskId, done: on } })
      setDone(r.done)
    } catch {
      setDone((d) => (on ? d.filter((x) => x !== taskId) : [...d, taskId]))
    }
  }

  return (
    <div>
      <div className="no-print">
        <p className="eyebrow">{data.mode === 'explore' ? 'Your role' : 'Getting hired as'}</p>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{data.role}</h1>
        <p className="mt-2 max-w-2xl text-mute">{plan.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="h-2 w-32 overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full bg-moss" style={{ width: `${pct}%` }} />
            </span>
            <b>{pct}%</b>
          </span>
          <span className="text-mute">
            Week <b className="text-ink">{week}</b> of {weeks}
          </span>
          <span className="ml-auto">
            <Credits {...credits} />
          </span>
        </div>

        <nav className="-mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => navigate({ search: { tab: t }, replace: true })}
              aria-current={tab === t ? 'page' : undefined}
              className={`-mb-px border-b-[3px] px-3 py-2.5 text-sm font-bold capitalize ${tab === t ? 'border-sun text-ink' : 'border-transparent text-mute hover:text-ink'}`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      <div className="pt-6">
        {tab === 'plan' && <PlanTab plan={plan} done={done} week={week} onToggle={toggle} />}
        {tab === 'portfolio' && <PortfolioTab data={data} done={done} onToggle={toggle} />}
        {tab === 'resume' && <ResumeTab data={data} onCredits={setCredits} />}
        {tab === 'jobs' && <JobsTab data={data} />}
        {tab === 'coach' && <CoachTab data={data} onCredits={setCredits} />}
      </div>

      <Feedback pathId={data.id} />
    </div>
  )
}

function Check({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition ${on ? 'border-moss bg-moss text-paper' : 'border-line hover:border-ink'}`}
    >
      {on && (
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path d="M2.5 7.5l3 3 6-7" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

function PlanTab({ plan, done, week, onToggle }: { plan: Plan; done: string[]; week: number; onToggle: (id: string, on: boolean) => void }) {
  return (
    <ol className="space-y-8">
      {plan.phases.map((ph, i) => {
        const now = week >= ph.startWeek && week <= ph.endWeek
        const finished = ph.tasks.every((t) => done.includes(t.id))
        return (
          <li key={ph.name + i} className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <span className={`size-3 rounded-full ${finished ? 'bg-moss' : now ? 'bg-sun' : 'bg-line'}`} />
                <h2 className="text-xl font-bold">{ph.name}</h2>
              </div>
              <p className="mt-1 text-sm text-mute">
                Weeks {ph.startWeek}–{ph.endWeek}
                {now && <b className="ml-1 text-ink">· now</b>}
              </p>
            </div>
            <div className="card p-0">
              <p className="border-b border-line px-5 py-3 text-sm text-mute">{ph.goal}</p>
              <ul className="divide-y divide-line">
                {ph.tasks.map((t) => {
                  const on = done.includes(t.id)
                  return (
                    <li key={t.id} className="flex gap-3 px-5 py-4">
                      <Check on={on} onChange={(v) => onToggle(t.id, v)} label={t.title} />
                      <div className="min-w-0">
                        <p className={`font-bold ${on ? 'text-mute line-through' : ''}`}>{t.title}</p>
                        <p className="text-sm text-mute">{t.detail}</p>
                        <p className="mt-1 text-xs text-mute">
                          ~{t.hours}h
                          {t.resource && t.resource !== 'Practice' && (
                            <>
                              {' · '}
                              <a
                                className="font-bold text-moss hover:underline"
                                href={`https://www.google.com/search?q=${encodeURIComponent(t.resource + ' free')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {t.resource} ↗
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function PortfolioTab({ data, done, onToggle }: { data: Data; done: string[]; onToggle: (id: string, on: boolean) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-mute">Build these to prove you can do the job. Add a link when each one is live.</p>
      {data.plan!.projects.map((p) => (
        <ProjectCard key={p.id} pathId={data.id} project={p} link={data.projectLinks[p.id] ?? ''} done={done.includes(p.id)} onToggle={onToggle} />
      ))}
    </div>
  )
}

function ProjectCard({
  pathId,
  project,
  link,
  done,
  onToggle,
}: {
  pathId: string
  project: Plan['projects'][number]
  link: string
  done: boolean
  onToggle: (id: string, on: boolean) => void
}) {
  const [url, setUrl] = useState(link)
  const [state, setState] = useState<'' | 'saving' | 'saved'>('')
  const [error, setError] = useState('')
  return (
    <div className="card">
      <div className="flex gap-3">
        <Check on={done} onChange={(v) => onToggle(project.id, v)} label={`${project.title} done`} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold">{project.title}</h3>
          <p className="text-mute">{project.brief}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {project.skills.map((s) => (
              <span key={s} className="rounded-md bg-moss-soft px-2 py-0.5 text-xs font-bold text-moss">{s}</span>
            ))}
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              setState('saving')
              setError('')
              try {
                await setProjectLink({ data: { pathId, projectId: project.id, url: url.trim() } })
                setState('saved')
              } catch (err) {
                setError((err as Error).message.includes('https') ? 'Use a full https:// link.' : (err as Error).message)
                setState('')
              }
            }}
          >
            <input className="input py-2 text-sm" type="url" placeholder="https://… link to your work" value={url} maxLength={200} onChange={(e) => { setUrl(e.target.value); setState('') }} aria-label="Project link" />
            <button className="btn-ghost btn-sm shrink-0" disabled={state === 'saving'}>{state === 'saved' ? 'Saved' : 'Save'}</button>
          </form>
          <ErrorText>{error}</ErrorText>
        </div>
      </div>
    </div>
  )
}

function ResumeTab({ data, onCredits }: { data: Data; onCredits: (c: Data['credits']) => void }) {
  const router = useRouter()
  const [resume, setResume] = useState<Resume | null>(data.resume)
  const [background, setBackground] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(!data.resume)

  async function make() {
    setBusy(true)
    setError('')
    try {
      setResume(await makeResume({ data: { pathId: data.id, background } }))
      setEditing(false)
      onCredits({ ...data.credits, left: Math.max(0, data.credits.left - COSTS.resume) })
      router.invalidate()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <div className="space-y-6">
      {editing && (
        <div className="card no-print space-y-3">
          <label className="label" htmlFor="bg">Work, school or volunteering (optional)</label>
          <textarea
            id="bg"
            className="input min-h-28"
            maxLength={1500}
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder={'e.g. Sales rep, Shoprite Ikeja, 2022–2024\nBSc Economics, UNILAG, 2021'}
          />
          <p className="text-xs text-mute">We only use what you write here plus your plan and projects. Nothing is made up.</p>
          <ErrorText>{error}</ErrorText>
          <button className="btn" onClick={make} disabled={busy}>
            {busy ? <Spinner label="Writing…" /> : resume ? 'Rewrite resume' : 'Write my resume'}
          </button>
          <span className="ml-3 text-xs text-mute">{COSTS.resume} credits</span>
        </div>
      )}

      {resume && (
        <>
          <div className="no-print flex flex-wrap gap-2">
            <button className="btn btn-sm" onClick={() => window.print()}>Download PDF</button>
            {!editing && <button className="btn-ghost btn-sm" onClick={() => setEditing(true)}>Rewrite</button>}
          </div>
          <article className="card print-page mx-auto max-w-3xl space-y-5 p-8 text-[15px] leading-relaxed">
            <header>
              <h2 className="text-3xl font-extrabold">{data.userName}</h2>
              <p className="font-bold text-moss">{resume.headline}</p>
              <p className="text-sm text-mute">{data.input.country}</p>
            </header>
            <p>{resume.summary}</p>
            <Section title="Skills">
              <p>{resume.skills.join(' · ')}</p>
            </Section>
            {resume.projects.length > 0 && (
              <Section title="Projects">
                {resume.projects.map((p) => (
                  <div key={p.title} className="mb-3">
                    <p className="font-bold">
                      {p.title}
                      {p.link && /^https:\/\//.test(p.link) && (
                        <a href={p.link} className="ml-2 text-sm font-normal text-moss underline" target="_blank" rel="noopener noreferrer">
                          {p.link.replace(/^https:\/\//, '')}
                        </a>
                      )}
                    </p>
                    <ul className="list-disc pl-5">{p.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                  </div>
                ))}
              </Section>
            )}
            {resume.experience.length > 0 && (
              <Section title="Experience">
                {resume.experience.map((x) => (
                  <div key={x.role + x.org} className="mb-3">
                    <p className="font-bold">
                      {x.role}, {x.org} <span className="font-normal text-mute">· {x.period}</span>
                    </p>
                    <ul className="list-disc pl-5">{x.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                  </div>
                ))}
              </Section>
            )}
            {resume.education.length > 0 && (
              <Section title="Education">
                {resume.education.map((e) => <p key={e}>{e}</p>)}
              </Section>
            )}
          </article>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 border-b border-line pb-1 text-xs font-bold uppercase tracking-wider text-mute">{title}</h3>
      {children}
    </section>
  )
}

function JobsTab({ data }: { data: Data }) {
  const terms = data.plan!.searchTerms
  const [term, setTerm] = useState(terms[0] ?? data.role ?? '')
  const [res, setRes] = useState<Awaited<ReturnType<typeof getJobs>> | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    setBusy(true)
    setError('')
    getJobs({ data: { pathId: data.id, term } })
      .then((r) => live && setRes(r))
      .catch((e) => live && setError((e as Error).message))
      .finally(() => live && setBusy(false))
    return () => {
      live = false
    }
  }, [term, data.id])

  const local = res?.sources.filter((s) => s.local) ?? []
  const global = res?.sources.filter((s) => !s.local) ?? []

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-1.5">
        {terms.map((t) => (
          <button key={t} className={`chip ${t === term ? 'chip-on' : 'hover:border-ink'}`} onClick={() => setTerm(t)}>
            {t}
          </button>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>
      {res && (
        <>
          {local.length > 0 && <SourceList title={`In ${res.country}`} items={local} />}
          <SourceList title="Remote & freelance" items={global} />
          <section>
            <h2 className="eyebrow mb-3">Open remote roles</h2>
            {busy ? (
              <Spinner label="Loading…" />
            ) : res.live.length ? (
              <ul className="card divide-y divide-line p-0">
                {res.live.map((j) => (
                  <li key={j.url}>
                    <a href={j.url} target="_blank" rel="noopener noreferrer" className="flex flex-wrap items-baseline gap-x-3 px-5 py-3 hover:bg-moss-soft/50">
                      <span className="font-bold">{j.title}</span>
                      <span className="text-sm text-mute">{j.company}</span>
                      <span className="ml-auto text-xs text-mute">{j.location || 'Remote'}{j.type && ` · ${j.type}`}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-mute">No open remote roles for “{term}” right now. Try another search above.</p>
            )}
            <p className="mt-2 text-xs text-mute">Listings via Remotive. Always check a job is real before sharing personal details.</p>
          </section>
        </>
      )}
      {!res && busy && <Spinner label="Loading…" />}
    </div>
  )
}

function SourceList({ title, items }: { title: string; items: { name: string; kind: string; url: string }[] }) {
  return (
    <section>
      <h2 className="eyebrow mb-3">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="card flex items-center justify-between py-3 hover:border-ink">
            <span className="font-bold">{s.name}</span>
            <span className="text-xs text-mute">{s.kind === 'freelance' ? 'Freelance' : 'Jobs'} ↗</span>
          </a>
        ))}
      </div>
    </section>
  )
}

function CoachTab({ data, onCredits }: { data: Data; onCredits: (c: Data['credits']) => void }) {
  const [msgs, setMsgs] = useState(data.messages)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [msgs.length, busy])
  const starters = useMemo(
    () => ['What should I focus on this week?', 'How do I find my first client?', 'Is my timeline realistic?'],
    [],
  )

  async function send(q: string) {
    const t = q.trim()
    if (!t || busy) return
    setBusy(true)
    setError('')
    setText('')
    const temp = { id: 'tmp', role: 'user' as const, content: t }
    setMsgs((m) => [...m, temp])
    try {
      const r = await sendChat({ data: { pathId: data.id, text: t } })
      setMsgs((m) => [...m.filter((x) => x.id !== 'tmp'), r.user, r.reply])
      onCredits(r.credits)
    } catch (e) {
      setMsgs((m) => m.filter((x) => x.id !== 'tmp'))
      setText(t)
      setError((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <div className="card flex h-[min(620px,70dvh)] flex-col p-0">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {msgs.length === 0 && (
          <div className="py-6 text-center">
            <p className="font-bold">Ask your coach anything about your path.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {starters.map((s) => (
                <button key={s} className="chip border-dashed hover:border-ink" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 ${m.role === 'user' ? 'ml-auto rounded-br-md bg-ink text-paper' : 'rounded-bl-md bg-moss-soft'}`}
          >
            {m.content}
          </div>
        ))}
        {busy && <Spinner label="Thinking…" />}
        <div ref={end} />
      </div>
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
      >
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={600} placeholder="Ask a question…" aria-label="Message" />
        <button className="btn shrink-0" disabled={busy || !text.trim()}>Send</button>
      </form>
      {error && <div className="px-3 pb-3"><ErrorText>{error}</ErrorText></div>}
      <p className="px-3 pb-2 text-center text-xs text-mute">{COSTS.chat} credit per message</p>
    </div>
  )
}

function Feedback({ pathId }: { pathId: string }) {
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  if (sent) return <p className="no-print mt-12 border-t border-line pt-6 text-sm text-mute">Thanks — this helps us improve.</p>
  return (
    <div className="no-print mt-12 border-t border-line pt-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-mute">Is this useful?</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} of 5`}
              onClick={() => setRating(n)}
              className={`size-8 rounded-full border-2 font-bold ${n <= rating ? 'border-sun bg-sun-soft' : 'border-line hover:border-ink'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      {rating > 0 && (
        <form
          className="mt-3 flex max-w-xl gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            await sendFeedback({ data: { pathId, rating, text: text.trim() || undefined } }).catch(() => {})
            setSent(true)
          }}
        >
          <input className="input py-2 text-sm" maxLength={1000} placeholder="What would make it better? (optional)" value={text} onChange={(e) => setText(e.target.value)} aria-label="Feedback" />
          <button className="btn btn-sm shrink-0">Send</button>
        </form>
      )}
    </div>
  )
}
