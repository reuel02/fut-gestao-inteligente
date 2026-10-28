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
  const { user, profile, isAdmin, isManager, role } = useAuth()
  const [activeTab, setActiveTab] = useState('sorteio')
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const canManage = Boolean(isAdmin || isManager)

  const { status, error, data, actions, refresh } = useFutData({
    userId: user?.id,
    isAdmin,
    isManager: canManage,
  })

  const live = useLiveMatch({
    teams: data.teams,
    keepers: data.keepers,
    match: data.match,
    events: data.events,
    sessionId: data.session?.id,
    userId: user?.id,
    canEdit: data.canEditSumula,
    refresh,
  })

  // Se o usuário não puder gerenciar e estiver na aba admin, redireciona para o sorteio
  const safeTab = activeTab === 'admin' && !canManage ? 'sorteio' : activeTab

  const currentUser = useMemo(
    () => ({
      id: user?.id || 'me',
      name: profile?.name || 'Jogador',
      position: profile?.position,
      avatarUrl: profile?.avatar_url,
      role: role || 'player',
    }),
    [user, profile, role],
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
              isAdmin={canManage}
              canManage={canManage}
              isSuperAdmin={isAdmin}
              userId={user?.id}
              currentUser={currentUser}
              pendingAvulsos={data.pendingAvulsos}
              referee={data.referee}
              referees={data.referees}
              roster={data.roster}
              actions={actions}
              onOpenProfile={() => setIsProfileOpen(true)}
              onToggle={actions.toggleAttendance}
              onConfirmAttendance={actions.confirmAttendance}
              onCancelAttendance={actions.cancelAttendance}
              onUploadReceipt={actions.uploadReceipt}
              onApproveAvulso={actions.approveAvulsoAttendance}
              onDraw={actions.saveDraw}
              onCreateSession={actions.createSession}
              onCancelSession={actions.cancelSession}
              onFinishSession={actions.finishSession}
              onSetReferee={actions.setSessionReferee}
              onSetReferees={actions.setSessionReferees}
            />
          </section>

          <section hidden={safeTab !== 'aovivo'} className="h-full" aria-label="Ao vivo">
            <AoVivoTab
              allTeams={data.teams}
              live={live}
              canEdit={data.canEditSumula}
              currentUser={currentUser}
              isAdmin={canManage}
              isReferee={data.isReferee}
              referee={data.referee}
              referees={data.referees}
              onOpenProfile={() => setIsProfileOpen(true)}
              onEditEvent={actions.editEvent}
              onDeleteEvent={actions.deleteEvent}
            />
          </section>

          <section hidden={safeTab !== 'stats'} className="h-full" aria-label="Estatísticas">
            <StatsTab
              roster={data.roster}
              stats={data.stats}
              events={data.events}
              canManage={canManage}
              onOpenProfile={() => setIsProfileOpen(true)}
              onEditEvent={actions.editEvent}
              onDeleteEvent={actions.deleteEvent}
            />
          </section>

          {canManage && (
            <section hidden={safeTab !== 'admin'} className="h-full" aria-label="Admin">
              <AdminTab
                roster={data.roster}
                requests={data.requests}
                session={data.session}
                teams={data.teams}
                linePlayers={data.linePlayers}
                actions={actions}
                isSuperAdmin={isAdmin}
                onOpenProfile={() => setIsProfileOpen(true)}
              />
            </section>
          )}
        </main>

        <BottomNav
          active={safeTab}
          onChange={setActiveTab}
          live={live.running}
          isAdmin={canManage}
          pendingCount={data.requests.length + (data.pendingAvulsos?.length || 0)}
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
