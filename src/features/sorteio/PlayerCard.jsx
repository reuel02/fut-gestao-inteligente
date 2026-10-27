import { Check, Lock } from 'lucide-react'
import Avatar from '../../components/Avatar'
import PositionBadge from '../../components/PositionBadge'
import MembershipBadge from '../../components/MembershipBadge'
import RatingPips from '../../components/RatingPips'

/**
 * Card horizontal compacto. Tocar alterna a confirmação do jogador.
 * - `locked`: goleiros fixos (ícone de cadeado, sem interação).
 * - `readOnly`: mostra o estado, mas o usuário não pode alterá-lo (ex.: presença de outro jogador).
 */
export default function PlayerCard({
  player,
  onToggle,
  index = 0,
  locked = false,
  readOnly = false,
  highlight = false,
}) {
  const isKeeper = locked || player.keeperSlot
  const confirmed = locked || player.confirmed
  const interactive = !locked && !readOnly

  const content = (
    <>
      <Avatar player={player} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-white">{player.name}</span>
          {highlight && (
            <span className="rounded bg-emerald-500/15 px-1 text-[9px] font-bold uppercase text-emerald-400">
              você
            </span>
          )}
        </span>
        <span className="mt-1 flex items-center gap-1.5">
          <PositionBadge position={locked ? 'GOL' : player.position} />
          {!locked && <MembershipBadge type={player.membership || 'mensalista'} size="xs" />}
        </span>
      </span>
      <RatingPips value={player.rating} />
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-all ${
          locked
            ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
            : confirmed
              ? 'border-emerald-500 bg-emerald-500 text-zinc-950'
              : 'border-zinc-700 text-transparent'
        }`}
      >
        {locked ? (
          <Lock className="size-3" strokeWidth={2.5} />
        ) : (
          <Check className="size-3.5" strokeWidth={3} />
        )}
      </span>
    </>
  )

  const base = `flex w-full items-center gap-3 rounded-2xl border p-2.5 pr-3 text-left transition-all ${
    isKeeper
      ? 'border-amber-400/30 bg-gradient-to-r from-amber-400/10 to-zinc-900'
      : highlight
        ? 'border-emerald-500/40 bg-zinc-900'
        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
  } ${confirmed ? '' : 'opacity-45'}`

  return (
    <li className="animate-fade-up" style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}>
      {interactive ? (
        <button
          type="button"
          onClick={() => onToggle(player.id, !player.confirmed)}
          aria-pressed={player.confirmed}
          className={`${base} active:scale-[0.98]`}
        >
          {content}
        </button>
      ) : (
        <div className={base}>{content}</div>
      )}
    </li>
  )
}
