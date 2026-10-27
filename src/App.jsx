import { useState, useMemo } from 'react'
import AuthProvider from './context/AuthProvider'
import { useAuth } from './hooks/useAuth'
import { useFutData } from './hooks/useFutData'
import { useLiveMatch } from './hooks/useLiveMatch'
import BottomNav from './components/BottomNav'
import SetupSupabase from './components/SetupSupabase'
import AuthView from './features/auth/AuthView'
import GateView from './features/auth/GateView'
import ProfileModal from './features/profile/ProfileModal'
import SorteioTab from './features/sorteio/SorteioTab'
import AoVivoTab from './features/aovivo/AoVivoTab'
import StatsTab from './features/stats/StatsTab'
import AdminTab from './features/admin/AdminTab'
import { Loader2 } from 'lucide-react'

function MainApp() {
  const { user, profile, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('sorteio')
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const { status, error, data, actions, refresh } = useFutData({
    userId: user?.id,
    isAdmin,
  })

  const live = useLiveMatch({
    teams: data.teams,
    keepers: data.keepers,
    match: data.match,
    events: data.events,
    sessionId: data.session?.id,
    userId: user?.id,
    canEdit: isAdmin,
    refresh,
  })

  // Se o usuário não for admin e estiver na aba admin, redireciona para o sorteio
  const safeTab = activeTab === 'admin' && !isAdmin ? 'sorteio' : activeTab

  const currentUser = useMemo(
    () => ({
      id: user?.id || 'me',
      name: profile?.name || 'Jogador',
      position: profile?.position,
      avatarUrl: profile?.avatar_url,
    }),
    [user, profile],
  )

  if (status === 'loading' && !data.session && data.roster.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-emerald-500" />
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Carregando futebol...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh justify-center bg-black">
      <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden bg-zinc-950 text-zinc-100 sm:border-x sm:border-zinc-900">
        {error && (
          <div className="bg-red-500/20 border-b border-red-500/30 p-2 text-center text-xs font-semibold text-red-300">
            {error}
          </div>
        )}

        {/* Todas as abas ficam montadas para transição instantânea e preservação do estado */}
        <main className="min-h-0 flex-1">
          <section hidden={safeTab !== 'sorteio'} className="h-full" aria-label="Sorteio">
            <SorteioTab
              players={data.linePlayers}
              keepers={data.keepers}
              session={data.session}
              teams={data.teams}
              isAdmin={isAdmin}
              userId={user?.id}
              currentUser={currentUser}
              onOpenProfile={() => setIsProfileOpen(true)}
              onToggle={actions.toggleAttendance}
              onDraw={actions.saveDraw}
              onCreateSession={actions.createSession}
            />
          </section>

          <section hidden={safeTab !== 'aovivo'} className="h-full" aria-label="Ao vivo">
            <AoVivoTab
              allTeams={data.teams}
              live={live}
              canEdit={isAdmin}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onOpenProfile={() => setIsProfileOpen(true)}
            />
          </section>

          <section hidden={safeTab !== 'stats'} className="h-full" aria-label="Estatísticas">
            <StatsTab
              roster={data.roster}
              stats={data.stats}
              events={data.events}
              onOpenProfile={() => setIsProfileOpen(true)}
            />
          </section>

          {isAdmin && (
            <section hidden={safeTab !== 'admin'} className="h-full" aria-label="Admin">
              <AdminTab
                roster={data.roster}
                requests={data.requests}
                session={data.session}
                actions={actions}
                onOpenProfile={() => setIsProfileOpen(true)}
              />
            </section>
          )}
        </main>

        <BottomNav
          active={safeTab}
          onChange={setActiveTab}
          live={live.running}
          isAdmin={isAdmin}
          pendingCount={data.requests.length}
        />

        <ProfileModal open={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      </div>
    </div>
  )
}

function AppContent() {
  const { access } = useAuth()

  if (access === 'notConfigured') {
    return <SetupSupabase />
  }

  if (access === 'loading') {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-emerald-500" />
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Gestão Inteligente...
          </p>
        </div>
      </div>
    )
  }

  if (access === 'signedOut') {
    return <AuthView />
  }

  if (access === 'none' || access === 'pending' || access === 'rejected') {
    return <GateView />
  }

  return <MainApp />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
