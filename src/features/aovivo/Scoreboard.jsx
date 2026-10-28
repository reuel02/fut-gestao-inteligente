import { Flag, Pause, Play, RotateCcw } from 'lucide-react'
import { TEAM_THEMES } from '../../utils/balanceTeams'
import { formatClock } from '../../utils/time'

/** Placar + cronômetro no topo da súmula. */
export default function Scoreboard({
  teams,
  score,
  seconds,
  running,
  canEdit,
  onToggleClock,
  onReset,
  onFinish,
}) {
  const [home, away] = teams
  return (
    <section
      aria-label="Placar"
      className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-5"
    >
      <div className="pointer-events-none absolute -top-16 left-1/2 size-48 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative flex flex-col items-center">
        <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950/70 px-4 py-1.5">
          <span
            className={`size-2 rounded-full ${
              running ? 'animate-pulse bg-red-500' : 'bg-zinc-600'
            }`}
          />
          <span
            id="match-clock"
            className="font-mono text-xl font-bold tabular-nums tracking-wider text-white"
          >
            {formatClock(seconds)}
          </span>
        </div>

        <div className="mt-5 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
          {[home, away].map((team, i) => {
            const theme = TEAM_THEMES[team.themeIndex]
            return (
              <div
                key={team.id}
                className={`flex flex-col items-center gap-2 ${i === 1 ? 'order-3' : 'order-1'}`}
              >
                <span
                  className={`flex size-12 items-center justify-center rounded-2xl text-xl font-black text-zinc-950 ${theme.bar}`}
                >
                  {theme.letter}
                </span>
                <span className="text-xs font-bold text-zinc-300">{team.name}</span>
              </div>
            )
          })}

          <div className="order-2 flex items-center gap-3 text-6xl font-black tabular-nums text-white">
            <span key={`h${score[home.id]}`} className="animate-pop">
              {score[home.id]}
            </span>
            <span className="text-3xl font-bold text-zinc-600">×</span>
            <span key={`a${score[away.id]}`} className="animate-pop">
              {score[away.id]}
            </span>
          </div>
        </div>

        {canEdit ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              id="btn-toggle-clock"
              type="button"
              onClick={onToggleClock}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all active:scale-95 ${
                running
                  ? 'bg-zinc-800 text-white hover:bg-zinc-700 ring-1 ring-zinc-700'
                  : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
              }`}
            >
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {running ? 'Pausar' : seconds > 0 ? 'Retomar Cronômetro' : 'Iniciar Cronômetro'}
            </button>

            <button
              id="btn-finish-match"
              type="button"
              onClick={onFinish}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-black bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20 transition-all hover:bg-amber-300 active:scale-95"
              title="Encerrar esta partida e salvar placar na súmula"
            >
              <Flag className="size-3.5" />
              Encerrar Partida
            </button>

            <button
              id="btn-reset-match"
              type="button"
              onClick={onReset}
              aria-label="Reiniciar cronômetro"
              title="Reiniciar cronômetro"
              className="flex size-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white active:scale-95"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        ) : (
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            {running ? 'Acompanhando ao vivo' : 'Partida pausada'}
          </p>
        )}
      </div>
    </section>
  )
}
