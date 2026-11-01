import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'

export function Logo({ small }: { small?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2 font-display text-lg font-extrabold text-ink no-underline">
      <svg width={small ? 24 : 28} height={small ? 24 : 28} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--moss)" />
        <path d="M8 22 C 12 22, 12 12, 17 12 S 22 17, 24 10" stroke="var(--paper)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="24" cy="10" r="3" fill="var(--sun)" />
      </svg>
      NudgePath
    </Link>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-mute" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-line border-t-moss" />
      {label}
    </span>
  )
}

export function Thinking({ lines }: { lines: string[] }) {
  return (
    <div className="card mx-auto max-w-md py-10 text-center">
      <span className="mx-auto mb-4 block size-8 animate-spin rounded-full border-[3px] border-line border-t-moss" />
      <p className="font-display text-xl font-bold">{lines[0]}</p>
      {lines[1] && <p className="mt-1 text-mute">{lines[1]}</p>}
    </div>
  )
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-xl bg-flag/10 px-3.5 py-2.5 text-sm font-bold text-flag">
      {children}
    </p>
  )
}

export function Credits({ left, total }: { left: number; total: number }) {
  return (
    <span className="text-sm text-mute" title="AI credits reset daily">
      <b className="text-ink">{left}</b>/{total} credits today
    </span>
  )
}

export function ErrorView({ error, reset }: ErrorComponentProps) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
      <p className="mb-6 text-mute">{error instanceof Error ? error.message : "Please try again."}</p>
      <div className="flex justify-center gap-3">
        <button className="btn" onClick={reset}>Try again</button>
        <Link to="/home" className="btn-ghost">Dashboard</Link>
      </div>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="mb-2 text-2xl font-bold">Page not found</h1>
      <Link to="/" className="btn mt-4">Go home</Link>
    </div>
  )
}

/** Type a skill and press Enter (or comma). Click a suggestion to add it. */
export function SkillInput({
  value,
  onChange,
  suggestions = [],
  max = 12,
  id,
}: {
  value: string[]
  onChange: (v: string[]) => void
  suggestions?: string[]
  max?: number
  id?: string
}) {
  const [draft, setDraft] = useState('')
  const add = (raw: string) => {
    const s = raw.trim().replace(/,$/, '').slice(0, 40)
    if (!s || value.length >= max || value.some((v) => v.toLowerCase() === s.toLowerCase())) return
    onChange([...value, s])
  }
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
  return (
    <div>
      <div className="input flex min-h-12 flex-wrap items-center gap-1.5 py-2">
        {value.map((s) => (
          <span key={s} className="chip chip-on py-0.5">
            {s}
            <button type="button" aria-label={`Remove ${s}`} className="opacity-70 hover:opacity-100" onClick={() => onChange(value.filter((v) => v !== s))}>
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          className="min-w-32 flex-1 bg-transparent outline-none"
          placeholder={value.length ? 'Add another…' : 'Type a skill, press Enter'}
          value={draft}
          maxLength={40}
          onChange={(e) => {
            const v = e.target.value
            if (v.endsWith(',')) {
              add(v)
              setDraft('')
            } else setDraft(v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
              setDraft('')
            } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
          }}
          onBlur={() => {
            if (draft) {
              add(draft)
              setDraft('')
            }
          }}
        />
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {remaining.slice(0, 10).map((s) => (
            <button key={s} type="button" className="chip border-dashed text-mute hover:border-ink hover:text-ink" onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Choice<T extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`chip ${value === o.value ? 'chip-on' : 'hover:border-ink'}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-mute">{hint}</p>}
    </div>
  )
}
