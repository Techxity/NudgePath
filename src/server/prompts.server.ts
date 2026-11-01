import type { ExploreInput, GrowInput, Plan, Resume, RoleOption } from '~/lib/types'
import { userData } from './ai.server'

const LEVEL = { new: 'just starting', some: 'some practice', solid: 'confident, has used it for real work' }

export function rolesTask(input: ExploreInput) {
  return {
    task: `Suggest the 3 entry-level job roles that best fit the user's existing skills, in their country.
Prefer roles hireable within ${input.months} month(s) at ${input.hours} hours/week of learning.
Shape: {"roles":[{"title":string,"why":string (1 sentence, max 25 words),"match":number 0-100,"have":string[] (their skills that apply),"learn":string[] (max 5 gaps to close),"pay":string (approx entry pay, local currency, per month)}]}`,
    content: userData({ skills: input.skills, skillLevel: LEVEL[input.level], country: input.country }),
  }
}

export function planTask(p: {
  role: string
  skills: string[]
  country: string
  hours: number
  months: number
  learning?: string
  goal?: string
}) {
  const weeks = Math.max(4, Math.min(52, Math.round(p.months * 4.3)))
  return {
    task: `Build a ${weeks}-week plan to get the user to an entry-level "${p.role}" job or paid freelance work.
Use exactly 3 phases in order: "Learn", "Build", "Earn". Weeks must cover 1..${weeks} with no gaps.
Each phase: 2-5 tasks. Budget about ${p.hours} hours/week. Skip what they already know.
Each task "resource" = one named free resource (course, docs, channel) or "Practice".
"projects": 2-3 portfolio projects that prove the role's core skills, realistic for their country/market.
"searchTerms": 3 short job-board search phrases for this role.
Task ids: "t1","t2",... Project ids: "p1","p2",...
Shape: {"summary":string (1 sentence),"phases":[{"name":string,"startWeek":int,"endWeek":int,"goal":string,"tasks":[{"id":string,"title":string,"detail":string (max 25 words),"hours":number,"resource":string}]}],"projects":[{"id":string,"title":string,"brief":string (max 40 words),"skills":string[]}],"searchTerms":string[]}`,
    content: userData({
      targetRole: p.role,
      skillsTheyHave: p.skills,
      currentlyLearning: p.learning || undefined,
      goal: p.goal || undefined,
      country: p.country,
      hoursPerWeek: p.hours,
    }),
  }
}

export function resumeTask(p: {
  name: string
  role: string
  skills: string[]
  country: string
  doneTasks: string[]
  projects: { title: string; brief: string; link?: string; done: boolean }[]
  background: string
}) {
  return {
    task: `Write a one-page entry-level resume for the role "${p.role}".
Use ONLY facts in user_data. Do not invent employers, dates, degrees or numbers. If background is empty, return experience: [] and education: [].
Write project bullets as action + outcome. Include project "link" only if given.
Shape: {"headline":string,"summary":string (2-3 sentences),"skills":string[],"projects":[{"title":string,"link"?:string,"bullets":string[]}],"experience":[{"role":string,"org":string,"period":string,"bullets":string[]}],"education":string[]}`,
    content: userData(p),
  }
}

export function chatTask(ctx: { role: string; country: string; summary: string; progress: string }) {
  return `You are the user's coach for becoming a "${ctx.role}" in ${ctx.country}.
Plan: ${ctx.summary}. Progress: ${ctx.progress}.
Answer their question in under 120 words, then give one concrete next step. Plain text, may use "•" bullets.
Stay on learning, portfolio, resume, job search and freelancing. Politely decline anything else.
Shape: {"reply":string}`
}

/* ── Mock answers for AI_MOCK=1 (local dev without keys) ── */

