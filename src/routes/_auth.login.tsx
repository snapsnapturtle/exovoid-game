import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'
import { Button } from '~/components/ui/Button'
import { Input } from '~/components/ui/Input'

export const Route = createFileRoute('/_auth/login')({
  head: () => ({ meta: [{ title: 'Log in — Exovoid' }] }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-white">Log In</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            size="lg"
            className="w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
          />
        </div>
        {error && <p className="text-sm text-danger-900">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Logging in...' : 'Log In'}
        </Button>
        <p className="text-center text-sm">
          <a
            href="/forgot-password"
            className="text-accent-900 hover:underline"
          >
            Forgot password?
          </a>
        </p>
      </form>
      <p className="mt-4 text-center text-sm text-gray-900">
        Don't have an account?{' '}
        <a href="/signup" className="text-accent-900 hover:underline">
          Sign up
        </a>
      </p>
    </>
  )
}
