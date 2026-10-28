import { useState, useEffect } from 'react'
import { Check, Trash2, X, Goal, Shield, HandHelping } from 'lucide-react'
import Avatar from '../../components/Avatar'
import PositionBadge from '../../components/PositionBadge'

export default function EditEventModal({
  event,
  teams = [],
  roster = [],
  open,
  onClose,
  onSave,
  onDelete,
}) {
  const [playerId, setPlayerId] = useState('')
  const [assistId, setAssistId] = useState('')
  const [minute, setMinute] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (event) {
      setPlayerId(event.scorer?.id || '')
      setAssistId(event.assist?.id || '')
      setMinute(event.minute || 1)
    }
  }, [event, open])

  if (!open || !event) return null

  const team = teams.find((t) => t.id === event.teamId) || teams[0]
  const teamPlayers = team?.players || []
  const teamEligible = team?.keeper ? [team.keeper, ...teamPlayers] : teamPlayers
  const allEligible = teamEligible.length > 0 ? teamEligible : (roster.length > 0 ? roster : [event.scorer, event.assist].filter(Boolean))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!playerId) return
    setSaving(true)
    try {
      await onSave(event.id, {
        playerId,
        assistPlayerId: assistId || null,
        minute: Number(minute) || 1,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Deseja realmente excluir este lance? As estatísticas serão recalculadas.')) return
    await onDelete(event.id)
    onClose()
  }

  const isGoal = event.type === 'goal'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Corrigir Lance"
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
      >
        <header className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex size-9 items-center justify-center rounded-xl text-zinc-950 font-black ${
                isGoal ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            >
              {isGoal ? <Goal className="size-4" /> : <Shield className="size-4" />}
            </span>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Corrigir {isGoal ? 'Gol' : 'Defesa'}
              </h2>
              <p className="text-xs text-zinc-400">Ajuste autor, assistência ou minuto</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              {isGoal ? 'Autor do Gol' : 'Goleiro'}
            </label>
            <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
              {allEligible.map((p) => {
                const selected = p.id === playerId
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPlayerId(p.id)
                      if (assistId === p.id) setAssistId('')
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl border p-2 text-left text-xs transition-all ${
                      selected
                        ? 'border-emerald-500 bg-emerald-500/10 text-white font-bold'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <Avatar player={p} size="sm" />
                    <span className="flex-1 truncate">{p.name}</span>
                    <PositionBadge position={p.position} />
                    {selected && <Check className="size-4 text-emerald-400" />}
                  </button>
                )
              })}
            </div>
          </div>

          {isGoal && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center justify-between">
                <span>Assistência</span>
                {assistId && (
                  <button
                    type="button"
                    onClick={() => setAssistId('')}
                    className="text-[10px] text-zinc-500 hover:text-red-400"
                  >
                    Remover assistência
                  </button>
                )}
              </label>
              <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setAssistId('')}
                  className={`flex w-full items-center gap-2.5 rounded-xl border p-2 text-left text-xs transition-all ${
                    !assistId
                      ? 'border-zinc-700 bg-zinc-800 text-white font-bold'
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <HandHelping className="size-3.5" />
                  <span className="flex-1">Sem assistência</span>
                  {!assistId && <Check className="size-4 text-zinc-300" />}
                </button>
                {allEligible
                  .filter((p) => p.id !== playerId)
                  .map((p) => {
                    const selected = p.id === assistId
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setAssistId(p.id)}
                        className={`flex w-full items-center gap-2.5 rounded-xl border p-2 text-left text-xs transition-all ${
                          selected
                            ? 'border-emerald-500 bg-emerald-500/10 text-white font-bold'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <Avatar player={p} size="sm" />
                        <span className="flex-1 truncate">{p.name}</span>
                        <PositionBadge position={p.position} />
                        {selected && <Check className="size-4 text-emerald-400" />}
                      </button>
                    )
                  })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Minuto
            </label>
            <input
              type="number"
              min="1"
              max="90"
              required
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              className="w-24 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-zinc-900">
            <button
              type="button"
              onClick={handleDelete}
              className="flex h-11 items-center justify-center gap-1.5 px-4 rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-bold text-red-400 hover:bg-red-500/20 active:scale-95 transition-all"
            >
              <Trash2 className="size-3.5" />
              Excluir Lance
            </button>
            <button
              type="submit"
              disabled={saving || !playerId}
              className="flex-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-xs font-black text-zinc-950 shadow-md hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
