import type { AttributeId } from './attributes'

export interface SkillDefinition {
  id: string
  name: string
  attributes: AttributeId[]
}

export const SKILLS: SkillDefinition[] = [
  { id: 'acrobatics', name: 'Acrobatics', attributes: ['agi', 'str'] },
  { id: 'athletics', name: 'Athletics', attributes: ['con', 'str'] },
  { id: 'command', name: 'Command', attributes: ['per', 'coo'] },
  { id: 'computers', name: 'Computers', attributes: ['int'] },
  { id: 'con_arts', name: 'Con Arts', attributes: ['per', 'coo'] },
  { id: 'defense', name: 'Defense', attributes: ['agi', 'con'] },
  { id: 'empathy', name: 'Empathy', attributes: ['per', 'int'] },
  { id: 'firearms', name: 'Firearms', attributes: ['agi', 'coo'] },
  { id: 'gunnery', name: 'Gunnery', attributes: ['agi', 'int'] },
  { id: 'heavy_weapons', name: 'Heavy Weapons', attributes: ['str', 'coo'] },
  { id: 'infiltration', name: 'Infiltration', attributes: ['agi', 'coo'] },
  { id: 'investigation', name: 'Investigation', attributes: ['int', 'coo'] },
  { id: 'medicine', name: 'Medicine', attributes: ['edu', 'coo'] },
  { id: 'melee', name: 'Melee', attributes: ['str', 'agi'] },
  { id: 'pilot', name: 'Pilot', attributes: ['agi', 'coo'] },
  { id: 'politics', name: 'Politics', attributes: ['edu', 'per'] },
  { id: 'science', name: 'Science', attributes: ['int', 'edu'] },
  { id: 'sensors', name: 'Sensors', attributes: ['int', 'edu'] },
  { id: 'skullduggery', name: 'Skullduggery', attributes: ['coo', 'int'] },
  { id: 'streetwise', name: 'Streetwise', attributes: ['int', 'per'] },
  { id: 'survival', name: 'Survival', attributes: ['con'] },
  { id: 'tech', name: 'Tech', attributes: ['int', 'agi'] },
  { id: 'xenology', name: 'Xenology', attributes: ['int', 'edu'] },
  { id: 'zero_g', name: 'Zero-G', attributes: ['con', 'agi'] },
]

export const MAX_SKILL_LEVEL = 8
