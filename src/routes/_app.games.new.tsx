import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createGame } from '~/lib/server/games'

export const Route = createFileRoute('/_app/games/new')({
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
        <div className="rounded-xl border border-void-600 bg-void-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm text-gray-400"
              >
                Game Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-void-600 bg-void-700 px-4 py-2 text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
                placeholder="e.g., The Void Runners"
              />
            </div>
            {error && <p className="text-sm text-danger-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent-500 py-2 font-medium text-white transition hover:bg-accent-400 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
