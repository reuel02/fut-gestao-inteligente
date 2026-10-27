/** Nota técnica visual (1 a 5) + valor numérico. */
export default function RatingPips({ value, max = 5, showNumber = true }) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="img"
      aria-label={`Nota ${value} de ${max}`}
    >
      <span className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={`h-3 w-1.5 rounded-sm transition-colors ${
              i < value ? 'bg-emerald-500' : 'bg-zinc-700'
            }`}
          />
        ))}
      </span>
      {showNumber && (
        <span className="w-3 text-xs font-bold tabular-nums text-zinc-300">{value}</span>
      )}
    </span>
  )
}
