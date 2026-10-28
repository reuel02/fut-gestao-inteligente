import { useState } from 'react'
import { AlertTriangle, Check, CheckCircle2, Loader2, X } from 'lucide-react'
import Avatar from '../../components/Avatar'
import PositionBadge from '../../components/PositionBadge'

/**
 * Modal de Finalização de Pelada.
 * Regra obrigatória: Lista todos os jogadores avulsos que participaram da pelada.
 * O Admin/Gestor precisa confirmar o pagamento de cada um.
 * BLOQUEIO: Não permite finalizar se houver algum avulso com pagamento pendente.
 */
export default function FinishSessionModal({
  open,
  teams = [],
  keepers = [],
  linePlayers = [],
  onClose,
  onFinish,
}) {
  const [confirmedPayments, setConfirmedPayments] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Identifica todos os jogadores avulsos que foram efetivamente escalados nos times ou no gol
  const participatingAvulsos = (() => {
    const avulsoMap = new Map()

    // Jogadores de linha nos times
    teams.forEach((t) => {
      t.players?.forEach((p) => {
        if (p.membership === 'avulso') {
          avulsoMap.set(p.id, p)
        }
      })
    })

    // Goleiros escalados
    keepers.forEach((k) => {
      if (k.membership === 'avulso') {
        avulsoMap.set(k.id, k)
      }
    })

    // Fallback: se o sorteio não foi feito ou para checar quem confirmou presença
    if (avulsoMap.size === 0) {
      linePlayers.forEach((p) => {
        if (p.membership === 'avulso' && p.confirmed) {
          avulsoMap.set(p.id, p)
        }
      })
    }

    return Array.from(avulsoMap.values())
  })()

  // Inicializa o estado com quem já tinha paymentConfirmed = true
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      const initial = {}
      participatingAvulsos.forEach((p) => {
        initial[p.id] = Boolean(p.paymentConfirmed)
      })
      setConfirmedPayments(initial)
      setError('')
    }
  }

  if (!open) return null

  const togglePayment = (id) => {
    setConfirmedPayments((prev) => ({ ...prev, [id]: !prev[id] }))
    setError('')
  }

  const unpaidCount = participatingAvulsos.filter((p) => !confirmedPayments[p.id]).length
  const canFinish = unpaidCount === 0

  const handleFinish = async () => {
    if (!canFinish) {
      setError('Confirme o pagamento de todos os avulsos antes de encerrar.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const paidIds = Object.entries(confirmedPayments)
        .filter(([, paid]) => paid)
        .map(([id]) => id)
      await onFinish(paidIds)
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao finalizar pelada.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Finalizar Pelada"
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
      >
        <header className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <div>
            <h2 className="text-lg font-black text-white">Finalizar Pelada</h2>
            <p className="text-xs text-zinc-400">Verificação de pagamentos e gravação de presenças</p>
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

        {error && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-300"
          >
            <AlertTriangle className="size-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Jogadores Avulsos Participantes ({participatingAvulsos.length})
              </h3>
              {participatingAvulsos.length > 0 && (
                <span
                  className={`text-[11px] font-bold ${
                    canFinish ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {unpaidCount === 0 ? 'Todos pagos' : `${unpaidCount} pendente(s)`}
                </span>
              )}
            </div>

            {participatingAvulsos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-4 text-center">
                <CheckCircle2 className="size-6 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-zinc-300">
                  Nenhum jogador avulso nesta partida.
                </p>
                <p className="text-[10px] text-zinc-500">
                  Apenas mensalistas participaram. Pagamentos OK!
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {participatingAvulsos.map((p) => {
                  const paid = Boolean(confirmedPayments[p.id])
                  return (
                    <li
                      key={p.id}
                      onClick={() => togglePayment(p.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                        paid
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar player={p} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">{p.name}</p>
                          <div className="flex items-center gap-1.5">
                            <PositionBadge position={p.position} />
                            <span className="text-[10px] font-bold text-amber-300">Avulso</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-bold ${
                            paid ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {paid ? 'Pago' : 'Pendente'}
                        </span>
                        <div
                          className={`size-6 rounded-lg border flex items-center justify-center transition-all ${
                            paid
                              ? 'border-emerald-500 bg-emerald-500 text-zinc-950'
                              : 'border-zinc-700 bg-zinc-900 text-transparent'
                          }`}
                        >
                          <Check className="size-4" strokeWidth={3} />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {!canFinish && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                <strong>Bloqueio de Encerramento:</strong> É obrigatório confirmar o pagamento de todos os
                jogadores avulsos antes de finalizar a pelada.
              </span>
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3 text-[11px] text-zinc-400">
            ℹ️ Ao finalizar, as presenças dos jogadores escalados serão gravadas no histórico e
            computadas nas estatísticas gerais do futebol.
          </div>
        </div>

        <footer className="mt-5 pt-4 border-t border-zinc-900 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-2xl border border-zinc-700 bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 active:scale-95 transition-all"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={!canFinish || submitting}
            onClick={handleFinish}
            className="flex-2 h-12 rounded-2xl bg-emerald-500 text-xs font-black text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              'Confirmar Encerramento'
            )}
          </button>
        </footer>
      </div>
    </div>
  )
}
