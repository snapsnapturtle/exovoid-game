import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'
import { Button } from '~/components/ui/Button'
import { Input } from '~/components/ui/Input'

export const Route = createFileRoute('/_auth/signup')({
  head: () => ({ meta: [{ title: 'Sign up — Exovoid' }] }),
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate({ to: '/dashboard' })
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-white">Create Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="displayName"
            className="mb-1 block text-sm text-gray-900"
          >
            Display Name
          </label>
          <Input
            id="displayName"
            type="text"
            required
            size="lg"
            className="w-full"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm text-gray-900"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            size="lg"
            className="w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        {error && <p className="text-sm text-danger-900">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating account...' : 'Sign Up'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-900">
        Already have an account?{' '}
        <a href="/login" className="text-accent-900 hover:underline">
          Log in
        </a>
      </p>
    </>
  )
}
