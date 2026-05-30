import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'
import { Input } from '~/components/ui/Input'

export const Route = createFileRoute('/_auth/reset-password')({
  head: () => ({ meta: [{ title: 'Set new password — Exovoid' }] }),
  component: ResetPasswordPage,
})

// `pending` while we wait for Supabase to parse the recovery link;
// `ready` once `PASSWORD_RECOVERY` has fired; `invalid` if no recovery is
// in flight; `already-signed-in` if a normal authenticated visitor lands
// here without a recovery token.
type Status = 'pending' | 'ready' | 'invalid' | 'already-signed-in'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('pending')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    // Recovery links arrive with either a `?code=...` query param (PKCE)
    // or a `#type=recovery` hash (implicit flow). If neither is present
    // the page isn't being reached via a recovery link — fall through to
    // the signed-in / unauthenticated branches below.
    const hasRecoveryMarkers =
      new URLSearchParams(window.location.search).has('code') ||
      window.location.hash.includes('type=recovery')

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready')
      }
    })

    if (hasRecoveryMarkers) {
      // Wait briefly for `PASSWORD_RECOVERY`. If it doesn't arrive the
      // token is bad or expired and we fall back to the invalid state.
      timeoutId = setTimeout(() => {
        setStatus((prev) => (prev === 'pending' ? 'invalid' : prev))
      }, 3000)
    } else {
      // No recovery in flight. A signed-in user shouldn't be on this
      // page — bouncing them to `/account` keeps the re-auth requirement
      // intact (the change-password form there asks for the current
      // password). Everyone else gets the expired-link UI.
      supabase.auth.getSession().then(({ data: { session } }) => {
        setStatus(session ? 'already-signed-in' : 'invalid')
      })
    }

    return () => {
      sub.subscription.unsubscribe()
      if (timeoutId) clearTimeout(timeoutId)
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

  if (status === 'invalid') {
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

  if (status === 'already-signed-in') {
    return (
      <>
        <h2 className="mb-6 text-xl font-semibold text-white">
          Set new password
        </h2>
        <Alert variant="info">
          You're already signed in. To change your password, use Account
          settings — it'll ask you to confirm your current password first.
        </Alert>
        <p className="mt-4 text-center text-sm text-gray-900">
          <Link to="/account" className="text-accent-900 hover:underline">
            Go to Account settings
          </Link>
        </p>
      </>
    )
  }

  if (status === 'pending') {
    return <p className="text-center text-sm text-gray-900">Loading…</p>
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
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            size="lg"
            className="w-full"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1 block text-sm text-gray-900">
            Confirm new password
          </label>
          <Input
            id="confirm"
            type="password"
            required
            minLength={6}
            size="lg"
            className="w-full"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
