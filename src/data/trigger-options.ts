/**
 * Universal trigger options — rulebook "Triggers & Complications" section.
 * These apply to any roll regardless of context. Combat-specific options
 * exist as a separate table; surfacing those requires knowing the roll is
 * in combat, deferred for now.
 *
 * `cost` is the rulebook's "Triggers" column (e.g. "1", "2+"). A trailing
 * `+` means the option can be used repeatedly on the same roll. The base
 * 2 → 1 success conversion ("It is always possible to convert 2 Triggers
 * into one additional success") is included as the first entry.
 */
export interface TriggerOption {
  cost: string
  name: string
  description: string
}

export const UNIVERSAL_TRIGGER_OPTIONS: TriggerOption[] = [
  {
    cost: '2+',
    name: 'Extra success',
    description:
      'Convert 2 triggers into one additional success. Always available on any roll.',
  },
  {
    cost: '1+',
    name: 'Hide Traces',
    description:
      'You leave less traces of your action — attempts to follow them suffer a −2 pool penalty.',
  },
  {
    cost: '1',
    name: 'Flow',
    description:
      'You gain a +1 pool bonus on your next own check as you feel inspired.',
  },
  {
    cost: '2',
    name: 'Flashy Execution',
    description:
      'You perform the action in an impressive fashion — +1 pool bonus on follow-up social interactions.',
  },
  {
    cost: '2+',
    name: 'Mitigate Risks',
    description:
      'Cancel the downside of one rolled complication while keeping its 2 successes.',
  },
  {
    cost: '2+',
    name: 'Extra Information',
    description:
      "You uncover or notice something additional that wasn't part of the initial check — a hidden clue, extra details in a document, or more data from a system.",
  },
  {
    cost: '2',
    name: 'Speedy Completion',
    description: 'Halve the time required to perform the action.',
  },
  {
    cost: '2+',
    name: 'Reduce Suspicion',
    description:
      'Any security or observers suffer a −3 pool penalty to detect your actions.',
  },
  {
    cost: '3',
    name: 'Save Materials',
    description:
      'If the check involved materials, halve the resources needed by improvising parts from your surroundings (GM is the final arbiter).',
  },
  {
    cost: '3',
    name: 'Immediate Solution',
    description:
      'You find an unexpected shortcut, completely bypassing a step or a secondary check.',
  },
  {
    cost: '4+',
    name: 'Extended Success',
    description:
      'Your success creates a long-term benefit — a future contact, a backdoor in a hacked system, a trail to future clues.',
  },
]
