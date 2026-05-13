interface TalentBudgetBarProps {
  spent: number
  total: number
}

export function TalentBudgetBar({ spent, total }: TalentBudgetBarProps) {
  const available = total - spent
  const tone =
    available < 0
      ? 'border-danger-500/60 text-danger-400'
      : available === 0
        ? 'border-void-600 text-gray-300'
        : 'border-accent-500/60 text-accent-300'

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border bg-void-800 px-4 py-2 ${tone}`}
    >
      <div className="text-sm">
        <span className="font-semibold">{spent}</span>
        <span className="text-gray-500"> / </span>
        <span className="text-gray-400">{total}</span>
        <span className="ml-1 text-xs uppercase tracking-wide text-gray-500">
          spent
        </span>
      </div>
      <div className="text-xs text-gray-400">
        {available > 0
          ? `${available} point${available === 1 ? '' : 's'} available`
          : available === 0
            ? 'No points available'
            : `${Math.abs(available)} over budget`}
      </div>
    </div>
  )
}
