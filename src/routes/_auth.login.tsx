import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'
import { Button } from '~/components/ui/Button'

export const Route = createFileRoute('/_auth/login')({
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
          <label htmlFor="email" className="mb-1 block text-sm text-gray-400">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-void-600 bg-void-700 px-4 py-2 text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm text-gray-400"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-void-600 bg-void-700 px-4 py-2 text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
            placeholder="Your password"
          />
        </div>
        {error && (
          <p className="text-sm text-danger-400">{error}</p>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Logging in...' : 'Log In'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-400">
        Don't have an account?{' '}
        <a href="/signup" className="text-accent-400 hover:underline">
          Sign up
        </a>
      </p>
    </>
  )
}
