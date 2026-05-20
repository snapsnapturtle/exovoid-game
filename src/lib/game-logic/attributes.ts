import type { CharacterAttributes } from '~/lib/types/database'

export const ATTRIBUTE_DEFINITIONS = [
  {
    id: 'con',
    name: 'Constitution',
    abbr: 'CON',
    description: 'Health and toughness',
  },
  { id: 'str', name: 'Strength', abbr: 'STR', description: 'Physical force' },
  {
    id: 'agi',
    name: 'Agility',
    abbr: 'AGI',
    description: 'Speed, reaction, fine motor skills',
  },
  {
    id: 'int',
    name: 'Intelligence',
    abbr: 'INT',
    description: 'Logical thinking, analysis',
  },
  {
    id: 'edu',
    name: 'Education',
    abbr: 'EDU',
    description: 'Knowledge and life experience',
  },
  {
    id: 'per',
    name: 'Personality',
    abbr: 'PER',
    description: 'Charisma and social skills',
  },
  {
    id: 'coo',
    name: 'Coolness',
    abbr: 'COO',
    description: 'Improvisation and composure',
  },
] as const

export type AttributeId = (typeof ATTRIBUTE_DEFINITIONS)[number]['id']

export const TOTAL_ATTRIBUTE_POINTS = 28
export const MAX_ATTRIBUTE_LEVEL = 8
export const CREATION_HIGH_CAP = 6
export const CREATION_HIGH_COUNT = 3
export const CREATION_LOW_CAP = 4

export const DEFAULT_ATTRIBUTES: CharacterAttributes = {
  con: 4,
  str: 4,
  agi: 4,
  int: 4,
  edu: 4,
  per: 4,
  coo: 4,
}

export function totalAttributePoints(attrs: CharacterAttributes): number {
  return Object.values(attrs).reduce((sum, v) => sum + v, 0)
}

export function remainingAttributePoints(attrs: CharacterAttributes): number {
  return TOTAL_ATTRIBUTE_POINTS - totalAttributePoints(attrs)
}
