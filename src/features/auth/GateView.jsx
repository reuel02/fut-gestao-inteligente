import { useState } from 'react'
import { Clock, Send, ShieldAlert, LogOut, RefreshCw, UserCheck } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../../components/Avatar'

export default function GateView() {
  const { profile, access, requestJoin, refreshAccount, signOut } = useAuth()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const handleRequest = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestJoin(message)
    } catch (err) {
      setError(err.message || 'Erro ao enviar solicitação.')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshAccount()
    } finally {
      setRefreshing(false)
    }
  }

  const dummyPlayer = {
    id: profile?.id || 'me',
    name: profile?.name || 'Jogador',
    avatarUrl: profile?.avatar_url,
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-black px-4 py-8">
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl">
        <div className="pointer-events-none absolute -top-24 left-1/2 size-60 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Avatar player={dummyPlayer} size="xl" />
          </div>
          <h1 className="text-xl font-black text-white">Olá, {profile?.name || 'Jogador'}!</h1>
          <p className="mt-1 text-xs text-zinc-400">{profile?.email}</p>
        </div>

        {error && (
          <div
            role="alert"
            className="animate-fade-up mt-4 flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-300"
          >
            <ShieldAlert className="size-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Estado 1: Ainda não solicitou entrada */}
        {access === 'none' && (
          <div className="relative mt-6 space-y-4 text-center">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-left">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <UserCheck className="size-4 text-emerald-400" />
                Acesso por aprovação
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Para participar do sorteio e partidas, envie seu pedido de entrada. O organizador irá
                avaliar e definir sua nota técnica para garantir o equilíbrio dos times.
              </p>
            </div>

            <form onSubmit={handleRequest} className="space-y-3 text-left">
              <label
                htmlFor="input-msg"
                className="block text-xs font-bold uppercase tracking-wider text-zinc-400"
              >
                Mensagem para o organizador <span className="font-normal normal-case text-zinc-500">(opcional)</span>
              </label>
              <textarea
                id="input-msg"
                rows={2}
                maxLength={250}
                placeholder="Ex: Amigo do Rafael, jogo de ala/fixo..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />

              <button
                id="btn-request-join"
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-extrabold text-zinc-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {loading ? (
                  <span className="inline-block size-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                ) : (
                  <>
                    <Send className="size-4" />
                    Solicitar entrada no futebol
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Estado 2: Pedido em análise (pendente) */}
        {access === 'pending' && (
          <div className="relative mt-6 space-y-4 text-center">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-amber-400/20 text-amber-300">
                <Clock className="size-5" />
              </div>
              <h2 className="text-sm font-extrabold text-white">Solicitação em análise</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                Seu pedido foi enviado! O organizador (
                <span className="font-semibold text-white">ferreirareuel3@gmail.com</span>) irá avaliar
                seu perfil e definir sua nota técnica para liberar seu acesso.
              </p>
            </div>

            <button
              id="btn-check-approval"
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-200 transition-all hover:bg-zinc-800 active:scale-[0.98]"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
              Verificar se já foi aprovado
            </button>
          </div>
        )}

        {/* Estado 3: Pedido recusado */}
        {access === 'rejected' && (
          <div className="relative mt-6 space-y-4 text-center">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-center">
              <h2 className="text-sm font-extrabold text-red-200">Solicitação não aprovada</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                O organizador não pôde aprovar sua entrada no momento. Você pode enviar uma nova
                mensagem se achar necessário.
              </p>
            </div>

            <button
              id="btn-try-again"
              type="button"
              onClick={() => handleRequest({ preventDefault: () => {} })}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-800 text-xs font-bold text-white transition-all hover:bg-zinc-700"
            >
              Pedir novamente
            </button>
          </div>
        )}

        <div className="mt-6 border-t border-zinc-900 pt-4 text-center">
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <LogOut className="size-3.5" />
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  )
}
