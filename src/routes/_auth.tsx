import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <a href="/" className="mb-8 block text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Exo<span className="text-accent-400">void</span>
          </h1>
        </a>
        <div className="rounded-xl border border-void-600 bg-void-800 p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