export const mock = {
  roles: (i: ExploreInput): { roles: RoleOption[] } => ({
    roles: [
      { title: 'Junior Data Analyst', why: 'Your spreadsheet and research skills map directly to cleaning and reporting data.', match: 78, have: i.skills.slice(0, 3), learn: ['SQL', 'Power BI', 'Data cleaning'], pay: 'approx ₦250k–₦400k / month' },
      { title: 'Social Media Coordinator', why: 'Content and communication skills are the core of this role.', match: 71, have: i.skills.slice(0, 2), learn: ['Content calendars', 'Meta Ads basics', 'Analytics'], pay: 'approx ₦150k–₦250k / month' },
      { title: 'Customer Success Associate', why: 'Strong fit for people who explain things well and like helping users.', match: 64, have: i.skills.slice(0, 2), learn: ['CRM tools', 'Support writing', 'SaaS basics'], pay: 'approx ₦180k–₦300k / month' },
    ],
  }),
  plan: (role: string, months: number): Plan => {
    const w = Math.max(4, Math.round(months * 4.3))
    const a = Math.max(1, Math.round(w * 0.45))
    const b = Math.max(a + 1, Math.round(w * 0.75))
    return {
      summary: `Learn the core tools of a ${role}, prove them with two projects, then start applying from week ${b + 1}.`,
      phases: [
        { name: 'Learn', startWeek: 1, endWeek: a, goal: 'Cover the must-know skills for the role.', tasks: [
          { id: 't1', title: 'Core tool fundamentals', detail: 'Work through the beginner track and take notes of what you can already do.', hours: 8, resource: 'freeCodeCamp' },
          { id: 't2', title: 'Practise on real examples', detail: 'Recreate 3 small examples from real companies in your country.', hours: 6, resource: 'Practice' },
          { id: 't3', title: 'Learn the vocabulary', detail: 'Read 5 job ads and list the terms you do not know yet.', hours: 2, resource: 'Practice' },
        ] },
        { name: 'Build', startWeek: a + 1, endWeek: b, goal: 'Turn skills into proof people can see.', tasks: [
          { id: 't4', title: 'Build portfolio project 1', detail: 'Complete project 1 and write a short case study.', hours: 10, resource: 'Practice' },
          { id: 't5', title: 'Build portfolio project 2', detail: 'Complete project 2 with a real or realistic local client.', hours: 10, resource: 'Practice' },
          { id: 't6', title: 'Publish your work', detail: 'Put both projects online with a one-line result each.', hours: 3, resource: 'GitHub Pages / Behance' },
        ] },
        { name: 'Earn', startWeek: b + 1, endWeek: w, goal: 'Get in front of employers and clients.', tasks: [
          { id: 't7', title: 'Generate your resume', detail: 'Use the Resume tab, then edit it to sound like you.', hours: 2, resource: 'NudgePath' },
          { id: 't8', title: 'Apply to 5 roles a week', detail: 'Tailor one line per application and link your best project.', hours: 4, resource: 'Jobs tab' },
          { id: 't9', title: 'Pitch 3 freelance clients', detail: 'Offer one specific, small paid task.', hours: 3, resource: 'Practice' },
        ] },
      ],
      projects: [
        { id: 'p1', title: `${role} starter project`, brief: 'A small, complete piece of work using public data or a real local business as the subject.', skills: ['Core tools', 'Communication'] },
        { id: 'p2', title: 'Client-style brief', brief: 'Solve a realistic brief end-to-end and document the before and after.', skills: ['Problem solving', 'Presentation'] },
      ],
      searchTerms: [role, `junior ${role}`, `${role} intern`],
    }
  },
  resume: (name: string, role: string, skills: string[]): Resume => ({
    headline: `${role} · entry level`,
    summary: `${name} is building a career as a ${role}, with hands-on projects that show practical skill in ${skills.slice(0, 3).join(', ')}.`,
    skills,
    projects: [{ title: `${role} starter project`, bullets: ['Planned and delivered a complete project end-to-end.', 'Documented the process and results in a short case study.'] }],
    experience: [],
    education: [],
  }),
  chat: () => ({ reply: 'Good question. Focus on finishing the current task before adding anything new.\n• Block 1 hour today\n• Share your progress here when done\nNext step: open your current task and do the first 20 minutes now.' }),
}
