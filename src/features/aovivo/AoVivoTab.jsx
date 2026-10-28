import { useState } from 'react'
import { Lock, Plus, Shield, Whistle } from 'lucide-react'
import ScreenHeader from '../../components/ScreenHeader'
import Scoreboard from './Scoreboard'
import Timeline from './Timeline'
import GoalSheet from './GoalSheet'
import SaveSheet from './SaveSheet'
import EditEventModal from './EditEventModal'
import { TEAM_THEMES } from '../../utils/balanceTeams'

/** Seleção do confronto (útil quando há 3 ou 4 times). Travada com a partida em andamento. */
function MatchupPicker({ allTeams, matchup, locked, onChange }) {
  const pick = (slot, index) => {
    const next = [...matchup]
    next[slot] = index
    onChange(next)
  }

  return (
    <section aria-label="Confronto" className="rounded-3xl border border-zinc-800 bg-zinc-900 p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Confronto</h2>
        {locked && (
          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
            <Lock className="size-3" /> Zere a partida para trocar
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((slot) => (
          <div key={slot} className="flex gap-1.5">
            {allTeams.map((team, index) => {
              const theme = TEAM_THEMES[team.themeIndex]
              const selected = matchup[slot] === index
              const taken = matchup[1 - slot] === index
              return (
                <button
                  key={team.id}
                  id={`matchup-${slot}-${team.id}`}
                  type="button"
                  disabled={locked || taken}
                  aria-pressed={selected}
                  onClick={() => pick(slot, index)}
                  className={`flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-black transition-all active:scale-95 disabled:cursor-not-allowed ${
                    selected
                      ? `${theme.bar} text-zinc-950`
                      : 'bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30'
                  }`}
                >
                  {theme.letter}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Súmula digital e Placar ao Vivo.
 * - Admin, Gestor ou o Juiz designado têm acesso total à operação.
 * - Jogadores comuns acompanham o placar e os lances em tempo real (somente leitura).
 */
export default function AoVivoTab({
  allTeams,
  live,
  canEdit,
  isReferee,
  referees = [],
  referee,
  onOpenProfile,
  currentUser,
  isAdmin,
  onEditEvent,
  onDeleteEvent,
}) {
  const [goalTeamId, setGoalTeamId] = useState(null)
  const [saveSheetOpen, setSaveSheetOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const teams = live.matchTeams

  const allReferees = referees.length > 0 ? referees : (referee ? [referee] : [])

  if (!teams) {
    return (
      <div className="h-full overflow-y-auto">
        <ScreenHeader
          title="Súmula ao vivo"
          subtitle="Aguardando o sorteio"
          onOpenProfile={onOpenProfile}
          currentUser={currentUser}
          isAdmin={isAdmin}
        />
        <div className="px-4 pt-4">
          <div className="rounded-3xl border border-dashed border-zinc-800 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-zinc-300">Nenhum confronto definido</p>
            <p className="mt-1 text-xs text-zinc-500">
              Faça o sorteio na aba Sorteio para liberar a súmula.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const sheetTeam = teams.find((t) => t.id === goalTeamId) ?? teams[0]
  const matchKeepers = teams.map((t) => t.keeper).filter(Boolean)

  const handleSaveGoal = (goal) => {
    live.addGoal(goal)
    setGoalTeamId(null)
  }

  const handleSaveDefense = ({ keeper }) => {
    live.addSave({ keeper })
    setSaveSheetOpen(false)
  }

  const handleFinishMatch = async () => {
    const hScore = live.score[teams[0].id] || 0
    const aScore = live.score[teams[1].id] || 0
    if (
      !confirm(
        `Encerrar partida (${teams[0].name} ${hScore} × ${aScore} ${teams[1].name})?\n\nOs gols e defesas serão mantidos no histórico e você poderá iniciar o próximo confronto.`,
      )
    ) {
      return
    }
    await live.finish()
  }

  const handleEditEventSave = async (eventId, patch) => {
    if (onEditEvent) {
      await onEditEvent(eventId, patch)
    } else if (live.editEvent) {
      await live.editEvent(eventId, patch)
    }
    setEditingEvent(null)
  }

  const handleDeleteEvent = async (eventId) => {
    if (onDeleteEvent) {
      await onDeleteEvent(eventId)
    } else {
      await live.removeEvent(eventId)
    }
    setEditingEvent(null)
  }

  return (
    <div className="h-full relative">
      <div className="h-full overflow-y-auto pb-6">
        <ScreenHeader
          title="Súmula ao vivo"
          subtitle={`${teams[0].name} vs ${teams[1].name}`}
          onOpenProfile={onOpenProfile}
          currentUser={currentUser}
          isAdmin={isAdmin}
        />

        <div className="space-y-4 px-4 pt-4">
          {/* Badge de permissão e árbitros */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            {canEdit ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                {isReferee
                  ? 'Você é um dos Árbitros oficiais'
                  : 'Súmula Oficial · Controle Operacional'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-3 py-1 font-semibold text-zinc-400">
                <Lock className="size-3 text-zinc-500" />
                Placar em Tempo Real · Súmula restrita ao Árbitro/Gestor
              </span>
            )}

            {allReferees.length > 0 && (
              <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                <Whistle className="size-3 text-amber-400" />
                {allReferees.length === 1 ? 'Árbitro: ' : 'Árbitros: '}
                <strong className="text-white">
                  {allReferees.map((r) => r.name).join(', ')}
                </strong>
              </span>
            )}
          </div>

          {live.error && (
            <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-300">
              {live.error}
            </p>
          )}

          {canEdit && allTeams.length > 2 && (
            <MatchupPicker
              allTeams={allTeams}
              matchup={live.matchup}
              locked={live.started}
              onChange={live.setMatchup}
            />
          )}

          <Scoreboard
            teams={teams}
            score={live.score}
            seconds={live.seconds}
            running={live.running}
            canEdit={canEdit}
            onToggleClock={live.toggleClock}
            onReset={live.reset}
            onFinish={handleFinishMatch}
          />

          {canEdit && (
            <div className="space-y-2.5">
              {/* Botões de Gol para cada time */}
              <div className="grid grid-cols-2 gap-3">
                {teams.map((team) => {
                  const theme = TEAM_THEMES[team.themeIndex]
                  return (
                    <button
                      key={team.id}
                      id={`btn-goal-${team.letter}`}
                      type="button"
                      onClick={() => setGoalTeamId(team.id)}
                      className={`flex h-20 flex-col items-center justify-center gap-1 rounded-3xl text-zinc-950 shadow-lg transition-all active:scale-95 ${theme.solid} ${theme.glow}`}
                    >
                      <Plus className="size-6" strokeWidth={3} />
                      <span className="text-base font-black leading-none">Gol</span>
                      <span className="text-[10px] font-bold opacity-75">{team.name}</span>
                    </button>
                  )
                })}
              </div>

              {/* Botão de Registro de Defesa de Goleiro (Mecânica e importância iguais) */}
              <button
                type="button"
                id="btn-register-save"
                onClick={() => setSaveSheetOpen(true)}
                className="w-full flex h-14 items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-400/20 via-zinc-900 to-amber-400/20 text-amber-300 font-black text-sm shadow-md transition-all hover:border-amber-400 active:scale-[0.98]"
              >
                <Shield className="size-5 text-amber-400" />
                <span>+ Registrar Grande Defesa (Goleiro)</span>
              </button>
            </div>
          )}

          <section aria-label="Linha do tempo">
            <div className="mb-3 mt-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Linha do tempo
              </h2>
              {canEdit && live.events.length > 0 && (
                <span className="text-[11px] text-zinc-500">
                  Toque no ícone de lápis para corrigir
                </span>
              )}
            </div>
            <Timeline
              events={live.events}
              teams={teams}
              canEdit={canEdit}
              onRemove={live.removeEvent}
              onEdit={(evt) => setEditingEvent(evt)}
            />
          </section>
        </div>
      </div>

      {canEdit && (
        <>
          <GoalSheet
            open={goalTeamId !== null}
            team={sheetTeam}
            onClose={() => setGoalTeamId(null)}
            onSave={handleSaveGoal}
          />

          <SaveSheet
            open={saveSheetOpen}
            keepers={matchKeepers}
            defaultMinute={Math.max(1, Math.ceil(live.seconds / 60))}
            onClose={() => setSaveSheetOpen(false)}
            onSave={handleSaveDefense}
          />

          <EditEventModal
            open={editingEvent !== null}
            event={editingEvent}
            teams={teams}
            onClose={() => setEditingEvent(null)}
            onSave={handleEditEventSave}
            onDelete={handleDeleteEvent}
          />
        </>
      )}
    </div>
  )
}

