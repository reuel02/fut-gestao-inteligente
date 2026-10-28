import { Goal, HandHelping, Pencil, Shield, Trash2 } from 'lucide-react'
import { TEAM_THEMES } from '../../utils/balanceTeams'

/** Feed de eventos da partida (mais recente primeiro). Suporta gols e defesas. */
export default function Timeline({ events, teams, canEdit, onRemove, onEdit }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed border-zinc-800 px-6 py-10 text-center">
        <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-600">
          <Goal className="size-6" />
        </span>
        <p className="text-sm font-semibold text-zinc-300">Nenhum lance ainda</p>
        <p className="mt-1 text-xs text-zinc-500">Gols e defesas registrados aparecem aqui.</p>
      </div>
    )
  }

  return (
    <ol className="relative space-y-2.5 before:absolute before:bottom-4 before:left-[22px] before:top-4 before:w-px before:bg-zinc-800">
      {events.map((event) => {
        const team = teams.find((t) => t.id === event.teamId) || teams[0]
        const theme = TEAM_THEMES[team?.themeIndex ?? 0]
        const isGoal = event.type === 'goal'

        return (
          <li
            key={event.id}
            className="animate-fade-up relative flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3"
          >
            <span
              className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full ring-4 ring-zinc-950 ${
                isGoal ? `${theme.bar} text-zinc-950` : 'bg-amber-400 text-zinc-950'
              }`}
            >
              {isGoal ? (
                <Goal className="size-5" strokeWidth={2.5} />
              ) : (
                <Shield className="size-5" strokeWidth={2.5} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {isGoal ? `Gol de ${event.scorer.name}` : `Defesa de ${event.scorer.name}`}
              </p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-zinc-400">
                {isGoal ? (
                  event.assist ? (
                    <>
                      <HandHelping className="size-3 shrink-0" />
                      Assistência de {event.assist.name}
                    </>
                  ) : (
                    'Sem assistência'
                  )
                ) : (
                  'Goleiro'
                )}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-xs font-mono font-black tabular-nums px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 ${isGoal ? theme.text : 'text-amber-400'}`}>
                {event.recordedTime ||
                  (event.createdAt
                    ? new Date(event.createdAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : `${event.minute}'`)}
              </span>
              {canEdit && (
                <div className="flex items-center gap-2">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(event)}
                      aria-label="Corrigir lance"
                      className="text-zinc-500 transition-colors hover:text-emerald-400"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(event.id)}
                    aria-label={`Remover lance de ${event.scorer.name}`}
                    className="text-zinc-600 transition-colors hover:text-red-400"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
