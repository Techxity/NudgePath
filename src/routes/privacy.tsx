import { Link, createFileRoute } from '@tanstack/react-router'
import { Logo } from '~/components/ui'

export const Route = createFileRoute('/privacy')({ component: Privacy })

function Privacy() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Logo />
      <h1 className="mt-10 text-3xl font-extrabold">Privacy, in short</h1>
      <ul className="mt-6 list-disc space-y-3 pl-5 text-mute">
        <li><b className="text-ink">What we store:</b> your name, email, a hashed password (or Google sign-in), the answers you give, your plans, coach chats and feedback.</li>
        <li><b className="text-ink">Why:</b> so you can come back to your plan, and so we can see which steps help people most.</li>
        <li><b className="text-ink">AI:</b> your answers are sent to a third-party AI model (Google Gemini, Groq or OpenRouter) to write your plan. Don’t enter passwords, ID numbers or bank details.</li>
        <li><b className="text-ink">Never:</b> we don’t sell or share your data, or show you ads.</li>
        <li><b className="text-ink">Your control:</b> delete any path, or your whole account, from your dashboard at any time. Deletion is permanent.</li>
      </ul>
      <Link to="/" className="btn-ghost mt-10">Back</Link>
    </div>
  )
}
