import { ShieldCheck, User } from 'lucide-react'
import Avatar from './Avatar'

/** Cabeçalho padrão de cada aba com suporte a avatar do usuário e ações à direita. */
export default function ScreenHeader({ title, subtitle, right, onOpenProfile, currentUser, isAdmin }) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-900 bg-zinc-950/85 px-5 pb-4 pt-6 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-500">
              Gestão Inteligente
            </p>
            {isAdmin && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-400 ring-1 ring-emerald-500/30">
                <ShieldCheck className="size-2.5" /> Admin
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-zinc-400">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {right}
          {onOpenProfile && (
            <button
              id="btn-open-profile"
              type="button"
              onClick={onOpenProfile}
              aria-label="Abrir perfil"
              className="relative rounded-full ring-2 ring-zinc-800 transition-transform active:scale-95 hover:ring-emerald-500/50"
            >
              {currentUser ? (
                <Avatar player={currentUser} size="sm" />
              ) : (
                <span className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400">
                  <User className="size-4" />
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
