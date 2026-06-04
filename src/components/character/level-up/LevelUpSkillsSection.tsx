import { InlineStepper } from '~/components/ui/InlineStepper'
import { SKILLS } from '~/lib/game-logic/skills'
import {
  SKILL_POINTS_PER_LEVEL,
  canBumpSkill,
  canUnbumpSkill,
  skillPointCost,
  skillPointsRemaining,
} from '~/lib/game-logic/level-up'

interface Props {
  baseSkills: Record<string, number>
  deltas: Record<string, number>
  onAdjust: (skillId: string, delta: 1 | -1) => void
}

export function LevelUpSkillsSection({ baseSkills, deltas, onAdjust }: Props) {
  const remaining = skillPointsRemaining(baseSkills, deltas)
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
          Skill points
        </h4>
        <div className="text-sm text-gray-1000">
          <span className="font-medium text-white tabular-nums">
            {remaining}
          </span>
          <span className="text-gray-700"> / {SKILL_POINTS_PER_LEVEL}</span>
          <span className="ml-2 text-xs text-gray-700">remaining</span>
        </div>
      </div>
      <p className="text-xs text-gray-900">
        +2 points per level. Skill levels 5–8 cost 2 points each.
      </p>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {SKILLS.map((skill) => {
          const base = baseSkills[skill.id] ?? 0
          const delta = deltas[skill.id] ?? 0
          const current = base + delta
          const nextCost = skillPointCost(current + 1)
          const bumpable = canBumpSkill(baseSkills, deltas, skill.id)
          const unbumpable = canUnbumpSkill(deltas, skill.id)
          return (
            <li
              key={skill.id}
              className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-background-100"
            >
              <span className="truncate text-sm text-gray-1000">
                {skill.name}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {delta > 0 && nextCost === 2 && bumpable && (
                  <span className="text-[10px] uppercase tracking-wide text-gray-700">
                    next: 2
                  </span>
                )}
                {delta === 0 && current + 1 >= 5 && current + 1 <= 8 && (
                  <span className="text-[10px] uppercase tracking-wide text-gray-700">
                    next: 2
                  </span>
                )}
                <InlineStepper
                  value={current}
                  ariaLabel={skill.name}
                  valueClassName={`text-sm tabular-nums ${
                    delta > 0 ? 'text-accent-900' : 'text-white'
                  }`}
                  decrementDisabled={!unbumpable}
                  incrementDisabled={!bumpable}
                  onAdjust={(d) => onAdjust(skill.id, d as 1 | -1)}
                />
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
