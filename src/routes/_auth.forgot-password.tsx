import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'
import { Input } from '~/components/ui/Input'

export const Route = createFileRoute('/_auth/forgot-password')({
  head: () => ({ meta: [{ title: 'Forgot password — Exovoid' }] }),
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = getSupabaseBrowserClient()
    // Swallow the result deliberately — we surface the same message
    // regardless so we don't leak which addresses have accounts.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setSubmitted(true)
    setLoading(false)
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-white">Reset password</h2>
      {submitted ? (
        <Alert variant="info">
          If an account exists for that email, we've sent reset instructions.
          Check your inbox.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-900">
            Enter the email address for your account and we'll send you a link
            to set a new password.
          </p>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-gray-900">
              Email
            </label>
            <Input
              id="email"
              type="email"
              required
              size="lg"
              className="w-full"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-gray-900">
        <a href="/login" className="text-accent-900 hover:underline">
          Back to log in
        </a>
      </p>
    </>
  )
}
