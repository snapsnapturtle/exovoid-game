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
            Exo<span className="text-accent-900">void</span>
          </h1>
        </a>
        <div className="rounded-xl border border-gray-400 bg-background-200 p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
