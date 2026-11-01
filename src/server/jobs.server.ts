import { eq } from 'drizzle-orm'
import { db, schema } from './db.server'
import { env } from './env.server'

/* Region-aware job & freelance sources. Search links are built, never scraped. */

type Source = { name: string; kind: 'job' | 'freelance'; url: (q: string, country: string) => string }
const q = encodeURIComponent

const GLOBAL: Source[] = [
  { name: 'LinkedIn Jobs (entry level)', kind: 'job', url: (s, c) => `https://www.linkedin.com/jobs/search/?keywords=${q(s)}&location=${q(c)}&f_E=1%2C2` },
  { name: 'Upwork', kind: 'freelance', url: (s) => `https://www.upwork.com/nx/search/jobs/?q=${q(s)}` },
  { name: 'Fiverr (start a gig)', kind: 'freelance', url: () => 'https://www.fiverr.com/start_selling' },
  { name: 'Contra', kind: 'freelance', url: () => 'https://contra.com/' },
  { name: 'We Work Remotely', kind: 'job', url: (s) => `https://weworkremotely.com/remote-jobs/search?term=${q(s)}` },
  { name: 'Wellfound (startups)', kind: 'job', url: () => 'https://wellfound.com/jobs' },
]

const BY_COUNTRY: Record<string, Source[]> = {
  Nigeria: [
    { name: 'Jobberman', kind: 'job', url: (s) => `https://www.jobberman.com/jobs?q=${q(s)}` },
    { name: 'MyJobMag', kind: 'job', url: (s) => `https://www.myjobmag.com/search/jobs?q=${q(s)}` },
  ],
  Ghana: [{ name: 'Jobberman Ghana', kind: 'job', url: (s) => `https://www.jobberman.com.gh/jobs?q=${q(s)}` }],
  Kenya: [
    { name: 'BrighterMonday', kind: 'job', url: (s) => `https://www.brightermonday.co.ke/jobs?q=${q(s)}` },
    { name: 'Fuzu', kind: 'job', url: () => 'https://www.fuzu.com/kenya/jobs' },
  ],
  Uganda: [{ name: 'BrighterMonday Uganda', kind: 'job', url: (s) => `https://www.brightermonday.co.ug/jobs?q=${q(s)}` }],
  Tanzania: [{ name: 'BrighterMonday Tanzania', kind: 'job', url: (s) => `https://www.brightermonday.co.tz/jobs?q=${q(s)}` }],
  'South Africa': [
    { name: 'Careers24', kind: 'job', url: () => 'https://www.careers24.com/jobs/' },
    { name: 'PNet', kind: 'job', url: () => 'https://www.pnet.co.za/' },
  ],
  India: [
    { name: 'Naukri', kind: 'job', url: () => 'https://www.naukri.com/' },
    { name: 'Internshala', kind: 'job', url: () => 'https://internshala.com/' },
  ],
  Philippines: [{ name: 'OnlineJobs.ph', kind: 'freelance', url: () => 'https://www.onlinejobs.ph/' }],
  'United Kingdom': [{ name: 'Indeed UK', kind: 'job', url: (s) => `https://uk.indeed.com/jobs?q=${q(s)}` }],
  'United States': [{ name: 'Indeed', kind: 'job', url: (s) => `https://www.indeed.com/jobs?q=${q(s)}` }],
  Canada: [{ name: 'Job Bank', kind: 'job', url: (s) => `https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=${q(s)}` }],
}

export function sourcesFor(country: string, term: string) {
  return [...(BY_COUNTRY[country] ?? []), ...GLOBAL].map((s) => ({
    name: s.name,
    kind: s.kind,
    url: s.url(term, country === 'Other' ? '' : country),
    local: Boolean(BY_COUNTRY[country]?.includes(s)),
  }))
}

/* Live remote jobs (Remotive public API). Cached 12h per query to respect their limits. */

export type LiveJob = { title: string; company: string; url: string; location: string; type: string; posted: string }
const TTL = 12 * 60 * 60 * 1000
const OPEN = /worldwide|anywhere|global/i
const REGION: Record<string, RegExp> = {
  Africa: /africa|emea/i,
  Europe: /europe|emea|uk/i,
  Asia: /asia|apac/i,
  Americas: /americas|latam|usa|canada|north america/i,
}
const AFRICA = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Rwanda', 'Uganda', 'Tanzania', 'Cameroon', 'Ethiopia']
const ASIA = ['India', 'Pakistan', 'Philippines', 'Indonesia']
const regionOf = (c: string) =>
  AFRICA.includes(c) ? 'Africa' : ASIA.includes(c) ? 'Asia' : ['United Kingdom', 'Germany'].includes(c) ? 'Europe' : 'Americas'

export async function liveJobs(term: string, country: string): Promise<LiveJob[]> {
  if (!env.LIVE_JOBS) return []
  const key = `remotive:${term.toLowerCase().slice(0, 60)}`
  let jobs: LiveJob[] | null = null
  const cached = await db.query.jobsCache.findFirst({ where: eq(schema.jobsCache.key, key) })
  if (cached && Date.now() - cached.fetchedAt.getTime() < TTL) jobs = cached.data as LiveJob[]
  if (!jobs) {
    try {
      const res = await fetch(`https://remotive.com/api/remote-jobs?search=${q(term)}&limit=40`, {
        signal: AbortSignal.timeout(8000),
      })
      const data = (await res.json()) as { jobs?: any[] }
      jobs = (data.jobs ?? []).map((j) => ({
        title: String(j.title ?? '').slice(0, 120),
        company: String(j.company_name ?? '').slice(0, 80),
        url: String(j.url ?? ''),
        location: String(j.candidate_required_location ?? ''),
        type: String(j.job_type ?? '').replace(/_/g, ' '),
        posted: String(j.publication_date ?? '').slice(0, 10),
      }))
      await db
        .insert(schema.jobsCache)
        .values({ key, data: jobs, fetchedAt: new Date() })
        .onConflictDoUpdate({ target: schema.jobsCache.key, set: { data: jobs, fetchedAt: new Date() } })
    } catch {
      jobs = (cached?.data as LiveJob[]) ?? []
    }
  }
  const region = REGION[regionOf(country)]
  return jobs
    .filter((j) => j.url.startsWith('https://'))
    .filter((j) => !j.location || OPEN.test(j.location) || region.test(j.location) || j.location.includes(country))
    .slice(0, 8)
}
