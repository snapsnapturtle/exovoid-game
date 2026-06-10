import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'
import { Input } from '~/components/ui/Input'
import { SettingsCard } from '~/components/ui/SettingsCard'

export const Route = createFileRoute('/_app/account')({
  head: () => ({ meta: [{ title: 'Account settings — Exovoid' }] }),
  component: AccountPage,
})

function AccountPage() {
  const { user, profile } = Route.useRouteContext()
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
    <div className="mx-auto w-full max-w-[1280px] px-8 pb-8 pt-[calc(var(--app-header-h)+2rem)]">
      <h2 className="mb-8 text-2xl font-bold text-white">Account settings</h2>

      <div className="space-y-6">
        <SettingsCard
          title="Display name"
          description="The name other players see at the table."
        >
          <Input
            type="text"
            size="lg"
            className="w-full max-w-sm"
            value={profile?.display_name || ''}
            disabled
            readOnly
          />
        </SettingsCard>

        <SettingsCard
          title="Email"
          description="Used to sign in to your account."
        >
          <Input
            type="email"
            size="lg"
            className="w-full max-w-sm"
            value={user.email || ''}
            disabled
            readOnly
          />
        </SettingsCard>

        <form onSubmit={handleSubmit}>
          <SettingsCard
            title="Password"
            description="Choose a strong password you don't reuse elsewhere."
            footer="Use at least 6 characters."
            action={
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Save'}
              </Button>
            }
          >
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="mb-1.5 block text-sm text-gray-900"
                >
                  Current password
                </label>
                <Input
                  id="currentPassword"
                  type="password"
                  required
                  size="lg"
                  className="w-full max-w-sm"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-1.5 block text-sm text-gray-900"
                >
                  New password
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  required
                  minLength={6}
                  size="lg"
                  className="w-full max-w-sm"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm text-gray-900"
                >
                  Confirm new password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  size="lg"
                  className="w-full max-w-sm"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && (
                <Alert variant="success">Password updated successfully.</Alert>
              )}
            </div>
          </SettingsCard>
        </form>
      </div>
    </div>
  )
}
