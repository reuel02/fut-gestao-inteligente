import { ExternalLink, X } from 'lucide-react'

export default function ReceiptViewModal({ open, receiptUrl, playerName, onClose }) {
  if (!open || !receiptUrl) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Visualizar comprovante"
        className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl z-10 max-h-[90vh] flex flex-col animate-fade-up"
      >
        <header className="flex items-center justify-between pb-3 border-b border-zinc-900">
          <div>
            <h2 className="text-sm font-black text-white">Comprovante de Pagamento</h2>
            <p className="text-xs text-zinc-400">{playerName || 'Jogador Avulso'}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
              title="Abrir imagem original"
            >
              <ExternalLink className="size-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="mt-4 flex-1 overflow-auto rounded-2xl bg-zinc-900/60 p-2 flex items-center justify-center min-h-[250px]">
          <img
            src={receiptUrl}
            alt={`Comprovante de ${playerName}`}
            className="max-h-[60vh] max-w-full rounded-xl object-contain"
          />
        </div>
      </div>
    </div>
  )
}
