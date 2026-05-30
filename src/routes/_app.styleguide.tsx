import { createFileRoute } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { Button, buttonClasses } from '~/components/ui/Button'
import { Modal } from '~/components/ui/Modal'
import { Alert } from '~/components/ui/Alert'
import { Stepper } from '~/components/ui/Stepper'
import { Drawer } from '~/components/ui/Drawer'
import { Popover, usePopover } from '~/components/ui/Popover'
import { Input, Select, Textarea } from '~/components/ui/Input'
import { IconChevronDown, IconX } from '@tabler/icons-react'

export const Route = createFileRoute('/_app/styleguide')({
  component: StyleguidePage,
  head: () => ({
    meta: [{ title: 'Styleguide — Exovoid' }],
  }),
})

function StyleguidePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [stickyModalOpen, setStickyModalOpen] = useState(false)
  const [stickyQuery, setStickyQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [stepperValue, setStepperValue] = useState(5)
  const [stepperWithMax, setStepperWithMax] = useState(3)
  const [edgeValue, setEdgeValue] = useState(4)
  const [apValue, setApValue] = useState(2)
  const [microValue, setMicroValue] = useState(2)
  const [textValue, setTextValue] = useState('Kira Voss')
  const [numberValue, setNumberValue] = useState(42)
  const [selectValue, setSelectValue] = useState('agi')
  const [textareaValue, setTextareaValue] = useState(
    'Ex-corporate fixer with a soft spot for stray drones.',
  )

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
          title="Surfaces"
          description="The default panel is bg-background-200 with a border-gray-400 hairline. For surfaces that need to read as “this is the relevant/active part right now” (e.g. the active combat participant), layer a top-fading accent gradient on top of background-200 and bump the border to accent. The gradient is bg-gradient-to-b from-accent-700/20 via-background-200 to-background-200."
        >
          <Row label="Default">
            <div className="rounded-xl border border-gray-400 bg-background-200 p-4">
              <p className="text-sm text-white">Default surface</p>
              <p className="text-xs text-gray-900">
                bg-background-200 · border-gray-400
              </p>
            </div>
          </Row>
          <Row label="Active">
            <div className="rounded-xl border border-accent-700 bg-gradient-to-b from-accent-700/20 via-background-200 to-background-200 p-4">
              <p className="text-sm text-white">Active surface</p>
              <p className="text-xs text-gray-900">
                bg-gradient-to-b from-accent-700/20 via-background-200
                to-background-200 · border-accent-700
              </p>
            </div>
          </Row>
        </Section>

        <Section
          title="Button"
          description="Six variants × three sizes. Primary is the single main action on a surface; secondary is an alternate action with similar weight; subtle is the in-play chip (steppers, inline +/-) — more present than ghost, less loud than secondary; ghost is the canonical Cancel; ghostDanger is the danger flavour of ghost (inline destructive actions in lists, e.g. row-level ✕); danger is reserved for the loud destructive primary."
        >
          <Row label="md (default)">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="subtle">Subtle</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="ghostDanger">Ghost danger</Button>
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
            <Button variant="ghostDanger" size="sm">
              Ghost danger
            </Button>
            <Button variant="danger" size="sm">
              Danger
            </Button>
          </Row>
          <Row label="xs (inline list actions)">
            <Button size="xs">Primary</Button>
            <Button variant="secondary" size="xs">
              Secondary
            </Button>
            <Button variant="subtle" size="xs">
              Subtle
            </Button>
            <Button variant="ghost" size="xs">
              Treat
            </Button>
            <Button variant="ghostDanger" size="xs">
              <IconX size={12} />
            </Button>
            <Button variant="danger" size="xs">
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
            <Button variant="ghostDanger" disabled>
              Ghost danger
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
          <Alert variant="success">
            No wound symbols rolled — no injury suffered.
          </Alert>
          <Alert variant="pink">+2 Edge from adrenaline symbols.</Alert>
          <Alert variant="neutral">
            Quiet contextual note — black panel bg, gray hairline, gray text.
            Use for soft explanations that shouldn't compete with the
            surrounding content.
          </Alert>
        </Section>

        <Section
          title="Input / Textarea / Select"
          description="Form primitives — black surface (bg-background-100), 1px gray-400 hairline, gray-500 on hover. Focus swaps the border to accent-700 and adds a 1px accent halo via box-shadow (total visual frame 2px, no box-model shift). Three sizes (sm / md / lg) — md is the default for in-page forms; sm fits modal footers and inline editors; lg matches the auth screens. Width is intentionally not set: pass w-full on form fields that should fill their column, or a specific width utility (w-20, w-48) on inline / sized controls. Native size attribute is shadowed in favor of the variant prop."
        >
          <Row label="Sizes">
            <Input
              size="lg"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Large input"
              className="w-64"
            />
            <Input
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Medium (default)"
              className="w-64"
            />
            <Input
              size="sm"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Small input"
              className="w-64"
            />
          </Row>
          <Row label="Types">
            <Input
              type="email"
              defaultValue="kira@voidrunners.io"
              placeholder="Email"
              className="w-64"
            />
            <Input type="password" defaultValue="hunter2" className="w-64" />
            <Input
              type="number"
              value={numberValue}
              onChange={(e) => setNumberValue(parseInt(e.target.value) || 0)}
              min={0}
              className="w-32"
            />
            <Input type="search" placeholder="Search…" className="w-64" />
          </Row>
          <Row label="Widths (intrinsic vs utility)">
            <Input defaultValue="No width — intrinsic (~20ch)" />
            <Input defaultValue="w-48" className="w-48" />
            <Input
              defaultValue="w-full inside a w-64 parent"
              className="w-64"
            />
          </Row>
          <Row label="States">
            <Input placeholder="Placeholder only" className="w-48" />
            <Input disabled defaultValue="Disabled value" className="w-48" />
            <Input
              disabled
              placeholder="Disabled & empty (placeholder shows)"
              className="w-64"
            />
          </Row>
          <Row label="Textarea">
            <Textarea
              value={textareaValue}
              onChange={(e) => setTextareaValue(e.target.value)}
              rows={3}
              placeholder="Background notes…"
              className="w-full max-w-md"
            />
          </Row>
          <Row label="Select">
            <Select
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              className="w-64"
            >
              <option value="con">CON</option>
              <option value="str">STR</option>
              <option value="agi">AGI</option>
              <option value="int">INT</option>
              <option value="edu">EDU</option>
              <option value="per">PER</option>
              <option value="coo">COO</option>
            </Select>
            <Select size="sm" defaultValue="" className="w-64">
              <option value="">— Pick one —</option>
              <option value="a">Option A</option>
              <option value="b">Option B</option>
            </Select>
            <Select disabled defaultValue="a" className="w-64">
              <option value="a">Disabled</option>
            </Select>
          </Row>
        </Section>

        <Section
          title="Modal"
          description="Standard dialog with a backdrop, header (title + required X close), optional footer for action buttons. Backdrop blurs subtly and the entrance animates. Optional stickyHeader slot pins content (search, filters, status) below the title while the body scrolls. Optional footerLeft slot pairs inline form fields with the right-aligned action buttons."
        >
          <Row>
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button onClick={() => setStickyModalOpen(true)}>
              Open with sticky header + footer form
            </Button>
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
          {stickyModalOpen && (
            <Modal
              onClose={() => setStickyModalOpen(false)}
              title="Modal with sticky header + footer form"
              subtitle="Search stays pinned at the top, inline fields share the footer with action buttons."
              stickyHeader={
                <Input
                  type="search"
                  value={stickyQuery}
                  onChange={(e) => setStickyQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full"
                />
              }
              footerLeft={
                <label className="block text-xs text-gray-900">
                  <span className="block">Quantity</span>
                  <Input
                    type="number"
                    defaultValue={1}
                    size="sm"
                    className="mt-1 w-20"
                  />
                </label>
              }
              footer={
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setStickyModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => setStickyModalOpen(false)}>Add</Button>
                </>
              }
            >
              <ul className="space-y-1">
                {Array.from({ length: 40 }, (_, i) => (
                  <li
                    key={i}
                    className="rounded border border-gray-400 bg-background-100/40 p-2 text-sm text-gray-1000"
                  >
                    Result row {i + 1} — body scrolls beneath the pinned search.
                  </li>
                ))}
              </ul>
            </Modal>
          )}
        </Section>

        <Section
          title="Popover"
          description="Click-toggled floating panel anchored to a trigger. Built on floating-ui via the usePopover() hook + <Popover> component. Open direction defaults to bottom-start and flips if there's no room; max-height auto-caps to available viewport space so the body scrolls when content is long; entrance and exit animate. Reach for it whenever you need a list of actions, a detail panel, or a dropdown that shouldn't be a full modal."
        >
          <Row>
            <PopoverExample />
            <PopoverExample longContent />
          </Row>
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

function PopoverExample({ longContent = false }: { longContent?: boolean }) {
  const popover = usePopover()
  const rows = Array.from(
    { length: longContent ? 30 : 4 },
    (_, i) => `Row ${i + 1}`,
  )
  return (
    <>
      <button
        ref={popover.refs.setReference}
        type="button"
        className={buttonClasses('secondary')}
        {...popover.getReferenceProps()}
      >
        {longContent ? 'Open (long)' : 'Open popover'}
        <IconChevronDown
          size={12}
          aria-hidden
          className={`ml-1.5 transition-transform ${popover.open ? 'rotate-180' : ''}`}
        />
      </button>
      <Popover popover={popover} className="w-64 text-xs">
        <div className="shrink-0 border-b border-gray-400 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
          {longContent ? 'Long list (scrolls)' : 'Popover header'}
        </div>
        <ul className="flex-1 divide-y divide-gray-400 overflow-y-auto">
          {rows.map((r) => (
            <li key={r} className="px-3 py-2 text-gray-1000">
              {r}
            </li>
          ))}
        </ul>
        <div className="shrink-0 border-t border-gray-400 px-3 py-2 text-[11px] text-gray-900">
          Footer slot
        </div>
      </Popover>
    </>
  )
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
