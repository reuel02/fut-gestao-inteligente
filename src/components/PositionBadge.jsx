import { Hand } from 'lucide-react'
import { POSITIONS } from '../data/rules'

/** Badge de posição. Goleiro ganha destaque âmbar (cor da camisa de goleiro). */
export default function PositionBadge({ position }) {
  if (!position) {
    return (
      <span className="inline-flex rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-zinc-500">
        —
      </span>
    )
  }
  const isKeeper = position === 'GOL'
  return (
    <span
      title={POSITIONS[position].label}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider ${
        isKeeper
          ? 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40'
          : 'bg-zinc-800 text-zinc-400'
      }`}
    >
      {isKeeper && <Hand className="size-3" aria-hidden="true" />}
      {POSITIONS[position].short}
    </span>
  )
}
