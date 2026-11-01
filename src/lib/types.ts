import { z } from 'zod'

/* Shared shapes (client + server). AI output is always validated against these. */

export const RoleOption = z.object({
  title: z.string().max(80),
  why: z.string().max(240),
  match: z.number().min(0).max(100),
  have: z.array(z.string().max(60)).max(10),
  learn: z.array(z.string().max(60)).max(8),
  pay: z.string().max(80),
})
export const RolesOut = z.object({ roles: z.array(RoleOption).min(1).max(4) })
export type RoleOption = z.infer<typeof RoleOption>

export const Task = z.object({
  id: z.string().max(12),
  title: z.string().max(120),
  detail: z.string().max(260),
  hours: z.number().min(0).max(80),
  resource: z.string().max(120),
})
export const Phase = z.object({
  name: z.string().max(40),
  startWeek: z.number().int().min(1).max(52),
  endWeek: z.number().int().min(1).max(52),
  goal: z.string().max(200),
  tasks: z.array(Task).min(1).max(6),
})
export const Project = z.object({
  id: z.string().max(12),
  title: z.string().max(100),
  brief: z.string().max(300),
  skills: z.array(z.string().max(40)).max(6),
})
export const PlanOut = z.object({
  summary: z.string().max(300),
  phases: z.array(Phase).min(2).max(4),
  projects: z.array(Project).min(1).max(4),
  searchTerms: z.array(z.string().max(60)).min(1).max(5),
})
export type Plan = z.infer<typeof PlanOut>
export type Phase = z.infer<typeof Phase>

export const ResumeOut = z.object({
  headline: z.string().max(120),
  summary: z.string().max(500),
  skills: z.array(z.string().max(40)).max(16),
  projects: z
    .array(z.object({ title: z.string().max(100), link: z.string().max(200).optional(), bullets: z.array(z.string().max(200)).max(4) }))
    .max(5),
  experience: z
    .array(z.object({ role: z.string().max(80), org: z.string().max(80), period: z.string().max(40), bullets: z.array(z.string().max(200)).max(4) }))
    .max(5),
  education: z.array(z.string().max(160)).max(4),
})
export type Resume = z.infer<typeof ResumeOut>

export const ChatOut = z.object({ reply: z.string().max(2000) })

/* Inputs */
const skill = z.string().trim().min(1).max(40)
export const ExploreInput = z.object({
  skills: z.array(skill).min(1).max(12),
  country: z.string().trim().min(2).max(60),
  hours: z.number().int().min(2).max(60),
  months: z.number().int().min(1).max(12),
  level: z.enum(['new', 'some', 'solid']),
})
export const GrowInput = z.object({
  target: z.string().trim().min(2).max(80),
  skills: z.array(skill).min(1).max(12),
  learning: z.string().trim().max(300).default(''),
  country: z.string().trim().min(2).max(60),
  hours: z.number().int().min(2).max(60),
  months: z.number().int().min(1).max(12),
  goal: z.enum(['job', 'freelance', 'both']),
})
export type ExploreInput = z.infer<typeof ExploreInput>
export type GrowInput = z.infer<typeof GrowInput>

export const COSTS = { roles: 2, plan: 3, resume: 2, chat: 1 } as const

export const COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Rwanda', 'Uganda', 'Tanzania', 'Cameroon', 'Ethiopia',
  'India', 'Pakistan', 'Philippines', 'Indonesia', 'United Kingdom', 'United States', 'Canada', 'Germany',
  'Brazil', 'Other',
]

export const SKILL_IDEAS = [
  'Excel', 'Canva', 'Figma', 'HTML/CSS', 'JavaScript', 'Python', 'SQL', 'Writing', 'Video editing',
  'Photography', 'Social media', 'Customer service', 'Teaching', 'Sales', 'Research', 'Public speaking',
]
