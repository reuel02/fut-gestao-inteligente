import { Sigma } from 'lucide-react'
import Avatar from '../../components/Avatar'
import PositionBadge from '../../components/PositionBadge'
import RatingPips from '../../components/RatingPips'
import { TEAM_THEMES, formatNumber } from '../../utils/balanceTeams'

/** Card de time com jogadores e força média/total (prova do balanceamento). */
export default function TeamCard({ team, index = 0 }) {
  const theme = TEAM_THEMES[team.themeIndex]
  return (
    <article
      className={`animate-fade-up overflow-hidden rounded-3xl border bg-zinc-900 shadow-xl ${theme.border} ${theme.glow}`}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <header className={`${theme.soft} px-4 pb-4 pt-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`flex size-11 items-center justify-center rounded-2xl text-xl font-black text-zinc-950 ${theme.bar}`}
            >
              {theme.letter}
            </span>
            <div>
              <h3 className="text-lg font-extrabold leading-tight text-white">
                {team.name}
              </h3>
              <p className="text-xs text-zinc-400">{team.players.length} jogadores</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Força média
            </p>
            <p className={`text-3xl font-black tabular-nums leading-none ${theme.text}`}>
              {formatNumber(team.average, 2)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <Sigma className="size-3" /> Total
            </span>
            <span className="tabular-nums text-zinc-200">{team.total} pts</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${theme.bar}`}
              style={{ width: `${(team.average / 5) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <ul className="divide-y divide-zinc-800/70 px-4">
        {team.players.map((player) => (
          <li key={player.id} className="flex items-center gap-3 py-2.5">
            <Avatar player={player} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
              {player.name}
            </span>
            <PositionBadge position={player.position} />
            <RatingPips value={player.rating} />
          </li>
        ))}
      </ul>
    </article>
  )
}
