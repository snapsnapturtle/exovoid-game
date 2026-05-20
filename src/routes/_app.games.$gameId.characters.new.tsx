import { createFileRoute } from '@tanstack/react-router'
import { CreationWizard } from '~/components/character-creation/CreationWizard'

export const Route = createFileRoute(
  '/_app/games/$gameId/characters/new',
)({
  head: () => ({ meta: [{ title: 'New character — Exovoid' }] }),
  component: NewCharacterPage,
})

function NewCharacterPage() {
  const { gameId } = Route.useParams()
  return <CreationWizard gameId={gameId} />
}
