import { useEffect, useState } from 'react'
import { Check, Shield, X } from 'lucide-react'
import Avatar from '../../components/Avatar'
import PositionBadge from '../../components/PositionBadge'

/**
 * Slide-over inferior para registrar Defesa de goleiro.
 * Exclusivo para goleiros cadastrados ou em campo na partida.
 */
export default function SaveSheet({ open, keepers = [], onClose, onSave }) {
  const [selectedKeeper, setSelectedKeeper] = useState(null)

  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setSelectedKeeper(keepers[0] ?? null)
    }
  }

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const submit = () => {
    if (!selectedKeeper) return
    onSave({ keeper: selectedKeeper })
  }

  return (
    <div
      className={`absolute inset-0 z-50 ${
        open ? 'visible' : 'invisible [transition:visibility_0s_linear_0.35s]'
      }`}
      aria-hidden={!open}
    >
      {/* Overlay escuro */}
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
        aria-label="Registrar defesa"
        className={`absolute inset-x-0 bottom-0 flex max-h-[88%] flex-col rounded-t-[28px] border-t border-zinc-700 bg-zinc-950 shadow-2xl transition-transform duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-zinc-700" />

        <header className="flex items-center justify-between px-5 pb-3 pt-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-400 text-zinc-950 font-black shadow-lg shadow-amber-400/20">
              <Shield className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold leading-tight text-white">Grande Defesa!</h2>
              <p className="text-xs text-zinc-400">Contabiliza no ranking de goleiros</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-9 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 transition-colors hover:text-white"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-2">
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
              Goleiro que realizou a defesa
            </h3>
            {keepers.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
                Nenhum goleiro escalado nesta partida.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {keepers.map((k) => {
                  const selected = selectedKeeper?.id === k.id
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setSelectedKeeper(k)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
                        selected
                          ? 'border-amber-400/60 bg-amber-400/10'
                          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <Avatar player={k} size="md" />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-white">{k.name}</span>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <PositionBadge position="GOL" />
                          {k.keeperSlot && (
                            <span className="text-[10px] font-bold text-amber-400">
                              Goleiro Slot {k.keeperSlot}
                            </span>
                          )}
                        </div>
                      </div>
                      {selected && <Check className="size-5 text-amber-400" strokeWidth={3} />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-zinc-900 border border-zinc-800 p-3">
            <span className="text-xs font-semibold text-zinc-400">Horário do registro</span>
            <span className="text-sm font-mono font-black text-amber-400 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
              {nowTime}
            </span>
          </div>
        </div>

        <footer className="border-t border-zinc-900 p-5">
          <button
            type="button"
            disabled={!selectedKeeper}
            onClick={submit}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 text-sm font-black text-zinc-950 shadow-lg shadow-amber-400/20 transition-all hover:bg-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
          >
            <Shield className="size-4" />
            Salvar Defesa
          </button>
        </footer>
      </div>
    </div>
  )
}
