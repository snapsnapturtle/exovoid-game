import { createRouter, Link } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { buttonClasses } from '~/components/ui/Button'

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
      <div className="w-full max-w-md rounded-xl border border-gray-400 bg-background-200 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">
          404
        </p>
        <h1 className="mt-2 text-xl font-semibold text-white">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-gray-900">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <Link to="/" className={`${buttonClasses('primary', 'md')} mt-5`}>
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
