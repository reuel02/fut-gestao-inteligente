import { useState } from 'react'
import { Lock, Plus } from 'lucide-react'
import ScreenHeader from '../../components/ScreenHeader'
import Scoreboard from './Scoreboard'
import Timeline from './Timeline'
import GoalSheet from './GoalSheet'
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
 * Súmula digital. A GoalSheet é renderizada aqui dentro, mas posicionada de forma
 * absoluta em relação ao frame do app (o `relative` raiz), cobrindo inclusive a nav.
 * Admin opera; os demais jogadores acompanham em tempo real (somente leitura).
 */
export default function AoVivoTab({ allTeams, live, canEdit, onOpenProfile, currentUser, isAdmin }) {
  const [goalTeamId, setGoalTeamId] = useState(null)
  const teams = live.matchTeams

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
  const closeSheet = () => setGoalTeamId(null)

  const handleSave = (goal) => {
    live.addGoal(goal)
    closeSheet()
  }

  return (
    <div className="h-full">
      <div className="h-full overflow-y-auto pb-6">
        <ScreenHeader
          title="Súmula ao vivo"
          subtitle={`${teams[0].name} vs ${teams[1].name}`}
          onOpenProfile={onOpenProfile}
          currentUser={currentUser}
          isAdmin={isAdmin}
        />

        <div className="space-y-4 px-4 pt-4">
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
            onFinish={live.finish}
          />

          {canEdit && (
            <div className="grid grid-cols-2 gap-3">
              {teams.map((team) => {
                const theme = TEAM_THEMES[team.themeIndex]
                return (
                  <button
                    key={team.id}
                    id={`btn-goal-${team.letter}`}
                    type="button"
                    onClick={() => setGoalTeamId(team.id)}
                    className={`flex h-24 flex-col items-center justify-center gap-1 rounded-3xl text-zinc-950 shadow-lg transition-all active:scale-95 ${theme.solid} ${theme.glow}`}
                  >
                    <Plus className="size-7" strokeWidth={3} />
                    <span className="text-lg font-black leading-none">Gol</span>
                    <span className="text-[11px] font-bold opacity-70">{team.name}</span>
                  </button>
                )
              })}
            </div>
          )}

          <section aria-label="Linha do tempo">
            <h2 className="mb-3 mt-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Linha do tempo
            </h2>
            <Timeline
              events={live.events}
              teams={teams}
              canEdit={canEdit}
              onRemove={live.removeEvent}
            />
          </section>
        </div>
      </div>

      {canEdit && (
        <GoalSheet
          open={goalTeamId !== null}
          team={sheetTeam}
          onClose={closeSheet}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
