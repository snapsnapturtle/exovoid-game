import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createGame } from '~/lib/server/games'
import { Button } from '~/components/ui/Button'

export const Route = createFileRoute('/_app/games/new')({
  head: () => ({ meta: [{ title: 'Create game — Exovoid' }] }),
  component: NewGamePage,
})

function NewGamePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const game = await createGame({ data: { name } })
      navigate({ to: '/games/$gameId', params: { gameId: game.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-start justify-center p-8">
      <div className="w-full max-w-md">
        <h2 className="mb-6 text-2xl font-bold text-white">Create New Game</h2>
        <div className="rounded-xl border border-gray-400 bg-background-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm text-gray-900"
              >
                Game Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-400 bg-gray-100 px-4 py-2 text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
                placeholder="e.g., The Void Runners"
              />
            </div>
            {error && <p className="text-sm text-danger-900">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating...' : 'Create Game'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
