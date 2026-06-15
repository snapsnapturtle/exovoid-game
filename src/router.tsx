import { createRouter, Link } from '@tanstack/react-router'
import { IconMapPinOff } from '@tabler/icons-react'
import { routeTree } from './routeTree.gen'
import { buttonClasses } from '~/components/ui/Button'
import { EmptyState } from '~/components/ui/EmptyState'

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    // Wrap every navigation in document.startViewTransition. The actual
    // transition (cross-fade / rise) and the prefers-reduced-motion guard
    // live in the ::view-transition-* rules in src/styles/app.css.
    defaultViewTransition: true,
    defaultNotFoundComponent: NotFound,
  })
  return router
}

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        className="w-full max-w-md"
        icon={<IconMapPinOff />}
        title="Page not found"
        description="The page you’re looking for doesn’t exist or has been moved."
        action={
          <Link to="/" className={buttonClasses('subtle', 'md')}>
            Back to dashboard
          </Link>
        }
      />
    </main>
  )
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
