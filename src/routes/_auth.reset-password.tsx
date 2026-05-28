import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'

export const Route = createFileRoute('/_auth/reset-password')({
  head: () => ({ meta: [{ title: 'Set new password — Exovoid' }] }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [recoveryReady, setRecoveryReady] = useState(false)
  // `null` = still checking; `true`/`false` = decided. Used to render the
  // "invalid or expired" state only after Supabase has had a chance to
  // parse the URL hash and either emit PASSWORD_RECOVERY or hydrate an
  // existing session.
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryReady(true)
        setHasSession(true)
      } else if (event === 'SIGNED_IN' && session) {
        setHasSession(true)
      }
    })

    // Fallback: if Supabase has already hydrated a session before this
    // effect runs (or there's no recovery hash at all), check directly.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession((prev) => (prev === null ? !!session : prev))
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    navigate({ to: '/dashboard' })
  }

  if (hasSession === false && !recoveryReady) {
    return (
      <>
        <h2 className="mb-6 text-xl font-semibold text-white">
          Set new password
        </h2>
        <Alert variant="danger">
          This reset link is invalid or has expired. Request a new one to
          continue.
        </Alert>
        <p className="mt-4 text-center text-sm text-gray-900">
          <a
            href="/forgot-password"
            className="text-accent-900 hover:underline"
          >
            Send a new reset link
          </a>
        </p>
      </>
    )
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-white">
        Set new password
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm text-gray-900"
          >
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-400 bg-gray-100 px-4 py-2 text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm text-gray-900">
            Confirm new password
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-gray-400 bg-gray-100 px-4 py-2 text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
          />
        </div>
        {error && <Alert variant="danger">{error}</Alert>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </>
  )
}
