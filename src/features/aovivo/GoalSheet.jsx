import { useEffect, useState } from 'react'
import { Ban, Check, X } from 'lucide-react'
import Avatar from '../../components/Avatar'
import PositionBadge from '../../components/PositionBadge'
import { TEAM_THEMES } from '../../utils/balanceTeams'

function PlayerOption({ player, selected, onSelect, tone }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(player)}
      aria-pressed={selected}
      className={`flex items-center gap-3 rounded-2xl border p-2.5 text-left transition-all active:scale-[0.97] ${
        selected
          ? `${tone.border} ${tone.soft}`
          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
      }`}
    >
      <Avatar player={player} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{player.name}</span>
        <PositionBadge position={player.position} />
      </span>
      {selected && <Check className={`size-4 shrink-0 ${tone.text}`} strokeWidth={3} />}
    </button>
  )
}

/**
 * Slide-over inferior para registrar gol.
 * Sempre montado: a animação vem de transform/opacity, o que garante
 * entrada e saída suaves (base → topo).
 */
export default function GoalSheet({ open, team, onClose, onSave }) {
  const [scorer, setScorer] = useState(null)
  const [assist, setAssist] = useState(null)

  // limpa seleção sempre que abrir (ajuste de estado durante o render)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setScorer(null)
      setAssist(null)
    }
  }

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const theme = TEAM_THEMES[team.themeIndex]
  // goleiro fixo do lado + jogadores de linha do time
  const roster = [team.keeper, ...team.players].filter(Boolean)

  const pickScorer = (p) => {
    setScorer(p)
    if (assist?.id === p.id) setAssist(null)
  }

  return (
    <div
      className={`absolute inset-0 z-50 ${
        open ? 'visible' : 'invisible [transition:visibility_0s_linear_0.35s]'
      }`}
      aria-hidden={!open}
    >
      {/* overlay escuro */}
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Fechar painel"
        onClick={onClose}
        className={`absolute inset-0 w-full bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Registrar gol do ${team.name}`}
        className={`absolute inset-x-0 bottom-0 flex max-h-[88%] flex-col rounded-t-[28px] border-t border-zinc-700 bg-zinc-950 shadow-2xl transition-transform duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-zinc-700" />

        <header className="flex items-center justify-between px-5 pb-3 pt-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex size-10 items-center justify-center rounded-xl text-lg font-black text-zinc-950 ${theme.bar}`}
            >
              {theme.letter}
            </span>
            <div>
              <h2 className="text-lg font-extrabold leading-tight text-white">Gol!</h2>
              <p className={`text-xs font-semibold ${theme.text}`}>{team.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-9 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 transition-colors hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-4">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Quem fez o gol?
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {roster.map((p) => (
                <PlayerOption
                  key={p.id}
                  player={p}
                  tone={theme}
                  selected={scorer?.id === p.id}
                  onSelect={pickScorer}
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Assistência <span className="font-medium normal-case tracking-normal">(opcional)</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAssist(null)}
                aria-pressed={assist === null}
                className={`flex items-center gap-3 rounded-2xl border p-2.5 text-left text-sm font-semibold transition-all active:scale-[0.97] ${
                  assist === null
                    ? 'border-zinc-600 bg-zinc-800 text-white'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-zinc-800">
                  <Ban className="size-4" />
                </span>
                Sem assistência
              </button>
              {roster
                .filter((p) => p.id !== scorer?.id)
                .map((p) => (
                  <PlayerOption
                    key={p.id}
                    player={p}
                    tone={theme}
                    selected={assist?.id === p.id}
                    onSelect={setAssist}
                  />
                ))}
            </div>
          </section>
        </div>

        <footer className="shrink-0 border-t border-zinc-900 bg-zinc-950 p-4">
          <button
            id="btn-save-goal"
            type="button"
            disabled={!scorer}
            onClick={() => onSave({ teamId: team.id, scorer, assist })}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-extrabold text-zinc-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
          >
            <Check className="size-5" strokeWidth={3} />
            {scorer ? `Salvar gol de ${scorer.name}` : 'Selecione quem fez o gol'}
          </button>
        </footer>
      </div>
    </div>
  )
}
