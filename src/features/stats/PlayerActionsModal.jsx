import { useState, useEffect } from 'react'
import { Activity, Goal, HandHelping, Loader2, Shield, X } from 'lucide-react'
import Avatar from '../../components/Avatar'
import PositionBadge from '../../components/PositionBadge'
import { fetchPlayerRecentActions } from '../../services/api'

export default function PlayerActionsModal({ open, player, onClose }) {
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('ALL') // 'ALL' | 'GOL' | 'ASSISTÊNCIA' | 'DEFESA'

  useEffect(() => {
    if (!open || !player?.id) return
    let mounted = true
    setLoading(true)

    fetchPlayerRecentActions(player.id, 50)
      .then((data) => {
        if (mounted) setActions(data || [])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [open, player?.id])

  if (!open || !player) return null

  const filtered = actions.filter((act) => {
    if (filter === 'ALL') return true
    return act.action_type === filter
  })

  const goalCount = actions.filter((a) => a.action_type === 'GOL').length
  const assistCount = actions.filter((a) => a.action_type === 'ASSISTÊNCIA').length
  const saveCount = actions.filter((a) => a.action_type === 'DEFESA').length

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Ações de ${player.name}`}
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10 max-h-[90vh] flex flex-col animate-fade-up"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />

        <header className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar player={player} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-black text-white truncate">{player.name}</h2>
                <PositionBadge position={player.position} />
              </div>
              <p className="text-[11px] text-zinc-400">Últimas ações contabilizadas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Resumo rápido */}
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-center">
            <p className="text-lg font-black text-emerald-400">{goalCount}</p>
            <p className="text-[10px] font-bold uppercase text-zinc-400">Gols</p>
          </div>
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-2 text-center">
            <p className="text-lg font-black text-sky-400">{assistCount}</p>
            <p className="text-[10px] font-bold uppercase text-zinc-400">Assists</p>
          </div>
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-2 text-center">
            <p className="text-lg font-black text-amber-300">{saveCount}</p>
            <p className="text-[10px] font-bold uppercase text-zinc-400">Defesas</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-3.5 flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'GOL', label: 'Gols' },
            { id: 'ASSISTÊNCIA', label: 'Assistências' },
            { id: 'DEFESA', label: 'Defesas' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                filter === id
                  ? 'bg-zinc-800 text-white ring-1 ring-zinc-700'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Lista de Ações */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-zinc-500">
              <Loader2 className="size-6 animate-spin text-emerald-400 mb-2" />
              <p className="text-xs">Carregando histórico...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
              <Activity className="size-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">Nenhuma ação encontrada neste filtro.</p>
            </div>
          ) : (
            filtered.map((act) => {
              const isGoal = act.action_type === 'GOL'
              const isAssist = act.action_type === 'ASSISTÊNCIA'

              return (
                <div
                  key={act.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-850 bg-zinc-900/90 p-3 hover:border-zinc-750 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl font-black ${
                        isGoal
                          ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                          : isAssist
                          ? 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30'
                          : 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30'
                      }`}
                    >
                      {isGoal ? (
                        <Goal className="size-4" />
                      ) : isAssist ? (
                        <HandHelping className="size-4" />
                      ) : (
                        <Shield className="size-4" />
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs font-black text-white uppercase tracking-wide">
                        {act.action_label}
                      </p>
                      {act.partner_name && (
                        <p className="text-[10px] text-zinc-400 truncate">
                          {isGoal
                            ? `Assistência: ${act.partner_name}`
                            : `Gol de: ${act.partner_name}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 shrink-0">
                    {act.formatted_time || '23:11'}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
