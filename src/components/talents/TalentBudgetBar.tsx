interface TalentBudgetBarProps {
  spent: number
  total: number
}

export function TalentBudgetBar({ spent, total }: TalentBudgetBarProps) {
  const available = total - spent
  const tone =
    available < 0
      ? 'border-danger-700/60 text-danger-900'
      : available === 0
        ? 'border-gray-400 text-gray-1000'
        : 'border-accent-700/60 text-accent-900'

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border bg-background-200 px-4 py-2 ${tone}`}
    >
      <div className="text-sm">
        <span className="font-semibold">{spent}</span>
        <span className="text-gray-700"> / </span>
        <span className="text-gray-900">{total}</span>
        <span className="ml-1 text-xs uppercase tracking-wide text-gray-700">
          spent
        </span>
      </div>
      <div className="text-xs text-gray-900">
        {available > 0
          ? `${available} point${available === 1 ? '' : 's'} available`
          : available === 0
            ? 'No points available'
            : `${Math.abs(available)} over budget`}
      </div>
    </div>
  )
}
