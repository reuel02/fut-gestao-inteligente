import { useState } from 'react'
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Loader2,
  Scale,
  Shuffle,
  Sparkles,
  Users,
  Whistle,
  XCircle,
  FileCheck,
  Banknote,
  X,
  UserCheck,
  Eye,
} from 'lucide-react'
import ScreenHeader from '../../components/ScreenHeader'
import Avatar from '../../components/Avatar'
import PlayerCard from './PlayerCard'
import TeamCard from './TeamCard'
import FinishSessionModal from './FinishSessionModal'
import AvulsoConfirmModal from './AvulsoConfirmModal'
import ReceiptViewModal from './ReceiptViewModal'
import { MAX_PLAYERS, TEAM_SIZE, VALID_PLAYER_COUNTS } from '../../data/rules'
import { balanceTeams, formatNumber, getSpread, getTeamCount } from '../../utils/balanceTeams'

const BALANCED_THRESHOLD = 0.3
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Mensagem orientando como chegar a 10, 15 ou 20 jogadores. */
function getCountHint(count) {
  const below = [...VALID_PLAYER_COUNTS].reverse().find((n) => n < count)
  const above = VALID_PLAYER_COUNTS.find((n) => n > count)
  const parts = []
  if (above) parts.push(`confirme mais ${above - count} para ${above / TEAM_SIZE} times`)
  if (below) parts.push(`remova ${count - below} para ${below / TEAM_SIZE} times`)
  const text = parts.join(' ou ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function formatSession(session) {
  const date = new Date(session.scheduled_at)
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' })
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day} · ${time} · ${session.location}`
}

/** Admin cria a pelada (data/hora + local). */
function CreateSessionForm({ onCreate }) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('Society')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onCreate({ scheduledAt: new Date(scheduledAt).toISOString(), location })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
        <CalendarPlus className="size-5 text-emerald-400" /> Nova pelada
      </h2>
      <label className="block text-xs font-semibold text-zinc-400">
        Data e hora
        <input
          id="session-date"
          type="datetime-local"
          required
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
        />
      </label>
      <label className="block text-xs font-semibold text-zinc-400">
        Local
        <input
          id="session-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
        />
      </label>
      {error && <p className="text-xs font-semibold text-red-400">{error}</p>}
      <button
        id="btn-create-session"
        type="submit"
        disabled={saving || !scheduledAt}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 font-extrabold text-zinc-950 transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        {saving ? <Loader2 className="size-5 animate-spin" /> : 'Criar pelada'}
      </button>
    </form>
  )
}

export default function SorteioTab({
  players,
  keepers,
  session,
  teams,
  isAdmin,
  canManage,
  userId,
  pendingAvulsos = [],
  referee,
  referees = [],
  roster = [],
  onToggle,
  onConfirmAttendance,
  onCancelAttendance,
  onUploadReceipt,
  onApproveAvulso,
  onDraw,
  onCreateSession,
  onCancelSession,
  onFinishSession,
  onSetReferee,
  onSetReferees,
  onOpenProfile,
  currentUser,
}) {
  const [loading, setLoading] = useState(false)
  const [showList, setShowList] = useState(false)
  const [notice, setNotice] = useState('')
  const [membershipFilter, setMembershipFilter] = useState('all') // 'all' | 'mensalista' | 'avulso'
  const [finishModalOpen, setFinishModalOpen] = useState(false)
  const [avulsoModalOpen, setAvulsoModalOpen] = useState(false)
  const [receiptModal, setReceiptModal] = useState({ open: false, url: '', name: '' })
  const [showAllRoster, setShowAllRoster] = useState(false)

  const isPrivileged = Boolean(isAdmin || canManage)
  const allReferees = referees && referees.length > 0 ? referees : (referee ? [referee] : [])

  const confirmed = players.filter((p) => p.confirmed)
  const confirmedMensal = confirmed.filter((p) => (p.membership || 'mensalista') === 'mensalista').length
  const confirmedAvulso = confirmed.filter((p) => p.membership === 'avulso').length
  const totalMensal = players.filter((p) => (p.membership || 'mensalista') === 'mensalista').length
  const totalAvulso = players.filter((p) => p.membership === 'avulso').length

  const teamCount = getTeamCount(confirmed.length)
  const canDraw = isPrivileged && teamCount > 0 && session?.status !== 'finished' && session?.status !== 'cancelled'
  const showResult = teams.length > 0 && !(isPrivileged && showList) && !loading

  const myPlayer = players.find((p) => p.id === userId) || keepers.find((k) => k.id === userId)

  const handleMyAttendanceConfirm = async () => {
    if (!myPlayer) return
    const isMensal = (myPlayer.membership || 'mensalista') === 'mensalista'
    if (isMensal) {
      try {
        setNotice('')
        await onConfirmAttendance({ paymentMethod: 'monthly' })
        setNotice('Presença confirmada com sucesso!')
      } catch (err) {
        setNotice(err.message || 'Erro ao confirmar presença.')
      }
    } else {
      setAvulsoModalOpen(true)
    }
  }

  const handleMyAttendanceCancel = async () => {
    if (!confirm('Deseja realmente cancelar sua confirmação nesta pelada?')) return
    try {
      setNotice('')
      await onCancelAttendance()
      setNotice('Sua confirmação foi cancelada.')
    } catch (err) {
      setNotice(err.message || 'Erro ao cancelar presença.')
    }
  }

  const handleAddReferee = async (newRefereeId) => {
    if (!newRefereeId) return
    const existingIds = allReferees.map((r) => r.id)
    if (existingIds.includes(newRefereeId)) return
    const nextIds = [...existingIds, newRefereeId]
    if (onSetReferees) {
      await onSetReferees(nextIds)
    } else if (onSetReferee) {
      await onSetReferee(newRefereeId)
    }
  }

  const handleRemoveReferee = async (removeId) => {
    const nextIds = allReferees.map((r) => r.id).filter((id) => id !== removeId)
    if (onSetReferees) {
      await onSetReferees(nextIds)
    } else if (onSetReferee) {
      await onSetReferee(nextIds[0] || null)
    }
  }

  const togglePlayer = async (id, nextConfirmed) => {
    if (nextConfirmed && confirmed.length >= MAX_PLAYERS) {
      setNotice(`Limite de ${MAX_PLAYERS} jogadores atingido (4 times de ${TEAM_SIZE}).`)
      return
    }
    setNotice('')
    try {
      await onToggle(id, nextConfirmed)
    } catch (err) {
      setNotice(err.message)
    }
  }

  const handleCancelSession = async () => {
    if (!confirm('Deseja realmente CANCELAR esta pelada? O status será alterado para cancelada.')) {
      return
    }
    try {
      await onCancelSession()
    } catch (err) {
      setNotice(err.message || 'Erro ao cancelar pelada.')
    }
  }

  const handleBalance = async () => {
    if (loading || !canDraw) return
    setLoading(true)
    setNotice('')
    try {
      await Promise.all([onDraw(balanceTeams(confirmed)), wait(1200)])
      setShowList(false)
    } catch (err) {
      setNotice(err.message)
    } finally {
      setLoading(false)
    }
  }

  const spread = teams.length ? getSpread(teams) : 0
  const isBalanced = spread <= BALANCED_THRESHOLD

  // Regra: Os jogadores só aparecem na seção de sorteio após confirmarem presença!
  const sortedPlayers = [...players]
    .filter((p) => (showAllRoster ? true : p.confirmed))
    .sort(
      (a, b) => Number(b.confirmed) - Number(a.confirmed) || b.rating - a.rating,
    )
    .filter((p) => {
      if (membershipFilter === 'mensalista') return (p.membership || 'mensalista') === 'mensalista'
      if (membershipFilter === 'avulso') return p.membership === 'avulso'
      return true
    })

  return (
    <div className="relative h-full">
      <div className={`h-full overflow-y-auto ${isPrivileged && session ? 'pb-40' : 'pb-8'}`}>
        <ScreenHeader
          title={showResult ? 'Times sorteados' : 'Sorteio'}
          subtitle={
            showResult
              ? `${teams.length} times de ${TEAM_SIZE} + goleiros fixos`
              : session
                ? formatSession(session)
                : 'Nenhuma pelada aberta'
          }
          onOpenProfile={onOpenProfile}
          currentUser={currentUser}
          isAdmin={isAdmin}
          right={
            session && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <Users className="size-4 text-emerald-400" />
                <div className="leading-none">
                  <p
                    id="confirmed-count"
                    className="text-lg font-black tabular-nums text-emerald-400"
                  >
                    {confirmed.length}
                    <span className="text-xs font-semibold text-emerald-400/60">
                      /{MAX_PLAYERS}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    confirmados
                  </p>
                </div>
              </div>
            )
          }
        />

        {!session ? (
          <section className="px-4 pt-4">
            {isPrivileged ? (
              <CreateSessionForm onCreate={onCreateSession} />
            ) : (
              <div className="rounded-3xl border border-dashed border-zinc-800 px-6 py-12 text-center">
                <p className="text-sm font-semibold text-zinc-300">Nenhuma pelada marcada</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Assim que o administrador ou gestor criar a próxima, ela aparece aqui.
                </p>
              </div>
            )}
          </section>
        ) : (
          <div className="px-4 pt-3 space-y-3">
            {/* Barra de Gestão da Pelada (Árbitros + Ações de Encerramento/Cancelamento) */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-3 space-y-2.5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Whistle className="size-3.5 text-amber-400" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                      Árbitros da Pelada {allReferees.length > 0 && `(${allReferees.length})`}
                    </p>
                  </div>

                  {isPrivileged && (
                    <select
                      value=""
                      onChange={(e) => {
                        handleAddReferee(e.target.value)
                        e.target.value = ''
                      }}
                      className="rounded-xl border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-emerald-400 font-bold outline-none focus:border-emerald-500 max-w-[170px] truncate"
                    >
                      <option value="">+ Adicionar Árbitro...</option>
                      {roster
                        .filter((r) => !allReferees.some((ref) => ref.id === r.id))
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.position || 'LINHA'})
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                {/* Chips de árbitros selecionados */}
                {allReferees.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">
                    Nenhum árbitro vinculado ainda. Qualquer jogador cadastrado pode apitar.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {allReferees.map((ref) => (
                      <span
                        key={ref.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300 shadow-sm"
                      >
                        <Whistle className="size-3 text-amber-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{ref.name}</span>
                        {isPrivileged && (
                          <button
                            type="button"
                            onClick={() => handleRemoveReferee(ref.id)}
                            aria-label={`Remover ${ref.name}`}
                            className="ml-1 rounded-md p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {isPrivileged && (
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleCancelSession}
                    className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                  >
                    <XCircle className="size-3.5" />
                    Cancelar Pelada
                  </button>

                  <button
                    type="button"
                    onClick={() => setFinishModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs font-extrabold text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Finalizar Pelada...
                  </button>
                </div>
              )}
            </div>

            {/* Card de Presença do Jogador Conectado */}
            {session && session.status !== 'finished' && session.status !== 'cancelled' && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Sua Presença na Pelada
                  </span>
                  {myPlayer?.membership && (
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        myPlayer.membership === 'mensalista'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {myPlayer.membership === 'mensalista' ? 'Plano Mensalista' : 'Jogador Avulso'}
                    </span>
                  )}
                </div>

                {myPlayer?.confirmed ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950 shrink-0">
                        <CheckCircle2 className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white">Você está confirmado!</p>
                        <p className="text-[11px] text-emerald-300">
                          Seu nome está no sorteio. Boa partida!
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleMyAttendanceCancel}
                      className="shrink-0 px-2.5 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-[11px] font-bold text-zinc-300 hover:text-red-400 hover:border-red-500/40 transition-colors"
                    >
                      Cancelar Presença
                    </button>
                  </div>
                ) : myPlayer?.pendingApproval ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-8 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 shrink-0">
                        <Clock className="size-5 animate-pulse" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white">Confirmação Pendente</p>
                        <p className="text-[11px] text-amber-200/90">
                          {myPlayer.paymentMethod === 'cash'
                            ? 'Pagamento em dinheiro informado (a conferir na pelada)'
                            : 'Comprovante PIX enviado'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleMyAttendanceCancel}
                      className="shrink-0 px-2.5 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-[11px] font-bold text-zinc-300 hover:text-red-400 hover:border-red-500/40 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-8 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 shrink-0">
                        <UserCheck className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white">Você ainda não confirmou</p>
                        <p className="text-[11px] text-zinc-400">
                          {(myPlayer?.membership || 'mensalista') === 'mensalista'
                            ? 'Mensalistas confirmam de imediato sem fila.'
                            : 'Avulsos anexam comprovante PIX ou dinheiro.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleMyAttendanceConfirm}
                      className="shrink-0 px-3 py-2 rounded-xl bg-emerald-500 text-xs font-black text-zinc-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                    >
                      Confirmar Presença
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Aviso e Aprovação de Jogadores Avulsos Pendentes */}
            {isPrivileged && pendingAvulsos.length > 0 && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2.5 animate-fade-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-4 text-amber-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Avulsos aguardando vaga ({pendingAvulsos.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-semibold">Requer aprovação</span>
                </div>

                <ul className="space-y-2">
                  {pendingAvulsos.map((p) => {
                    const isCash = p.paymentMethod === 'cash'
                    return (
                      <li
                        key={p.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl bg-zinc-950/90 p-2.5 border border-zinc-800"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar player={p} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white">{p.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {isCash ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-300">
                                  <Banknote className="size-3" /> Dinheiro em mãos
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-400">
                                  <FileCheck className="size-3" /> PIX
                                </span>
                              )}
                              {p.receiptUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReceiptModal({
                                      open: true,
                                      url: p.receiptUrl,
                                      name: p.name,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:underline"
                                >
                                  <Eye className="size-3" /> Ver Comprovante
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onApproveAvulso(p.id, false, false)}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            Recusar
                          </button>
                          <button
                            type="button"
                            onClick={() => onApproveAvulso(p.id, true, !isCash)}
                            className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-emerald-500 text-zinc-950 shadow-md hover:bg-emerald-400 active:scale-95 transition-all"
                          >
                            {isCash ? 'Aprovar (A Cobrar)' : 'Aprovar (Pago)'}
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {session && showResult ? (
          <section className="space-y-4 px-4 pt-4" aria-label="Times gerados">
            <div
              className={`animate-pop flex items-center gap-3 rounded-2xl border p-3.5 ${
                isBalanced
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-amber-400/30 bg-amber-400/10'
              }`}
            >
              {isBalanced ? (
                <Sparkles className="size-5 shrink-0 text-emerald-400" />
              ) : (
                <Scale className="size-5 shrink-0 text-amber-300" />
              )}
              <div className="text-sm">
                <p className="font-bold text-white">
                  {isBalanced ? 'Times equilibrados!' : 'Diferença um pouco maior'}
                </p>
                <p className="text-xs text-zinc-400">
                  Diferença entre médias:{' '}
                  <span className="font-bold text-zinc-200">{formatNumber(spread, 2)}</span> pt
                </p>
              </div>
            </div>

            {teams.map((team, i) => (
              <TeamCard key={team.id} team={team} index={i} />
            ))}
          </section>
        ) : session && (
          <section className="space-y-5 px-4 pt-4" aria-label="Lista de jogadores">
            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                Goleiros fixos
              </h2>
              {keepers.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-800 p-3 text-xs text-zinc-500">
                  Nenhum goleiro definido. O gestor escolhe os 2 goleiros na aba Admin.
                </p>
              ) : (
                <ul className="space-y-2">
                  {keepers.map((gk, i) => (
                    <PlayerCard key={gk.id} player={gk} index={i} locked />
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-zinc-500">
                Ficam no gol de cada lado e não entram no sorteio.
              </p>
            </div>

            <div>
              {isPrivileged && (
                <div
                  className={`mb-3 flex items-center gap-3 rounded-2xl border p-3 text-sm ${
                    canDraw
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-amber-400/30 bg-amber-400/10'
                  }`}
                >
                  {canDraw ? (
                    <Sparkles className="size-5 shrink-0 text-emerald-400" />
                  ) : (
                    <Scale className="size-5 shrink-0 text-amber-300" />
                  )}
                  <div>
                    <p id="draw-status" className="font-bold text-white">
                      {canDraw
                        ? `${teamCount} times de ${TEAM_SIZE} jogadores`
                        : 'Número de jogadores inválido'}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {canDraw
                        ? `${confirmedMensal} mensalistas · ${confirmedAvulso} avulsos confirmados.`
                        : confirmed.length < VALID_PLAYER_COUNTS[0]
                          ? `Confirme ${VALID_PLAYER_COUNTS[0] - confirmed.length} ou mais para formar 2 times (10, 15 ou 20).`
                          : `${getCountHint(confirmed.length)}.`}
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Jogadores de linha ({confirmed.length} confirmados)
                </h2>
                {isPrivileged ? (
                  <button
                    type="button"
                    onClick={() => setShowAllRoster(!showAllRoster)}
                    className="text-[11px] font-bold text-emerald-400 hover:underline"
                  >
                    {showAllRoster ? 'Apenas confirmados' : 'Ver todos do cadastro'}
                  </button>
                ) : (
                  <span className="text-[11px] text-zinc-500">
                    Apenas confirmados aparecem
                  </span>
                )}
              </div>

              {/* Filtro por tipo de participação */}
              <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setMembershipFilter('all')}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                    membershipFilter === 'all'
                      ? 'bg-zinc-800 text-white ring-1 ring-zinc-700'
                      : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Todos ({players.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMembershipFilter('mensalista')}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                    membershipFilter === 'mensalista'
                      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
                      : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Mensalistas ({totalMensal}) · {confirmedMensal} conf.
                </button>
                <button
                  type="button"
                  onClick={() => setMembershipFilter('avulso')}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                    membershipFilter === 'avulso'
                      ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
                      : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Avulsos ({totalAvulso}) · {confirmedAvulso} conf.
                </button>
              </div>

              {notice && (
                <p role="alert" className="mb-2 text-xs font-semibold text-amber-300">
                  {notice}
                </p>
              )}
              {sortedPlayers.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
                  {!showAllRoster
                    ? 'Nenhum jogador confirmou presença ainda para esta pelada.'
                    : membershipFilter === 'all'
                      ? 'Nenhum jogador aprovado ainda.'
                      : `Nenhum jogador ${membershipFilter === 'mensalista' ? 'mensalista' : 'avulso'} encontrado.`}
                </p>
              ) : (
                <ul className={`space-y-2 transition-opacity ${loading ? 'opacity-40' : ''}`}>
                  {sortedPlayers.map((player, i) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      index={i}
                      onToggle={togglePlayer}
                      readOnly={!isPrivileged && player.id !== userId}
                      highlight={player.id === userId}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>

      {/* CTA fixo acima da bottom nav (admin e gestor) */}
      {isPrivileged && session && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent px-4 pb-4 pt-10">
          {notice && showResult && (
            <p role="alert" className="pointer-events-auto mb-2 text-center text-xs font-semibold text-amber-300">
              {notice}
            </p>
          )}
          <div className="pointer-events-auto flex gap-2">
            {showResult && (
              <button
                id="btn-edit-list"
                type="button"
                onClick={() => setShowList(true)}
                aria-label="Voltar para a lista de jogadores"
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-zinc-300 transition-all hover:bg-zinc-800 active:scale-95"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <button
              id="btn-balance-teams"
              type="button"
              onClick={handleBalance}
              disabled={loading || !canDraw}
              className="flex h-14 flex-1 items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 text-base font-extrabold text-zinc-950 shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Equilibrando…
                </>
              ) : (
                <>
                  <Shuffle className="size-5" strokeWidth={2.5} />
                  {teams.length > 0 ? 'Sortear novamente' : 'Equilibrar Times'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal obrigatório de finalização e conferência de pagamento dos avulsos */}
      <FinishSessionModal
        open={finishModalOpen}
        teams={teams}
        keepers={keepers}
        linePlayers={players}
        onClose={() => setFinishModalOpen(false)}
        onFinish={onFinishSession}
      />

      {/* Modal de confirmação de jogador avulso (PIX ou Dinheiro) */}
      <AvulsoConfirmModal
        open={avulsoModalOpen}
        userId={userId}
        onClose={() => setAvulsoModalOpen(false)}
        onConfirm={onConfirmAttendance}
        onUploadReceipt={onUploadReceipt}
      />

      {/* Modal de visualização do comprovante enviado */}
      <ReceiptViewModal
        open={receiptModal.open}
        receiptUrl={receiptModal.url}
        playerName={receiptModal.name}
        onClose={() => setReceiptModal({ open: false, url: '', name: '' })}
      />
    </div>
  )
}
