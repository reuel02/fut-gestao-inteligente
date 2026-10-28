import { useMemo, useState } from 'react'
import {
  Crown,
  Goal,
  HandHelping,
  Shield,
  Trophy,
  Activity,
  Pencil,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react'
import Avatar from '../../components/Avatar'
import PositionBadge from '../../components/PositionBadge'
import MembershipBadge from '../../components/MembershipBadge'
import ScreenHeader from '../../components/ScreenHeader'
import EditEventModal from '../aovivo/EditEventModal'
import PlayerActionsModal from './PlayerActionsModal'
import { getRecentPeriods, isDateInPeriod } from '../../utils/period'

const METRICS = [
  { id: 'goals', label: 'Artilharia', unit: 'gols', icon: Goal },
  { id: 'assists', label: 'Garçons', unit: 'assists', icon: HandHelping },
  { id: 'saves', label: 'Defesa', unit: 'defesas', icon: Shield },
  { id: 'matches', label: 'Presença', unit: 'jogos', icon: Activity },
]

const MEDALS = [
  'from-yellow-300 to-amber-500 text-amber-950',
  'from-zinc-200 to-zinc-400 text-zinc-800',
  'from-orange-400 to-amber-700 text-orange-950',
]

function PodiumSpot({ entry, rank, unit, onSelectPlayer }) {
  const first = rank === 0
  return (
    <li
      onClick={() => onSelectPlayer(entry.player)}
      className={`flex flex-1 flex-col items-center cursor-pointer transition-transform hover:scale-105 active:scale-95 ${first ? '-mt-2' : 'mt-4'}`}
      title={`Ver últimas ações de ${entry.player.name}`}
    >
      <div className="relative">
        {first && (
          <Crown className="absolute -top-5 left-1/2 size-5 -translate-x-1/2 text-yellow-300" />
        )}
        <Avatar
          player={entry.player}
          size={first ? 'xl' : 'lg'}
          className={`!ring-4 ${first ? '!ring-yellow-400/80' : rank === 1 ? '!ring-zinc-300/70' : '!ring-orange-500/70'}`}
        />
        <span
          className={`absolute -bottom-2 left-1/2 flex size-6 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br text-xs font-black ring-2 ring-zinc-950 ${MEDALS[rank]}`}
        >
          {rank + 1}
        </span>
      </div>
      <p className="mt-3 max-w-full truncate text-sm font-bold text-white">{entry.player.name}</p>
      <div className="mt-1">
        <MembershipBadge type={entry.player.membership || 'mensalista'} size="xs" />
      </div>
      <p className="mt-1 text-2xl font-black tabular-nums text-emerald-400">{entry.value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{unit}</p>
    </li>
  )
}

/**
 * Ranking do futebol (estilo Cartola).
 * Consome a view `fut.player_stats` do Supabase e combina com os eventos ao vivo da partida atual.
 * Suporta filtro de temporada mensal renovado todo dia 10 de cada mês.
 */
export default function StatsTab({
  roster = [],
  stats = [],
  events = [],
  canManage = false,
  onOpenProfile,
  onEditEvent,
  onDeleteEvent,
}) {
  const [metricId, setMetricId] = useState('goals')
  const [editingEvent, setEditingEvent] = useState(null)
  const [showCorrections, setShowCorrections] = useState(false)
  const [selectedPlayerActions, setSelectedPlayerActions] = useState(null)

  const recentPeriods = useMemo(() => getRecentPeriods(4), [])
  const [selectedPeriodId, setSelectedPeriodId] = useState(recentPeriods[0].id)
  const currentPeriod = recentPeriods.find((p) => p.id === selectedPeriodId) || recentPeriods[0]
  const isAllTime = selectedPeriodId === 'ALL'

  const metric = METRICS.find((m) => m.id === metricId)

  const ranking = useMemo(() => {
    // Filtra eventos ao vivo da partida atual dentro do período selecionado
    const live = {}
    events.forEach((e) => {
      const eventDate = e.createdAt || e.created_at || new Date().toISOString()
      if (!isAllTime && !isDateInPeriod(eventDate, currentPeriod)) {
        return
      }

      if (e.type === 'goal' && e.scorer?.id) {
        live[e.scorer.id] = live[e.scorer.id] || { goals: 0, assists: 0, saves: 0, matches: 0 }
        live[e.scorer.id].goals += 1
      }
      if (e.assist?.id) {
        live[e.assist.id] = live[e.assist.id] || { goals: 0, assists: 0, saves: 0, matches: 0 }
        live[e.assist.id].assists += 1
      }
      if (e.type === 'save' && e.scorer?.id) {
        live[e.scorer.id] = live[e.scorer.id] || { goals: 0, assists: 0, saves: 0, matches: 0 }
        live[e.scorer.id].saves += 1
      }
    })

    const baseMap = new Map(stats.map((s) => [s.user_id, s]))

    return roster
      .filter((p) => p.isActive)
      .filter((p) => {
        // Estatísticas de Goleiros: O ranking de defesas contabiliza dados exclusivamente para goleiros
        if (metricId === 'saves') {
          return p.position === 'GOL' || p.keeperSlot !== null
        }
        return true
      })
      .map((player) => {
        const base = baseMap.get(player.id)
        const livePlayer = live[player.id] || { goals: 0, assists: 0, saves: 0, matches: 0 }
        const baseValue = base ? Number(base[metricId] || 0) : 0
        const liveValue = Number(livePlayer[metricId] || 0)

        return {
          player,
          value: baseValue + liveValue,
        }
      })
      .sort((a, b) => b.value - a.value || a.player.name.localeCompare(b.player.name))
  }, [roster, stats, events, metricId, currentPeriod, isAllTime])

  const maxValue = Math.max(1, ranking[0]?.value ?? 1)
  const podium = ranking.slice(0, 3)
  const rest = ranking.slice(3)

  return (
    <div className="h-full overflow-y-auto pb-6">
      <ScreenHeader
        title="Estatísticas"
        subtitle={isAllTime ? 'Histórico Geral' : currentPeriod.fullTitle}
        onOpenProfile={onOpenProfile}
      />

      <div className="space-y-4 px-4 pt-3">
        {/* Banner do Período / Temporada Mensal (Renovada todo dia 10) */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-zinc-900 to-zinc-900 p-3.5 shadow-md">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Calendar className="size-5" />
              </span>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  {isAllTime ? 'Temporadas Acumuladas' : currentPeriod.name}
                </h2>
                <p className="text-[11px] font-bold text-white">
                  {isAllTime ? 'Todos os lances' : currentPeriod.rangeLabel}
                  <span className="text-[10px] text-zinc-400 font-normal"> · Ciclo renovado todo dia 10</span>
                </p>
              </div>
            </div>

            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-500"
            >
              {recentPeriods.map((per) => (
                <option key={per.id} value={per.id}>
                  {per.name} ({per.rangeLabel}) {per.isCurrent ? '· Atual' : ''}
                </option>
              ))}
              <option value="ALL">Todas as Temporadas (Geral)</option>
            </select>
          </div>
        </div>
        <div
          role="tablist"
          aria-label="Métrica do ranking"
          className="grid grid-cols-4 gap-1 rounded-2xl bg-zinc-900 p-1"
        >
          {METRICS.map(({ id, label, icon: Icon }) => {
            const active = id === metricId
            return (
              <button
                key={id}
                id={`metric-${id}`}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMetricId(id)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-bold transition-all ${
                  active
                    ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="size-3.5" />
                <span className="truncate">{label}</span>
              </button>
            )
          })}
        </div>

        {ranking.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-800 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-zinc-300">Nenhum dado registrado ainda</p>
            <p className="mt-1 text-xs text-zinc-500">
              Gols e defesas da súmula ao vivo alimentam este ranking automaticamente.
            </p>
          </div>
        ) : (
          <section
            key={metricId}
            aria-label={`Ranking de ${metric.label}`}
            className="animate-fade-up space-y-4"
          >
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-emerald-500/10 via-zinc-900 to-zinc-900 px-3 pb-5 pt-8">
              <Trophy className="pointer-events-none absolute -right-3 -top-3 size-24 rotate-12 text-emerald-500/10" />
              <ul className="relative flex items-start gap-2">
                {podium.map((entry, i) => (
                  <PodiumSpot
                    key={entry.player.id}
                    entry={entry}
                    rank={i}
                    unit={metric.unit}
                    onSelectPlayer={setSelectedPlayerActions}
                  />
                ))}
              </ul>
            </div>

            <ol className="space-y-2">
              {rest.map((entry, i) => (
                <li
                  key={entry.player.id}
                  onClick={() => setSelectedPlayerActions(entry.player)}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 cursor-pointer hover:border-zinc-700 active:scale-[0.99] transition-all"
                  title={`Ver histórico de ações de ${entry.player.name}`}
                >
                  <span className="w-6 text-center text-sm font-black tabular-nums text-zinc-500">
                    {i + 4}
                  </span>
                  <Avatar player={entry.player} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="truncate text-sm font-semibold text-white">
                        {entry.player.name}
                      </p>
                      <PositionBadge position={entry.player.position} />
                      <MembershipBadge type={entry.player.membership || 'mensalista'} size="xs" />
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-emerald-500/80 transition-all duration-700"
                        style={{ width: `${(entry.value / maxValue) * 100}%` }}
                      />
                    </div>
                  </div>
                  <p className="min-w-8 text-right text-2xl font-black tabular-nums text-white">
                    {entry.value}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Painel de Correção de Dados (Admin e Gestor) */}
        {canManage && events.length > 0 && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3.5 space-y-3">
            <button
              type="button"
              onClick={() => setShowCorrections((prev) => !prev)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-emerald-400" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Correção de Súmula ({events.length})
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Editar ou remover gols, assistências e defesas lançados
                  </p>
                </div>
              </div>
              {showCorrections ? (
                <ChevronUp className="size-4 text-zinc-400" />
              ) : (
                <ChevronDown className="size-4 text-zinc-400" />
              )}
            </button>

            {showCorrections && (
              <ul className="space-y-2 border-t border-zinc-800/80 pt-2 animate-fade-down">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-zinc-950 p-2.5 border border-zinc-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xs font-bold text-zinc-300">
                        {ev.type === 'goal' ? (
                          <Goal className="size-3.5 text-emerald-400" />
                        ) : (
                          <Shield className="size-3.5 text-cyan-400" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">
                          {ev.scorer?.name || 'Jogador'}
                          {ev.type === 'goal' && ev.assist?.name && (
                            <span className="text-[10px] text-zinc-400 font-normal">
                              {' '}(Assist: {ev.assist.name})
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-medium">
                          {ev.type === 'goal' ? 'Gol' : 'Defesa'} · {ev.minute} min
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingEvent(ev)}
                        className="flex size-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 active:scale-95 transition-all"
                        title="Editar lance"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Deseja realmente remover este lance do ranking?')) {
                            await onDeleteEvent(ev.id)
                          }
                        }}
                        className="flex size-7 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all"
                        title="Excluir lance"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* Modal de Edição de Lance */}
      <EditEventModal
        event={editingEvent}
        roster={roster}
        open={Boolean(editingEvent)}
        onClose={() => setEditingEvent(null)}
        onSave={onEditEvent}
        onDelete={onDeleteEvent}
      />

      {/* Modal com as Últimas Ações do Jogador (Gols, Assists e Defesas) */}
      <PlayerActionsModal
        open={Boolean(selectedPlayerActions)}
        player={selectedPlayerActions}
        onClose={() => setSelectedPlayerActions(null)}
      />
    </div>
  )
}
