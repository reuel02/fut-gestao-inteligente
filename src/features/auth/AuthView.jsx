import { useState } from 'react'
import { ArrowRight, CheckCircle2, Lock, Mail, ShieldAlert, User, Sparkles } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function AuthView() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
      } else {
        if (!name.trim()) throw new Error('Por favor, informe seu nome.')
        const result = await signUp(name.trim(), email.trim(), password)
        if (result.needsConfirmation) {
          setSuccessMsg(
            'Cadastro realizado! Enviamos um link de confirmação para o seu e-mail. Por favor, confirme antes de entrar.',
          )
        }
      }
    } catch (err) {
      setError(err.message || 'Falha na autenticação. Verifique os dados.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-black px-4 py-8">
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl">
        {/* Glow decorativo no fundo */}
        <div className="pointer-events-none absolute -top-24 left-1/2 size-60 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-zinc-950 shadow-lg shadow-emerald-500/25">
            <Sparkles className="size-7" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Futebol Society
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
            Gestão Inteligente
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Sorteio balanceado, súmula digital ao vivo e ranking de estatísticas.
          </p>
        </div>

        {/* Toggle de Modo: Entrar / Criar conta */}
        <div className="relative mt-6 grid grid-cols-2 rounded-2xl bg-zinc-900 p-1">
          <button
            type="button"
            id="tab-login"
            onClick={() => {
              setMode('login')
              setError('')
              setSuccessMsg('')
            }}
            className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
              mode === 'login'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            id="tab-register"
            onClick={() => {
              setMode('register')
              setError('')
              setSuccessMsg('')
            }}
            className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
              mode === 'register'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Criar conta
          </button>
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

        {successMsg && (
          <div
            role="alert"
            className="animate-fade-up mt-4 flex items-start gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-300"
          >
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative mt-5 space-y-3.5">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="input-name"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-400"
              >
                Nome ou Apelido na pelada
              </label>
              <div className="relative flex items-center">
                <User className="pointer-events-none absolute left-3.5 size-4 text-zinc-500" />
                <input
                  id="input-name"
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="input-email"
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-400"
            >
              E-mail
            </label>
            <div className="relative flex items-center">
              <Mail className="pointer-events-none absolute left-3.5 size-4 text-zinc-500" />
              <input
                id="input-email"
                type="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="input-password"
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-400"
            >
              Senha
            </label>
            <div className="relative flex items-center">
              <Lock className="pointer-events-none absolute left-3.5 size-4 text-zinc-500" />
              <input
                id="input-password"
                type="password"
                required
                minLength={6}
                placeholder="Pelo menos 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            id="btn-auth-submit"
            type="submit"
            disabled={loading}
            className="mt-2 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-extrabold text-zinc-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {loading ? (
              <span className="inline-block size-5 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
            ) : mode === 'login' ? (
              <>
                Entrar no App
                <ArrowRight className="size-4" />
              </>
            ) : (
              'Criar minha conta'
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-900 pt-4 text-center">
          <p className="text-[11px] text-zinc-500">
            O acesso dos jogadores é liberado após aprovação do organizador da pelada (
            <span className="text-zinc-400">ferreirareuel3@gmail.com</span>).
          </p>
        </div>
      </div>
    </div>
  )
}
