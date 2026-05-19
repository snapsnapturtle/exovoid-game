import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { joinGame } from '~/lib/server/games'
import { Button } from '~/components/ui/Button'

export const Route = createFileRoute('/_app/games/join')({
  component: JoinGamePage,
})

function JoinGamePage() {
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const game = await joinGame({ data: { inviteCode: inviteCode.trim() } })
      navigate({ to: '/games/$gameId', params: { gameId: game.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-start justify-center p-8">
      <div className="w-full max-w-md">
        <h2 className="mb-6 text-2xl font-bold text-white">Join a Game</h2>
        <div className="rounded-xl border border-gray-400 bg-background-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="inviteCode"
                className="mb-1 block text-sm text-gray-900"
              >
                Invite Code
              </label>
              <input
                id="inviteCode"
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full rounded-lg border border-gray-400 bg-gray-100 px-4 py-2 text-center font-mono text-lg tracking-widest text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
                placeholder="ABCD1234"
              />
            </div>
            {error && <p className="text-sm text-danger-900">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Joining...' : 'Join Game'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
