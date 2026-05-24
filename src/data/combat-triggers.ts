import type { TriggerOption } from './trigger-options'

/**
 * Combat-specific trigger options (rulebook "Triggers & Complications" →
 * "Combat Triggers"). Same shape as the universal table — surfaced
 * alongside it in the roll-result trigger panel when a roll is made in
 * combat context.
 */
export const COMBAT_TRIGGER_OPTIONS: TriggerOption[] = [
  {
    cost: '1+',
    name: 'Reposition',
    description:
      'After resolving your action, move one square (may stack with free movement).',
  },
  {
    cost: '1+',
    name: 'Restrain',
    description:
      'Restrain your attack — when the target rolls for injury, cancel up to two rolled wound symbols per trigger spent.',
  },
  {
    cost: '1+',
    name: 'Distract / Suppress',
    description:
      'A target of your attack suffers a −1 pool penalty on their next check.',
  },
  {
    cost: '2',
    name: 'Support',
    description:
      'Support an ally — they gain +2 pool on their next action. Doesn’t stack with other Support on the same target.',
  },
  {
    cost: '2+',
    name: 'Enable opening',
    description:
      'Give an ally +1 AP immediately. Limited to +2 AP per target per round.',
  },
  {
    cost: '2',
    name: 'Cover fire',
    description:
      'An ally gains +4 pool on their next Dodge or Parry this round. Doesn’t stack, and can’t combine with Support.',
  },
  {
    cost: '3+',
    name: 'Heroic inspiration',
    description:
      'Give an ally 1 Edge point usable this encounter — expires otherwise.',
  },
  {
    cost: '3',
    name: 'Critical hit',
    description:
      'The attack deals twice the usual damage (after all modifiers).',
  },
]
