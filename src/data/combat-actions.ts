/**
 * Rulebook combat actions (§214). Each action either spends AP directly
 * ("direct") or opens a pre-configured roll modal ("roll").
 *
 * Weapon-bound actions — Attack, Reload, Attack Of Opportunity — aren't
 * listed here; they're rendered per equipped weapon at the call site so the
 * AP cost and skill come from the weapon. Everything else is character-
 * general and lives in this catalog.
 */
export type CombatActionKind = 'direct' | 'roll'

export interface CombatAction {
  id: string
  name: string
  apCost: number
  kind: CombatActionKind
  /** For kind='roll'. Omit to let the player name the skill at the modal. */
  skillId?: string
  /** Pool modifier pre-applied in the roll modal (e.g. -3 for Dodge / Parry). */
  poolModifier?: number
  description: string
}

export const COMBAT_ACTIONS: CombatAction[] = [
  {
    id: 'maneuver',
    name: 'Maneuver',
    apCost: 4,
    kind: 'direct',
    description: 'Move a number of squares equal to your speed.',
  },
  {
    id: 'disengage',
    name: 'Disengage',
    apCost: 3,
    kind: 'direct',
    description:
      'Move up to 2 squares without provoking Attacks Of Opportunity.',
  },
  {
    id: 'quickstep',
    name: 'Quickstep',
    apCost: 1,
    kind: 'direct',
    description: 'Move up to 1 square.',
  },
  {
    id: 'prepare',
    name: 'Prepare',
    apCost: 2,
    kind: 'direct',
    description:
      'Wait and prepare. Gain a stacking +1 pool bonus on your next roll, up to +4.',
  },
  {
    id: 'ready_weapon',
    name: 'Ready weapon',
    apCost: 3,
    kind: 'direct',
    description:
      'Take a holstered weapon into your hand. Throwables don’t need readying.',
  },
  {
    id: 'use_item',
    name: 'Use item',
    apCost: 2,
    kind: 'direct',
    description:
      'Use a special item like a medikit. Actual cost and effect depend on the item — adjust AP manually if it differs.',
  },
  {
    id: 'dodge',
    name: 'Dodge',
    apCost: 2,
    kind: 'roll',
    skillId: 'defense',
    poolModifier: -3,
    description:
      'Reactive: move one square and roll Defense (-3 pool) to add successes to the attacker’s difficulty. Must be declared before the attack roll.',
  },
  {
    id: 'parry',
    name: 'Parry',
    apCost: 1,
    kind: 'roll',
    skillId: 'defense',
    poolModifier: -3,
    description:
      'Reactive: roll Defense (-3 pool) against a melee attack. Full AP cost is 1 + half the attacker’s weapon AP (rounded up) — adjust AP manually for the heavier portion if needed.',
  },
  {
    id: 'assist',
    name: 'Assist',
    apCost: 3,
    kind: 'roll',
    skillId: 'command',
    description:
      'Aid an ally — Command or another fitting skill at difficulty 2. On success they gain +2 triggers on their next roll, plus one per surplus success.',
  },
  {
    id: 'second_wind',
    name: 'Second wind',
    apCost: 4,
    kind: 'roll',
    skillId: 'survival',
    description:
      'Rally yourself. Survival d0 — recover 1 health per success. Once per day.',
  },
  {
    id: 'assess_opportunities',
    name: 'Assess opportunities',
    apCost: 4,
    kind: 'roll',
    skillId: 'investigation',
    description:
      'Rulebook calls for a Vigilance d2 roll; we use Investigation as the closest fit. On success regain 1 Edge usable this encounter, or surface a heroic opportunity.',
  },
  {
    id: 'first_aid',
    name: 'First aid',
    apCost: 8,
    kind: 'roll',
    skillId: 'medicine',
    description:
      'Medicine check to treat someone’s lost health or injuries. Cannot be used on someone within melee reach of an enemy.',
  },
]
