import { createFileRoute } from '@tanstack/react-router'
import { CreationWizard } from '~/components/character-creation/CreationWizard'

export const Route = createFileRoute(
  '/_app/games/$gameId/characters/new',
)({
  component: NewCharacterPage,
})

function NewCharacterPage() {
  const { gameId } = Route.useParams()
  return <CreationWizard gameId={gameId} />
}
