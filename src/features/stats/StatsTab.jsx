import { useMemo, useState } from 'react'
import { Crown, Goal, HandHelping, Shield, Trophy, Activity } from 'lucide-react'
import Avatar from '../../components/Avatar'
import PositionBadge from '../../components/PositionBadge'
import MembershipBadge from '../../components/MembershipBadge'
import ScreenHeader from '../../components/ScreenHeader'

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

function PodiumSpot({ entry, rank, unit }) {
  const first = rank === 0
  return (
    <li className={`flex flex-1 flex-col items-center ${first ? '-mt-2' : 'mt-4'}`}>
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
 */
export default function StatsTab({ roster, stats = [], events = [], onOpenProfile }) {
  const [metricId, setMetricId] = useState('goals')
  const metric = METRICS.find((m) => m.id === metricId)

  const ranking = useMemo(() => {
    // Estatísticas ao vivo da partida em andamento
    const live = {}
    events.forEach((e) => {
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
  }, [roster, stats, events, metricId])

  const maxValue = Math.max(1, ranking[0]?.value ?? 1)
  const podium = ranking.slice(0, 3)
  const rest = ranking.slice(3)

  return (
    <div className="h-full overflow-y-auto pb-6">
      <ScreenHeader
        title="Estatísticas"
        subtitle="Temporada · Cartola da pelada"
        onOpenProfile={onOpenProfile}
      />

      <div className="space-y-5 px-4 pt-4">
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
                  <PodiumSpot key={entry.player.id} entry={entry} rank={i} unit={metric.unit} />
                ))}
              </ul>
            </div>

            <ol className="space-y-2">
              {rest.map((entry, i) => (
                <li
                  key={entry.player.id}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3"
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
      </div>
    </div>
  )
}
