import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Choice, ErrorText, Field, SkillInput, Thinking } from '~/components/ui'
import { COSTS, COUNTRIES, SKILL_IDEAS } from '~/lib/types'
import { startExplore, startGrow } from '~/server/app.functions'

export const Route = createFileRoute('/_app/start')({
  validateSearch: z.object({ mode: z.enum(['explore', 'grow']).optional().catch(undefined) }),
  component: Start,
})

const TZ: Record<string, string> = {
  'Africa/Lagos': 'Nigeria', 'Africa/Accra': 'Ghana', 'Africa/Nairobi': 'Kenya', 'Africa/Johannesburg': 'South Africa',
  'Africa/Cairo': 'Egypt', 'Africa/Kigali': 'Rwanda', 'Africa/Kampala': 'Uganda', 'Africa/Dar_es_Salaam': 'Tanzania',
  'Africa/Douala': 'Cameroon', 'Africa/Addis_Ababa': 'Ethiopia', 'Asia/Kolkata': 'India', 'Asia/Calcutta': 'India',
  'Asia/Karachi': 'Pakistan', 'Asia/Manila': 'Philippines', 'Asia/Jakarta': 'Indonesia', 'Europe/London': 'United Kingdom',
  'Europe/Berlin': 'Germany', 'America/Sao_Paulo': 'Brazil', 'America/Toronto': 'Canada',
}
function guessCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TZ[tz] ?? (tz.startsWith('America/') ? 'United States' : 'Nigeria')
  } catch {
    return 'Nigeria'
  }
}

const HOURS = [
  { value: 5, label: '5 hrs/wk' },
  { value: 10, label: '10 hrs/wk' },
  { value: 20, label: '20+ hrs/wk' },
]
const MONTHS = [
  { value: 1, label: '1 month' },
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months' },
]
const ROLE_IDEAS = ['Frontend Developer', 'Data Analyst', 'UI/UX Designer', 'Product Designer', 'Digital Marketer', 'Video Editor', 'QA Tester', 'Virtual Assistant']

function Start() {
  const { mode } = Route.useSearch()
  if (!mode) return <Chooser />
  return mode === 'explore' ? <ExploreForm /> : <GrowForm />
}

function Chooser() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-extrabold">Where are you now?</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/start" search={{ mode: 'explore' }} className="card block hover:border-ink">
          <h2 className="text-xl font-bold">I have skills, no clear role</h2>
          <p className="mt-1 text-mute">See roles that fit.</p>
        </Link>
        <Link to="/start" search={{ mode: 'grow' }} className="card block hover:border-ink">
          <h2 className="text-xl font-bold">I’m learning, want to get hired</h2>
          <p className="mt-1 text-mute">Plan, portfolio, resume, jobs.</p>
        </Link>
      </div>
    </div>
  )
}

function useCommon() {
  const [country, setCountry] = useState('Nigeria')
  const [hours, setHours] = useState(10)
  const [months, setMonths] = useState(3)
  useEffect(() => {
    setCountry(guessCountry())
  }, [])
  const fields = (
    <>
      <Field label="Country" htmlFor="country" hint="Used for pay ranges and job sites.">
        <select id="country" className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
          {COUNTRIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Time you can give">
        <Choice label="Hours per week" value={hours} onChange={setHours} options={HOURS} />
      </Field>
      <Field label="Timeline">
        <Choice label="Timeline" value={months} onChange={setMonths} options={MONTHS} />
      </Field>
    </>
  )
  return { country, hours, months, fields }
}

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl">
      <Link to="/start" search={{}} className="text-sm text-mute hover:text-ink">← Back</Link>
      <h1 className="mt-3 text-3xl font-extrabold">{title}</h1>
      <p className="mb-8 mt-1 text-mute">{sub}</p>
      {children}
    </div>
  )
}

function ExploreForm() {
  const navigate = useNavigate()
  const [skills, setSkills] = useState<string[]>([])
  const [level, setLevel] = useState<'new' | 'some' | 'solid'>('some')
  const { country, hours, months, fields } = useCommon()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!skills.length) return setError('Add at least one skill.')
    setBusy(true)
    setError('')
    try {
      const { pathId } = await startExplore({ data: { skills, level, country, hours, months } })
      navigate({ to: '/path/$id', params: { id: pathId } })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  if (busy) return <Thinking lines={['Matching your skills to roles…', 'About 10 seconds']} />
  return (
    <Shell title="What can you do?" sub="List skills from school, work, hobbies — anything.">
      <form onSubmit={submit} className="space-y-6">
        <Field label="Your skills" htmlFor="skills">
          <SkillInput id="skills" value={skills} onChange={setSkills} suggestions={SKILL_IDEAS} />
        </Field>
        <Field label="How good are you overall?">
          <Choice
            label="Level"
            value={level}
            onChange={setLevel}
            options={[
              { value: 'new', label: 'Just starting' },
              { value: 'some', label: 'Some practice' },
              { value: 'solid', label: 'Confident' },
            ]}
          />
        </Field>
        {fields}
        <ErrorText>{error}</ErrorText>
        <button className="btn w-full py-3">Show matching roles</button>
        <p className="text-center text-xs text-mute">Uses {COSTS.roles} AI credits</p>
      </form>
    </Shell>
  )
}

function GrowForm() {
  const navigate = useNavigate()
  const [target, setTarget] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [learning, setLearning] = useState('')
  const [goal, setGoal] = useState<'job' | 'freelance' | 'both'>('both')
  const { country, hours, months, fields } = useCommon()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (target.trim().length < 2) return setError('Add the role you’re aiming for.')
    if (!skills.length) return setError('Add at least one skill you already have.')
    setBusy(true)
    setError('')
    try {
      const { pathId } = await startGrow({ data: { target: target.trim(), skills, learning, goal, country, hours, months } })
      navigate({ to: '/path/$id', params: { id: pathId } })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  if (busy) return <Thinking lines={['Building your plan…', 'About 15 seconds']} />
  return (
    <Shell title="Where are you heading?" sub="We’ll plan what’s left, and get you to work.">
      <form onSubmit={submit} className="space-y-6">
        <Field label="Role you’re aiming for" htmlFor="target">
          <input id="target" className="input" list="role-ideas" maxLength={80} placeholder="e.g. Frontend Developer" value={target} onChange={(e) => setTarget(e.target.value)} />
          <datalist id="role-ideas">
            {ROLE_IDEAS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        <Field label="Skills you already have" htmlFor="skills">
          <SkillInput id="skills" value={skills} onChange={setSkills} suggestions={SKILL_IDEAS} />
        </Field>
        <Field label="What are you learning now? (optional)" htmlFor="learning">
          <input id="learning" className="input" maxLength={300} placeholder="e.g. React on freeCodeCamp, week 3" value={learning} onChange={(e) => setLearning(e.target.value)} />
        </Field>
        <Field label="Goal">
          <Choice
            label="Goal"
            value={goal}
            onChange={setGoal}
            options={[
              { value: 'job', label: 'A job' },
              { value: 'freelance', label: 'Freelance' },
              { value: 'both', label: 'Either' },
            ]}
          />
        </Field>
        {fields}
        <ErrorText>{error}</ErrorText>
        <button className="btn w-full py-3">Build my plan</button>
        <p className="text-center text-xs text-mute">Uses {COSTS.plan} AI credits</p>
      </form>
    </Shell>
  )
}
