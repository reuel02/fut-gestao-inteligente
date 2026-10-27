import { Goal, HandHelping, Trash2 } from 'lucide-react'
import { TEAM_THEMES } from '../../utils/balanceTeams'

/** Feed de eventos da partida (mais recente primeiro). */
export default function Timeline({ events, teams, canEdit, onRemove }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed border-zinc-800 px-6 py-10 text-center">
        <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-600">
          <Goal className="size-6" />
        </span>
        <p className="text-sm font-semibold text-zinc-300">Nenhum lance ainda</p>
        <p className="mt-1 text-xs text-zinc-500">Os gols registrados aparecem aqui.</p>
      </div>
    )
  }

  return (
    <ol className="relative space-y-2.5 before:absolute before:bottom-4 before:left-[22px] before:top-4 before:w-px before:bg-zinc-800">
      {events.map((event) => {
        const team = teams.find((t) => t.id === event.teamId)
        const theme = TEAM_THEMES[team.themeIndex]
        return (
          <li
            key={event.id}
            className="animate-fade-up relative flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3"
          >
            <span
              className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full ring-4 ring-zinc-950 ${theme.bar} text-zinc-950`}
            >
              <Goal className="size-5" strokeWidth={2.5} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                Gol do {event.scorer.name}
              </p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-zinc-400">
                {event.assist ? (
                  <>
                    <HandHelping className="size-3 shrink-0" />
                    Assistência do {event.assist.name}
                  </>
                ) : (
                  'Sem assistência'
                )}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-sm font-black tabular-nums ${theme.text}`}>
                {event.minute}'
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onRemove(event.id)}
                  aria-label={`Remover gol de ${event.scorer.name}`}
                  className="text-zinc-600 transition-colors hover:text-red-400"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
