export const XP_THRESHOLDS = [
  0, 10, 25, 40, 65, 90, 120, 155, 200, 255, 315, 385, 470, 570, 700,
]

export const MAX_LEVEL = XP_THRESHOLDS.length

export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1
  let level = 1
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1
    else break
  }
  return Math.min(level, MAX_LEVEL)
}

export interface XpProgress {
  level: number
  current: number
  next: number
  percent: number
}

export function xpProgress(xp: number): XpProgress {
  const level = levelFromXp(xp)
  const current = XP_THRESHOLDS[level - 1] ?? 0
  const next = XP_THRESHOLDS[level] ?? current
  const span = next - current
  const within = xp - current
  const percent = span > 0 ? Math.min(100, (within / span) * 100) : 100
  return { level, current, next, percent }
}
