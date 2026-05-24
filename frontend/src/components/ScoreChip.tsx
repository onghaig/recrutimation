interface ScoreChipProps {
  label: string
  value: number | null | undefined
  size?: 'sm' | 'md'
}

function scoreColor(v: number): string {
  if (v >= 75) return 'bg-emerald-100 text-emerald-700'
  if (v >= 50) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

export default function ScoreChip({ label, value, size = 'md' }: ScoreChipProps) {
  if (value == null) return null
  const color = scoreColor(value)
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${color} ${textSize}`}>
      {label} {value}
    </span>
  )
}
