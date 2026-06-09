import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'
import { Input } from '~/components/ui/Input'

export const Route = createFileRoute('/_app/account')({
  head: () => ({ meta: [{ title: 'Account settings — Exovoid' }] }),
  component: AccountPage,
})

function AccountPage() {
  const { user } = Route.useRouteContext()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }
    if (!user.email) {
      setError('Account has no email on file. Contact support.')
      return
    }

    setLoading(true)
    const supabase = getSupabaseBrowserClient()

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (reauthError) {
      setError('Current password is incorrect.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-2xl px-8 pb-8 pt-[calc(var(--app-header-h)+2rem)]">
      <h2 className="mb-8 text-2xl font-bold text-white">Account settings</h2>

      <section className="rounded-xl border border-gray-400 bg-background-200 p-6">
        <h3 className="mb-1 text-lg font-semibold text-white">Password</h3>
        <p className="mb-5 text-sm text-gray-900">
          Change the password for {user.email}.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="currentPassword"
              className="mb-1 block text-sm text-gray-900"
            >
              Current password
            </label>
            <Input
              id="currentPassword"
              type="password"
              required
              size="lg"
              className="w-full"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="newPassword"
              className="mb-1 block text-sm text-gray-900"
            >
              New password
            </label>
            <Input
              id="newPassword"
              type="password"
              required
              minLength={6}
              size="lg"
              className="w-full"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm text-gray-900"
            >
              Confirm new password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              size="lg"
              className="w-full"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && (
            <Alert variant="success">Password updated successfully.</Alert>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
