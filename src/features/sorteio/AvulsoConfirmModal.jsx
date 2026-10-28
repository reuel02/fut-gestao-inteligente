import { useState, useRef } from 'react'
import { Banknote, FileCheck, Loader2, UploadCloud, X } from 'lucide-react'

/**
 * Modal para o jogador Avulso solicitar presença na pelada:
 * - Opção 1: Enviar comprovante/print do PIX (upload de imagem)
 * - Opção 2: Informar pagamento em dinheiro no local da partida
 */
export default function AvulsoConfirmModal({ open, onClose, onConfirm, onUploadReceipt, userId }) {
  const [method, setMethod] = useState('pix') // 'pix' | 'cash'
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  if (!open) return null

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (!selected.type.startsWith('image/')) {
      setError('Por favor selecione uma imagem de comprovante (JPEG, PNG ou WebP).')
      return
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 5 MB.')
      return
    }

    setError('')
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      let receiptUrl = null
      if (method === 'pix') {
        if (!file) {
          setError('Por favor anexe o print do comprovante PIX.')
          setSubmitting(false)
          return
        }
        receiptUrl = await onUploadReceipt(userId, file)
      }

      await onConfirm({
        paymentMethod: method,
        receiptUrl,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao enviar confirmação.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar presença como avulso"
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto animate-fade-up"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />

        <header className="flex items-center justify-between pb-3 border-b border-zinc-900">
          <div>
            <h2 className="text-lg font-black text-white">Confirmação de Avulso</h2>
            <p className="text-xs text-zinc-400">Informe a forma de pagamento da sua vaga</p>
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
          <p role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs font-semibold text-red-300">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('pix')}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3.5 text-center transition-all ${
                  method === 'pix'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <FileCheck className="size-5" />
                <span className="text-xs font-bold">Comprovante PIX</span>
                <span className="text-[10px] text-zinc-500">Anexar print</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3.5 text-center transition-all ${
                  method === 'cash'
                    ? 'border-amber-400 bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <Banknote className="size-5" />
                <span className="text-xs font-bold">Dinheiro em mãos</span>
                <span className="text-[10px] text-zinc-500">Pagar no local</span>
              </button>
            </div>
          </div>

          {method === 'pix' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                Print do Comprovante PIX
              </label>

              {previewUrl ? (
                <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900 p-2 overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Preview do comprovante"
                    className="max-h-48 w-full object-contain rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null)
                      setPreviewUrl('')
                    }}
                    className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-full bg-black/80 text-white hover:bg-red-500"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/60 p-6 cursor-pointer hover:border-emerald-500/60 hover:bg-zinc-900 transition-all text-center"
                >
                  <UploadCloud className="size-8 text-zinc-400 mb-2" />
                  <p className="text-xs font-bold text-white">Toque para selecionar imagem</p>
                  <p className="text-[10px] text-zinc-500 mt-1">JPEG, PNG ou WebP até 5MB</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {method === 'cash' && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-xs text-amber-200">
              <p className="font-bold">Aviso sobre pagamento em dinheiro:</p>
              <p className="mt-1 text-[11px] text-amber-300/80">
                Sua vaga será aprovada pelo Gestor e ficará com a checagem de pagamento pendente até o final da pelada.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-black text-zinc-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-95 disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              'Enviar Solicitação de Presença'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
