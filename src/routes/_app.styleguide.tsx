import { createFileRoute } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { Button, buttonClasses } from '~/components/ui/Button'
import { Badge } from '~/components/ui/Badge'
import { Modal } from '~/components/ui/Modal'
import { Alert } from '~/components/ui/Alert'
import { Stepper } from '~/components/ui/Stepper'
import { StatusDot } from '~/components/ui/StatusDot'
import { DotMatrix } from '~/components/ui/DotMatrix'
import { LoadingBar } from '~/components/ui/LoadingBar'
import { surfaceCardClasses, SurfaceArrow } from '~/components/ui/Surface'
import { InlineStepper } from '~/components/ui/InlineStepper'
import { Drawer } from '~/components/ui/Drawer'
import { Popover, usePopover } from '~/components/ui/Popover'
import { Input, Select, Textarea } from '~/components/ui/Input'
import { Checkbox } from '~/components/ui/Checkbox'
import { EmptyState } from '~/components/ui/EmptyState'
import {
  IconChevronDown,
  IconX,
  IconSwords,
  IconInbox,
} from '@tabler/icons-react'

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
  const [chips, setChips] = useState<Record<string, boolean>>({
    edge: true,
    flow: false,
    note: true,
  })
  const [tags, setTags] = useState(['Flow', 'Note', 'Adrenaline'])
  const [textValue, setTextValue] = useState('Kira Voss')
  const [numberValue, setNumberValue] = useState(42)
  const [selectValue, setSelectValue] = useState('agi')
  const [checks, setChecks] = useState({ hidden: true, minion: false })
  const [textareaValue, setTextareaValue] = useState(
    'Ex-corporate fixer with a soft spot for stray drones.',
  )

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-5xl space-y-12 px-8 pb-8 pt-[calc(var(--app-header-h)+2rem)]">
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
          title="Badge"
          description="One primitive, three modes. Static — a status badge, count pill, or type tag. Selectable (onClick) — a toggle clicked on/off; it renders as a button with aria-pressed and selection reads as the badge lighting up in its tone (no checkbox glyph — the colour appearing is the on signal). Dismissible (onDismiss) — a removable tag with a trailing ✕. Tones pull from one ramp each: bg at 200 (component-bg), border at 400 (default border), text at 900 (secondary). Two sizes on the shared control scale — xs (20px, text-[10px], the workhorse default) and sm (24px, text-xs) — matching xs/sm buttons so a badge lines up with controls in a row. Optional pill shape and an optional uppercase 'status' treatment. Chrome only — leading glyphs, ± modifiers, and counts go in children."
        >
          <Row label="Tones">
            <Badge>Neutral</Badge>
            <Badge tone="accent">Installed</Badge>
            <Badge tone="success">Saved</Badge>
            <Badge tone="warning">Broken</Badge>
            <Badge tone="danger">Hidden</Badge>
            <Badge tone="purple">NPC</Badge>
          </Row>
          <Row label="Status (uppercase)">
            <Badge tone="accent" uppercase>
              Active
            </Badge>
            <Badge tone="warning" uppercase>
              Round 3
            </Badge>
            <Badge tone="neutral" uppercase>
              Tier III
            </Badge>
            <Badge tone="accent" uppercase>
              Equipped
            </Badge>
          </Row>
          <Row label="Sizes & pill">
            <Badge size="xs">xs · 20px</Badge>
            <Badge size="sm">sm · 24px</Badge>
            <Badge tone="accent" pill>
              Level 4
            </Badge>
            <Badge tone="success" size="sm" pill>
              Saved
            </Badge>
          </Row>
          <Row label="With leading content">
            <Badge tone="accent">
              <span className="font-semibold tabular-nums">+1</span>
              <span>Flow</span>
            </Badge>
            <Badge tone="danger">
              <span className="font-semibold tabular-nums">−2</span>
              <span>Note</span>
            </Badge>
          </Row>
          <Row label="Dismissible (onDismiss → ✕)">
            {tags.length === 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTags(['Flow', 'Note', 'Adrenaline'])}
              >
                Reset tags
              </Button>
            ) : (
              tags.map((t) => (
                <Badge
                  key={t}
                  tone="accent"
                  dismissLabel={`Remove ${t}`}
                  onDismiss={() =>
                    setTags((prev) => prev.filter((x) => x !== t))
                  }
                >
                  {t}
                </Badge>
              ))
            )}
          </Row>
          <Row label="Selectable (onClick → toggle)">
            <Badge
              tone="accent"
              selected={chips.edge}
              onClick={() => setChips((c) => ({ ...c, edge: !c.edge }))}
            >
              <span className="font-semibold tabular-nums">+3</span>
              <span>Spend Edge</span>
            </Badge>
            <Badge
              tone="accent"
              selected={chips.flow}
              onClick={() => setChips((c) => ({ ...c, flow: !c.flow }))}
            >
              <span className="font-semibold tabular-nums">+1</span>
              <span>Flow</span>
            </Badge>
            <Badge
              tone="accent"
              selected={chips.note}
              onClick={() => setChips((c) => ({ ...c, note: !c.note }))}
            >
              <span className="font-medium">Kira</span>
              <span>(2 success)</span>
            </Badge>
          </Row>
          <Row label="Selectable — disabled">
            <Badge tone="accent" selected={false} disabled onClick={() => {}}>
              <span className="font-semibold tabular-nums">+3</span>
              <span>Spend Edge</span>
            </Badge>
            <Badge tone="accent" selected disabled onClick={() => {}}>
              <span className="font-semibold tabular-nums">+1</span>
              <span>Flow</span>
            </Badge>
          </Row>
        </Section>

        <Section
          title="StatusDot"
          description="A small solid status pip — the minimal stand-in for a status Badge when the surrounding context already names the thing and only an at-a-glance on/off signal is needed (e.g. the active combatant in the tracker). Takes the high-contrast fill (700) of its ramp rather than the muted 200 a Badge sits on, since the dot has no label to lean on. Defaults to the success (green) tone. Pass a label for the sr-only text + title tooltip so the meaning survives for screen-reader and hover users."
        >
          <Row label="Tones">
            <StatusDot label="Active" />
            <StatusDot tone="accent" label="Selected" />
            <StatusDot tone="warning" label="Warning" />
            <StatusDot tone="danger" label="Down" />
            <StatusDot tone="neutral" label="Idle" />
            <StatusDot tone="purple" label="NPC" />
          </Row>
          <Row label="Pulse (live)">
            <StatusDot pulse label="Active" />
            <StatusDot tone="accent" pulse label="Active" />
            <StatusDot tone="danger" pulse label="Live" />
          </Row>
          <Row label="In context">
            <span className="inline-flex items-baseline gap-2">
              <StatusDot tone="accent" pulse label="Active" />
              <span className="text-base font-semibold text-white">
                Kira Vance
              </span>
            </span>
          </Row>
        </Section>

        <Section
          title="DotMatrix loader"
          description="A compact dot-matrix loader — a square grid of dots that ripple diagonally, a bright wave sweeping corner-to-corner. A general-purpose loading/activity indicator for small inline spots (navigation itself uses the LoadingBar below). Colour follows currentColor, so set it with a text-* class on (or above) the grid; align-middle keeps it centred next to text. Honours prefers-reduced-motion by holding the dots at a steady opacity instead of animating."
        >
          <Row label="Default (3×3, accent)">
            <DotMatrix className="text-accent-900" />
          </Row>
          <Row label="currentColor">
            <DotMatrix className="text-gray-1000" />
            <DotMatrix className="text-warning-900" />
            <DotMatrix className="text-danger-900" />
            <DotMatrix className="text-success-900" />
          </Row>
          <Row label="Larger (4×4, bigger dots)">
            <DotMatrix
              grid={4}
              dotSize={4}
              gap={3}
              className="text-accent-900"
            />
          </Row>
          <Row label="Inactive (static, off-screen state)">
            <DotMatrix active={false} className="text-accent-900" />
          </Row>
          <Row label="Inline with text">
            <span className="inline-flex items-center gap-2">
              <span className="text-base font-semibold text-white">
                Loading
              </span>
              <DotMatrix label="Loading" className="text-accent-900" />
            </span>
          </Row>
        </Section>

        <Section
          title="LoadingBar"
          description="A thin indeterminate loading bar: the accent fill grows in from the left, fills the track, then recedes off to the right on a loop. Used pinned just below the app header during navigation (driven by useNavigationPending, gated to >150ms so quick/preloaded loads never flash it). Decorative (aria-hidden); pair it with a separate labelled role=status element when an announcement is needed (the app layout renders one alongside it for navigation). Holds a faint static fill under prefers-reduced-motion. In the app it spans full width; the box below is just a demo frame."
        >
          <Row label="Active (indeterminate)">
            <div className="relative w-full max-w-sm rounded bg-gray-100">
              <LoadingBar active />
            </div>
          </Row>
          <Row label="Idle (nothing paints)">
            <div className="relative w-full max-w-sm rounded bg-gray-100">
              <LoadingBar active={false} />
            </div>
          </Row>
        </Section>

        <Section
          title="Surface card"
          description="A clickable surface card with one shared sizing — a flex row at p-3 — for both list rows and grid cards. Resting state sits on the neutral ramp (border-gray-400 hairline, bg-background-200); hover lifts to border-gray-500 + bg-gray-100, the same treatment as the combat-tracker rows. Apply surfaceCardClasses() to any Link / a / button / div: leading content (a portrait, etc.) first, main content in a min-w-0 flex-1 wrapper, and a trailing <SurfaceArrow> that sits in the border tone (gray-400) and shifts to gray-500 on hover to track the border."
        >
          <Row label="With portrait">
            <button
              type="button"
              className={surfaceCardClasses('w-72 text-left')}
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-gray-300" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-1000">Kira Vance</p>
                <p className="text-xs text-gray-700">
                  Level 4 · Played by Alex
                </p>
              </div>
              <SurfaceArrow />
            </button>
          </Row>
          <Row label="With heading">
            <button
              type="button"
              className={surfaceCardClasses('w-72 text-left')}
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-gray-1000">
                  Crimson Void
                </h3>
                <span className="mt-1 inline-block rounded-full bg-blue-700/20 px-2 py-0.5 text-xs font-medium text-blue-900">
                  Game Master
                </span>
              </div>
              <SurfaceArrow />
            </button>
          </Row>
        </Section>

        <Section
          title="Input / Textarea / Select"
          description="Form primitives — black surface (bg-background-100), 1px gray-400 hairline, gray-500 on hover. Focus swaps the border to accent-700 and adds a 1px accent halo via box-shadow (total visual frame 2px, no box-model shift). Three sizes (sm 24px / md 32px / lg 40px) — sm and md share their height with the matching Button size so they align in a row; md is the default for in-page forms, sm fits modal footers and inline editors, lg is input-only and matches the auth screens. Width is intentionally not set: pass w-full on form fields that should fill their column, or a specific width utility (w-20, w-48) on inline / sized controls. Native size attribute is shadowed in favor of the variant prop."
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
          title="Checkbox"
          description="A real <input type='checkbox'> with the browser chrome hidden (appearance-none) and a dark-theme box drawn on top: gray-400 hairline on transparent, filling to accent-700 when checked with a tabler IconCheck overlaid. Keeps native focus / keyboard / label semantics — pass a label to wrap the box and text in one clickable <label>, or omit it to render just the box. Focus shows the same accent halo as Input."
        >
          <Row label="With label">
            <Checkbox
              checked={checks.hidden}
              onChange={(e) =>
                setChecks((c) => ({ ...c, hidden: e.target.checked }))
              }
              label="Hidden roll"
            />
            <Checkbox
              checked={checks.minion}
              onChange={(e) =>
                setChecks((c) => ({ ...c, minion: e.target.checked }))
              }
              label="Minion"
            />
          </Row>
          <Row label="States">
            <Checkbox defaultChecked label="Checked" />
            <Checkbox label="Unchecked" />
            <Checkbox disabled checked readOnly label="Disabled checked" />
            <Checkbox disabled label="Disabled" />
          </Row>
          <Row label="Box only (no label)">
            <Checkbox defaultChecked aria-label="standalone checked" />
            <Checkbox aria-label="standalone unchecked" />
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
          title="InlineStepper"
          description="Tiny [− value +] for attribute/skill/XP rows where the full Stepper card is too heavy. Buttons are the shared xs Button (20×20), so it lines up with other xs controls in the same row. Pass min/max to bound the buttons, or decrementDisabled/incrementDisabled for guards that aren't a plain numeric floor/ceiling (budgets, busy, bump caps). The readout is always the raw value; convey state (e.g. 'changed') through valueClassName colour rather than custom content."
        >
          <Row label="Bounded (min 0, max 10)">
            <InlineStepper
              value={microValue}
              min={0}
              max={10}
              ariaLabel="demo value"
              onAdjust={(d) =>
                setMicroValue((v) => Math.max(0, Math.min(10, v + d)))
              }
            />
          </Row>
          <Row label="Changed state via colour">
            <InlineStepper
              value={microValue}
              ariaLabel="demo skill"
              valueClassName={`text-sm tabular-nums ${
                microValue > 0 ? 'text-accent-900' : 'text-white'
              }`}
              onAdjust={(d) => setMicroValue((v) => Math.max(0, v + d))}
            />
          </Row>
          <Row label="Read-only">
            <InlineStepper
              value={microValue}
              ariaLabel="demo value"
              canEdit={false}
              onAdjust={() => {}}
            />
          </Row>
        </Section>

        <Section
          title="Empty state"
          description="The canonical 'nothing here yet' panel: a bordered background-200 card with a centred 32px icon in a matching chip, a 16px gray-1000 title, a 14px gray-900 description, and an optional subtle md button. Reach for this instead of hand-rolling a centered message box."
        >
          <Row label="With action">
            <div className="w-full max-w-md">
              <EmptyState
                icon={<IconSwords />}
                title="No active encounter"
                description="Roll initiative and track turns, AP, and health for everyone in the fight."
                action={<Button variant="subtle">Start combat</Button>}
              />
            </div>
          </Row>
          <Row label="No action">
            <div className="w-full max-w-md">
              <EmptyState
                icon={<IconInbox />}
                title="No items yet"
                description="Items you pick up or buy will show up here."
              />
            </div>
          </Row>
        </Section>

        <Section
          title="Control heights & alignment"
          description="Buttons, inputs and steppers share one height scale so they line up in a row: xs 20px · sm 24px · md 32px (lg 40px is input-only). Every button variant is the same outer height at a given size — borderless variants carry a transparent 1px border so the box model matches the bordered ones. Heights come from border-compensated padding, not a fixed height. See the Control heights section in CLAUDE.md."
        >
          <Row label="md — 32px">
            <Button size="md">Button</Button>
            <Button variant="secondary" size="md">
              Bordered
            </Button>
            <Input size="md" defaultValue="Input" className="w-28" readOnly />
            <Select size="md" defaultValue="a" className="w-28">
              <option value="a">Select</option>
            </Select>
          </Row>
          <Row label="sm — 24px">
            <Button size="sm">Button</Button>
            <Button variant="secondary" size="sm">
              Bordered
            </Button>
            <Input size="sm" defaultValue="Input" className="w-28" readOnly />
            <Select size="sm" defaultValue="a" className="w-28">
              <option value="a">Select</option>
            </Select>
          </Row>
          <Row label="xs — 20px">
            <Button size="xs">Button</Button>
            <Button variant="secondary" size="xs">
              Bordered
            </Button>
            <InlineStepper
              value={microValue}
              min={0}
              ariaLabel="demo value"
              onAdjust={(d) => setMicroValue((v) => Math.max(0, v + d))}
            />
          </Row>
          <Row label="lg — 40px (input only)">
            <Input size="lg" defaultValue="Input" className="w-40" readOnly />
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
