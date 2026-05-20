import { createFileRoute } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { Button, buttonClasses } from '~/components/ui/Button'
import { Modal } from '~/components/ui/Modal'
import { Alert } from '~/components/ui/Alert'
import { Stepper } from '~/components/ui/Stepper'
import { Drawer } from '~/components/ui/Drawer'

export const Route = createFileRoute('/_app/styleguide')({
  component: StyleguidePage,
  head: () => ({
    meta: [{ title: 'Styleguide — Exovoid' }],
  }),
})

function StyleguidePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [stepperValue, setStepperValue] = useState(5)
  const [stepperWithMax, setStepperWithMax] = useState(3)
  const [edgeValue, setEdgeValue] = useState(4)
  const [apValue, setApValue] = useState(2)
  const [microValue, setMicroValue] = useState(2)

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-5xl space-y-12 p-8">
        <header>
          <h1 className="text-3xl font-bold text-white">Styleguide</h1>
          <p className="mt-2 text-sm text-gray-900">
            Reusable primitives live in{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-accent-900">
              src/components/ui/
            </code>
            . Use these when building new surfaces; match the conventions when
            adding variants.
          </p>
        </header>

        <Section
          title="Color tokens"
          description="Geist palette in oklch (hsla for gray and background). The two background tokens stand on their own — 100 for the default page/element bg, 200 sits one step lighter for surfaces that need subtle elevation. Every other ramp shares the same 100–1000 semantic: 100/200/300 are component backgrounds (default / hover / active), 400/500/600 are borders (default / hover / active), 700/800 are high-contrast backgrounds (default / hover), 900/1000 are text and icons (secondary / primary). Pick the position by intent, not by visual nudging."
        >
          <PaletteRow
            label="Background — page / element (use 100 by default, 200 for subtle differentiation)"
            tokens={['background-100', 'background-200']}
          />
          <PaletteRow label="Gray — neutral" tokens={fullRamp('gray')} />
          <PaletteRow label="Accent — teal" tokens={fullRamp('accent')} />
          <PaletteRow label="Danger — red" tokens={fullRamp('danger')} />
          <PaletteRow label="Warning — amber" tokens={fullRamp('warning')} />
          <PaletteRow label="Success — green" tokens={fullRamp('success')} />
          <p className="mt-1 text-xs text-gray-700">
            Extended palette below — defined and ready to use, but no surface
            currently picks them. Reach for them when a screen genuinely needs a
            second accent.
          </p>
          <PaletteRow label="Blue" tokens={fullRamp('blue')} />
          <PaletteRow label="Purple" tokens={fullRamp('purple')} />
          <PaletteRow label="Pink" tokens={fullRamp('pink')} />
        </Section>

        <Section
          title="Button"
          description="Five variants × two sizes. Primary is the single main action on a surface; secondary is an alternate action with similar weight; subtle is the in-play chip (steppers, inline +/-) — more present than ghost, less loud than secondary; ghost is the canonical Cancel; danger is reserved for destructive actions."
        >
          <Row label="md (default)">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="subtle">Subtle</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </Row>
          <Row label="sm">
            <Button size="sm">Primary</Button>
            <Button variant="secondary" size="sm">
              Secondary
            </Button>
            <Button variant="subtle" size="sm">
              Subtle
            </Button>
            <Button variant="ghost" size="sm">
              Ghost
            </Button>
            <Button variant="danger" size="sm">
              Danger
            </Button>
          </Row>
          <Row label="disabled">
            <Button disabled>Primary</Button>
            <Button variant="secondary" disabled>
              Secondary
            </Button>
            <Button variant="subtle" disabled>
              Subtle
            </Button>
            <Button variant="ghost" disabled>
              Ghost
            </Button>
            <Button variant="danger" disabled>
              Danger
            </Button>
          </Row>
        </Section>

        <Section
          title="buttonClasses()"
          description="Helper that returns the same class string for use on non-button elements — most commonly TanStack Router <Link>."
        >
          <Row label="As an anchor">
            <a href="#styleguide" className={buttonClasses('primary')}>
              Primary link
            </a>
            <a href="#styleguide" className={buttonClasses('ghost')}>
              Ghost link
            </a>
          </Row>
        </Section>

        <Section
          title="Alert"
          description='Standalone status banner. For destructive button actions use <Button variant="danger">; this is for inline messages.'
        >
          <Alert>Failed to save: please try again.</Alert>
          <Alert variant="warning">
            Combat is active. Some character fields are locked.
          </Alert>
          <Alert variant="info">
            Realtime sync is connected. Changes propagate live.
          </Alert>
        </Section>

        <Section
          title="Modal"
          description="Standard dialog with a backdrop, header (title + required X close), optional footer for action buttons. Backdrop blurs subtly and the entrance animates."
        >
          <Row>
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
          </Row>
          {modalOpen && (
            <Modal
              onClose={() => setModalOpen(false)}
              title="Sample modal"
              subtitle="Subtitles support secondary context for the dialog."
              footer={
                <>
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setModalOpen(false)}>Confirm</Button>
                </>
              }
            >
              <p className="text-sm text-gray-1000">
                Body content goes here. The modal grows to fit its body up to a
                capped <code className="text-gray-900">max-h-[90vh]</code> with
                the body scrolling inside.
              </p>
            </Modal>
          )}
        </Section>

        <Section
          title="Drawer"
          description="Edge-anchored slide-over. No backdrop by default so the underlying page stays interactive while open."
        >
          <Row>
            <Button onClick={() => setDrawerOpen(true)}>
              Open right drawer
            </Button>
          </Row>
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Sample drawer"
          >
            <p className="text-sm text-gray-1000">
              Drawer body content. The right anchor is the most common use; the
              <code className="ml-1 text-gray-900">
                side=&quot;left&quot;
              </code>{' '}
              variant exists for symmetry.
            </p>
          </Drawer>
        </Section>

        <Section
          title="Stepper"
          description="Label + value + adjust-by-one. Used in the sheet's Health/Edge band and in each combat-tracker participant card."
        >
          <Row label="Basic">
            <div className="w-32">
              <Stepper
                label="Value"
                value={stepperValue}
                onAdjust={(d) => setStepperValue((v) => v + d)}
                min={0}
              />
            </div>
            <div className="w-32">
              <Stepper
                label="With max"
                value={stepperWithMax}
                max={10}
                onAdjust={(d) =>
                  setStepperWithMax((v) => Math.max(0, Math.min(10, v + d)))
                }
                min={0}
              />
            </div>
            <div className="w-32">
              <Stepper
                label="With hardMax"
                value={edgeValue}
                max={4}
                hardMax={6}
                onAdjust={(d) =>
                  setEdgeValue((v) => Math.max(0, Math.min(6, v + d)))
                }
                min={0}
              />
            </div>
          </Row>
          <Row label="Sizes">
            <div className="w-32">
              <Stepper
                label="sm"
                value={stepperValue}
                onAdjust={(d) => setStepperValue((v) => v + d)}
                min={0}
                size="sm"
              />
            </div>
            <div className="w-32">
              <Stepper
                label="md"
                value={stepperValue}
                onAdjust={(d) => setStepperValue((v) => v + d)}
                min={0}
                size="md"
              />
            </div>
          </Row>
          <Row label="Value tones / state">
            <div className="w-32">
              <Stepper
                label="No min (AP)"
                value={apValue}
                onAdjust={(d) => setApValue((v) => v + d)}
                valueTone={apValue < 0 ? 'danger' : 'accent'}
              />
            </div>
            <div className="w-32">
              <Stepper
                label="Read-only"
                value={3}
                onAdjust={() => {}}
                canEdit={false}
              />
            </div>
            <div className="w-32">
              <Stepper label="Busy" value={3} onAdjust={() => {}} busy />
            </div>
          </Row>
        </Section>

        <Section
          title="In-row +/- micro-buttons"
          description="No shared component — use these classes for compact in-row steppers (skills, attributes, XP). The <Stepper> primitive is the right call for prominent trackers; this recipe is for tighter inline contexts."
        >
          <Row label="Recipe">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMicroValue((v) => Math.max(0, v - 1))}
                disabled={microValue <= 0}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-400 text-xs text-gray-1000 transition not-disabled:hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                −
              </button>
              <span className="min-w-[2ch] text-center text-sm font-medium text-white">
                {microValue}
              </span>
              <button
                type="button"
                onClick={() => setMicroValue((v) => v + 1)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-400 text-xs text-gray-1000 transition not-disabled:hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                +
              </button>
            </div>
            <code className="text-xs text-gray-700">
              h-5 w-5 shrink-0 rounded bg-gray-400
              not-disabled:hover:bg-gray-500 disabled:cursor-not-allowed
              disabled:opacity-30 text-xs text-gray-1000
            </code>
          </Row>
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-900">{description}</p>
        )}
      </div>
      <div className="space-y-4 rounded-xl border border-gray-400 bg-background-200 p-6">
        {children}
      </div>
    </section>
  )
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {label && (
        <span className="min-w-[8rem] text-xs uppercase tracking-wide text-gray-700">
          {label}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

const RAMP_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000] as const

type RampFamily =
  | 'gray'
  | 'accent'
  | 'danger'
  | 'warning'
  | 'success'
  | 'blue'
  | 'purple'
  | 'pink'

function fullRamp(family: RampFamily): string[] {
  return RAMP_STEPS.map((step) => `${family}-${step}`)
}

function PaletteRow({ label, tokens }: { label: string; tokens: string[] }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wide text-gray-700">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {tokens.map((token) => (
          <div key={token} className="w-20">
            <div
              className="rounded-lg border border-gray-500"
              style={{
                backgroundColor: `var(--color-${token})`,
                height: '2.75rem',
              }}
            />
            <p className="mt-1 font-mono text-[10px] text-gray-900">{token}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
