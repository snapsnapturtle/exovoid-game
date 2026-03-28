import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createCharacter } from '~/lib/server/characters'
import { DEFAULT_ATTRIBUTES } from '~/lib/game-logic/attributes'

export const Route = createFileRoute(
  '/_app/games/$gameId/characters/new',
)({
  component: NewCharacterPage,
})

function NewCharacterPage() {
  const { gameId } = Route.useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [career, setCareer] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const character = await createCharacter({
        data: {
          gameId,
          name,
          career,
          attributes: DEFAULT_ATTRIBUTES,
          skills: {},
        },
      })
      navigate({
        to: '/games/$gameId/characters/$characterId',
        params: { gameId, characterId: character.id },
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create character',
      )
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-start justify-center p-8">
      <div className="w-full max-w-md">
        <h2 className="mb-6 text-2xl font-bold text-white">New Character</h2>
        <div className="rounded-xl border border-void-600 bg-void-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="charName"
                className="mb-1 block text-sm text-gray-400"
              >
                Character Name
              </label>
              <input
                id="charName"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-void-600 bg-void-700 px-4 py-2 text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
                placeholder="e.g., Kira Voss"
              />
            </div>
            <div>
              <label
                htmlFor="career"
                className="mb-1 block text-sm text-gray-400"
              >
                Career
              </label>
              <input
                id="career"
                type="text"
                value={career}
                onChange={(e) => setCareer(e.target.value)}
                className="w-full rounded-lg border border-void-600 bg-void-700 px-4 py-2 text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
                placeholder="e.g., Bounty Hunter"
              />
            </div>
            {error && <p className="text-sm text-danger-400">{error}</p>}
            <p className="text-xs text-gray-500">
              You can adjust attributes and skills on the character sheet after
              creation.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent-500 py-2 font-medium text-white transition hover:bg-accent-400 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Character'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
