import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Atmosphere — a soft accent glow bleeding down from the top so the
          page reads as inviting rather than flat black, plus a faint grid
          texture for a touch of sci-fi depth. Both sit behind the card and
          never intercept pointer events. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 0%, color-mix(in oklab, var(--color-accent-700) 24%, transparent) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] [mask-image:radial-gradient(70%_60%_at_50%_0%,#000,transparent)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* App-icon badge, floating above and notched into the top edge of the
            card (Craft-style). A crescent void mark on the accent gradient. */}
        <div className="flex justify-center">
          <div className="elevation-float relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-600 bg-gradient-to-br from-accent-600 to-accent-800">
            <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
              <defs>
                <mask id="exovoid-crescent">
                  <rect width="32" height="32" fill="white" />
                  <circle cx="20.5" cy="13.5" r="9.5" fill="black" />
                </mask>
              </defs>
              <circle
                cx="15"
                cy="16"
                r="9.5"
                fill="white"
                mask="url(#exovoid-crescent)"
              />
            </svg>
          </div>
        </div>

        <div className="-mt-8 rounded-2xl border border-gray-400 bg-background-200 px-8 pt-14 pb-9">
          <Outlet />
        </div>

        <p className="mt-6 text-center text-xs text-gray-700">
          <span className="font-semibold text-gray-900">
            Exo<span className="text-accent-900">void</span>
          </span>{' '}
          — your companion for the tabletop.
        </p>
      </div>
    </div>
  )
}
