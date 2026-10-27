import { MEMBER_TABS, ADMIN_TAB } from '../data/tabs'

/** Bottom Navigation Bar fixa. O estado da aba ativa é controlado pelo App. */
export default function BottomNav({ active, onChange, live, isAdmin, pendingCount = 0 }) {
  const tabs = isAdmin ? [...MEMBER_TABS, ADMIN_TAB] : MEMBER_TABS

  return (
    <nav
      aria-label="Navegação principal"
      className="z-30 shrink-0 border-t border-zinc-800 bg-zinc-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <ul className={`grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <li key={id}>
              <button
                id={`tab-${id}`}
                type="button"
                onClick={() => onChange(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex w-full flex-col items-center gap-1 py-3 text-[11px] font-semibold transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span
                  className={`absolute top-0 h-0.5 rounded-full bg-emerald-400 transition-all duration-300 ${
                    isActive ? 'w-10 opacity-100' : 'w-0 opacity-0'
                  }`}
                />
                <span className="relative">
                  <Icon
                    className={`size-5 transition-transform duration-200 ${
                      isActive ? 'scale-110' : 'group-active:scale-90'
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {id === 'aovivo' && live && (
                    <span className="absolute -right-1 -top-0.5 size-2 animate-pulse-ring rounded-full bg-emerald-500" />
                  )}
                  {id === 'admin' && pendingCount > 0 && (
                    <span className="absolute -right-2 -top-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-zinc-950 shadow-sm">
                      {pendingCount}
                    </span>
                  )}
                </span>
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
