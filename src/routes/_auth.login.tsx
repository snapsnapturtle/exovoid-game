import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'
import { Button } from '~/components/ui/Button'
import { Input } from '~/components/ui/Input'

export const Route = createFileRoute('/_auth/login')({
  head: () => ({ meta: [{ title: 'Log in — Exovoid' }] }),
  component: LoginPage,
})

// WebAuthn is unavailable in non-secure contexts and older browsers; hide the
// passkey option entirely rather than offer a button that can only fail.
const passkeysSupported =
  typeof window !== 'undefined' && !!window.PublicKeyCredential

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate({ to: '/dashboard' })
  }

  async function handlePasskeySignIn() {
    setError(null)
    setPasskeyLoading(true)

    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPasskey()

    if (error) {
      // A user-cancelled or timed-out ceremony surfaces as an abort/NotAllowed
      // DOMError — not worth an alarming message, so swallow it silently.
      const name = (error as { name?: string }).name
      if (name !== 'NotAllowedError' && name !== 'AbortError') {
        setError(error.message || 'Could not sign in with a passkey.')
      }
      setPasskeyLoading(false)
      return
    }

    navigate({ to: '/dashboard' })
  }

  return (
    <>
      <div className="mb-7 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Welcome back
        </h2>
        <p className="mt-1.5 text-sm text-gray-900">
          Log in to pick up where you left off.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm text-gray-900">
            Email
          </label>
          <Input
            id="email"
            type="email"
            required
            autoFocus
            size="lg"
            className="w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        {/* The "Forgot password?" link is visually pinned to the password
            label row, but rendered last in the DOM so its tab order falls
            after the Log in button (email → password → button → forgot).
            Focus order follows source order, not the absolute placement. */}
        <div className="relative">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm text-gray-900"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                size="lg"
                className="w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </div>
            {error && <p className="text-sm text-danger-900">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-1 w-full">
              {loading ? 'Logging in…' : 'Log in'}
            </Button>
          </div>
          <Link
            to="/forgot-password"
            className="absolute right-0 top-0 text-xs leading-5 text-accent-900 transition hover:text-accent-1000 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </form>

      {passkeysSupported && (
        <>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-400" />
            <span className="text-xs uppercase tracking-wide text-gray-700">
              or
            </span>
            <span className="h-px flex-1 bg-gray-400" />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={passkeyLoading}
            onClick={handlePasskeySignIn}
            className="w-full"
          >
            {passkeyLoading ? 'Waiting for passkey…' : 'Sign in with a passkey'}
          </Button>
        </>
      )}

      <p className="mt-6 text-center text-sm text-gray-900">
        Don't have an account?{' '}
        <Link
          to="/signup"
          className="font-medium text-accent-900 transition hover:text-accent-1000 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </>
  )
}
