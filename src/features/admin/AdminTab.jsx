import { useState } from 'react'
import {
  Check,
  Hand,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  Calendar,
  CalendarCheck,
  User,
} from 'lucide-react'
import ScreenHeader from '../../components/ScreenHeader'
import Avatar from '../../components/Avatar'
import PositionBadge from '../../components/PositionBadge'
import MembershipBadge from '../../components/MembershipBadge'
import FinishSessionModal from '../sorteio/FinishSessionModal'

export default function AdminTab({
  roster = [],
  requests = [],
  session,
  teams = [],
  linePlayers = [],
  actions,
  isSuperAdmin = false,
  onOpenProfile,
}) {
  const [activeSection, setActiveSection] = useState('requests') // 'requests' | 'players' | 'session'
  const [selectedRating, setSelectedRating] = useState({}) // { [requestId]: rating }
  const [selectedMembership, setSelectedMembership] = useState({}) // { [requestId]: 'mensalista' | 'avulso' }
  const [playerFilter, setPlayerFilter] = useState('all') // 'all' | 'mensalista' | 'avulso'
  const [processingId, setProcessingId] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('success') // 'success' | 'error'
  const [finishModalOpen, setFinishModalOpen] = useState(false)

  const showFeedback = (msg, type = 'success') => {
    setFeedback(msg)
    setFeedbackType(type)
    setTimeout(() => setFeedback(''), 3500)
  }

  const handleReview = async (requestId, approve) => {
    setProcessingId(requestId)
    try {
      const rating = selectedRating[requestId] || 3
      const membership = selectedMembership[requestId] || 'mensalista'
      await actions.reviewRequest(requestId, approve, rating, membership)
      showFeedback(
        approve
          ? `Jogador aprovado como ${membership === 'mensalista' ? 'Mensalista' : 'Avulso'} com nota ${rating}!`
          : 'Solicitação recusada.',
      )
    } catch (err) {
      showFeedback(err.message || 'Erro ao processar solicitação.', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRatingChange = async (userId, newRating) => {
    try {
      await actions.updateRating(userId, newRating)
      showFeedback('Nota atualizada com sucesso!')
    } catch (err) {
      showFeedback(err.message || 'Erro ao atualizar nota.', 'error')
    }
  }

  const handleMembershipChange = async (userId, newMembership) => {
    try {
      await actions.setMembership(userId, newMembership)
      showFeedback(
        `Jogador definido como ${newMembership === 'mensalista' ? 'Mensalista' : 'Avulso'} com sucesso!`,
      )
    } catch (err) {
      showFeedback(err.message || 'Erro ao alterar tipo de jogador.', 'error')
    }
  }

  const handleKeeperSlot = async (userId, slot) => {
    try {
      await actions.setKeeper(userId, slot)
      showFeedback(slot ? `Goleiro fixo ${slot} definido!` : 'Jogador retornou à linha.')
    } catch (err) {
      showFeedback(err.message || 'Erro ao definir goleiro.', 'error')
    }
  }

  const handleRoleChange = async (userId, nextRole) => {
    try {
      await actions.setPlayerRole(userId, nextRole)
      showFeedback(
        nextRole === 'gestor'
          ? 'Jogador promovido a Gestor do Futebol!'
          : 'Cargo de gestor revogado.',
      )
    } catch (err) {
      showFeedback(err.message || 'Erro ao atualizar cargo.', 'error')
    }
  }

  const activePlayers = roster.filter((p) => p.isActive)

  return (
    <div className="h-full overflow-y-auto pb-10">
      <ScreenHeader
        title="Painel Admin"
        subtitle="Controle de acesso, notas e goleiros"
        onOpenProfile={onOpenProfile}
        isAdmin
      />

      <div className="space-y-4 px-4 pt-4">
        {feedback && (
          <div
            role="alert"
            className={`flex items-center gap-2 rounded-2xl border p-3 text-xs font-semibold ${
              feedbackType === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {feedbackType === 'error' ? (
              <ShieldAlert className="size-4 shrink-0 text-red-400" />
            ) : (
              <Check className="size-4 shrink-0 text-emerald-400" />
            )}
            <span>{feedback}</span>
          </div>
        )}

        {/* Abas internas do Painel Admin */}
        <div
          role="tablist"
          className="grid grid-cols-3 rounded-2xl bg-zinc-900 p-1"
        >
          <button
            type="button"
            id="tab-admin-requests"
            role="tab"
            aria-selected={activeSection === 'requests'}
            onClick={() => setActiveSection('requests')}
            className={`relative flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
              activeSection === 'requests'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserCheck className="size-3.5" />
            <span>Pedidos</span>
            {requests.length > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-zinc-950">
                {requests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-admin-players"
            role="tab"
            aria-selected={activeSection === 'players'}
            onClick={() => setActiveSection('players')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
              activeSection === 'players'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="size-3.5" />
            <span>Jogadores ({activePlayers.length})</span>
          </button>

          <button
            type="button"
            id="tab-admin-session"
            role="tab"
            aria-selected={activeSection === 'session'}
            onClick={() => setActiveSection('session')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
              activeSection === 'session'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Calendar className="size-3.5" />
            <span>Pelada</span>
          </button>
        </div>

        {/* 1. SEÇÃO DE PEDIDOS PENDENTES */}
        {activeSection === 'requests' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Solicitações para entrar no futebol
              </h2>
              <span className="text-xs text-zinc-500">{requests.length} pendente(s)</span>
            </div>

            {requests.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-800 px-6 py-12 text-center">
                <p className="text-sm font-semibold text-zinc-300">Nenhum pedido pendente</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Quando novos jogadores criarem conta e solicitarem entrada, eles aparecerão aqui.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {requests.map((req) => {
                  const rating = selectedRating[req.id] || 3
                  const isProcessing = processingId === req.id

                  return (
                    <li
                      key={req.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar
                          player={{
                            id: req.userId,
                            name: req.name,
                            avatarUrl: req.avatarUrl,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-white">
                              {req.name}
                            </span>
                            <PositionBadge position={req.position} />
                          </div>
                          <p className="truncate text-xs text-zinc-400">{req.email}</p>
                          {req.message && (
                            <p className="mt-2 rounded-xl bg-zinc-950/70 p-2 text-xs italic text-zinc-300">
                              "{req.message}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Definir Tipo de Participação (Mensalista vs Avulso) */}
                      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Tipo de Participação
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Mensalista (fixo) ou Avulso (diarista)
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedMembership((prev) => ({ ...prev, [req.id]: 'mensalista' }))
                            }
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                              (selectedMembership[req.id] || 'mensalista') === 'mensalista'
                                ? 'bg-emerald-500 text-zinc-950 font-black shadow-sm'
                                : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            <CalendarCheck className="size-3" />
                            Mensalista
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedMembership((prev) => ({ ...prev, [req.id]: 'avulso' }))
                            }
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                              selectedMembership[req.id] === 'avulso'
                                ? 'bg-amber-400 text-zinc-950 font-black shadow-sm'
                                : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            <User className="size-3" />
                            Avulso
                          </button>
                        </div>
                      </div>

                      {/* Definir Nota Técnica antes de aprovar */}
                      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Definir Nota Técnica (1 a 5)
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Equilíbrio automático do sorteio
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() =>
                                setSelectedRating((prev) => ({ ...prev, [req.id]: lvl }))
                              }
                              className={`size-7 rounded-lg text-xs font-bold transition-all ${
                                rating >= lvl
                                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                                  : 'bg-zinc-800 text-zinc-500 hover:text-white'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleReview(req.id, false)}
                          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <UserX className="size-3.5 text-red-400" />
                          Recusar
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleReview(req.id, true)}
                          className="flex h-11 flex-2 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-xs font-extrabold text-zinc-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="size-4" />
                              Aprovar (
                              {(selectedMembership[req.id] || 'mensalista') === 'mensalista'
                                ? 'Mensal'
                                : 'Avulso'}{' '}
                              · Nota {rating})
                            </>
                          )}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {/* 2. SEÇÃO DE GERENCIAMENTO DE JOGADORES */}
        {activeSection === 'players' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  Jogadores Aprovados
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Ajuste notas, alterne entre Mensalista e Avulso ou defina os 2 goleiros fixos
                </p>
              </div>
            </div>

            {/* Filtros rápidos de jogadores */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setPlayerFilter('all')}
                className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                  playerFilter === 'all'
                    ? 'bg-zinc-800 text-white ring-1 ring-zinc-700'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Todos ({activePlayers.length})
              </button>
              <button
                type="button"
                onClick={() => setPlayerFilter('mensalista')}
                className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                  playerFilter === 'mensalista'
                    ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Mensalistas (
                {
                  activePlayers.filter((p) => (p.membership || 'mensalista') === 'mensalista')
                    .length
                }
                )
              </button>
              <button
                type="button"
                onClick={() => setPlayerFilter('avulso')}
                className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                  playerFilter === 'avulso'
                    ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Avulsos ({activePlayers.filter((p) => p.membership === 'avulso').length})
              </button>
            </div>

            <ul className="space-y-2.5">
              {activePlayers
                .filter((p) => {
                  if (playerFilter === 'mensalista')
                    return (p.membership || 'mensalista') === 'mensalista'
                  if (playerFilter === 'avulso') return p.membership === 'avulso'
                  return true
                })
                .map((player) => {
                  const isKeeper = Boolean(player.keeperSlot)

                  return (
                    <li
                      key={player.id}
                      className={`rounded-2xl border p-3 bg-zinc-900 transition-all ${
                        isKeeper ? 'border-amber-400/40' : 'border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar player={player} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="truncate text-sm font-bold text-white">
                              {player.name}
                            </span>
                            <PositionBadge position={player.position} />
                            <MembershipBadge type={player.membership || 'mensalista'} size="xs" />
                            {player.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-red-400 ring-1 ring-red-500/30">
                                <Shield className="size-2.5" /> Admin
                              </span>
                            ) : player.role === 'gestor' ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-400 ring-1 ring-emerald-500/30">
                                <ShieldCheck className="size-2.5" /> Gestor
                              </span>
                            ) : null}
                            {isKeeper && (
                              <span className="rounded bg-amber-400/15 px-1 text-[9px] font-bold text-amber-300 ring-1 ring-amber-400/30">
                                GOL {player.keeperSlot}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-zinc-400">{player.email}</p>
                        </div>

                        {/* Pips de nota com ajuste rápido */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              title={`Mudar nota para ${star}`}
                              onClick={() => handleRatingChange(player.id, star)}
                              className={`size-6 rounded-md text-[10px] font-bold transition-all ${
                                star <= player.rating
                                  ? 'bg-emerald-500 text-zinc-950 font-black'
                                  : 'bg-zinc-800 text-zinc-600 hover:text-zinc-300'
                              }`}
                            >
                              {star}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Controles de Tipo de Participação (Mensalista vs Avulso) */}
                      <div className="mt-2.5 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                          {(player.membership || 'mensalista') === 'mensalista' ? (
                            <CalendarCheck className="size-3 text-emerald-400" />
                          ) : (
                            <User className="size-3 text-amber-400" />
                          )}
                          Participação:
                        </span>
                        <div className="flex items-center gap-1 rounded-lg bg-zinc-950/80 p-0.5 border border-zinc-800">
                          <button
                            type="button"
                            onClick={() => handleMembershipChange(player.id, 'mensalista')}
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                              (player.membership || 'mensalista') === 'mensalista'
                                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Mensalista
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMembershipChange(player.id, 'avulso')}
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                              player.membership === 'avulso'
                                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Avulso
                          </button>
                        </div>
                      </div>

                      {/* Controles de Goleiro Fixo */}
                      <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                          <Hand className="size-3 text-amber-400" />
                          Goleiro Fixo:
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleKeeperSlot(player.id, player.keeperSlot === 1 ? null : 1)
                            }
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                              player.keeperSlot === 1
                                ? 'bg-amber-400 text-zinc-950'
                                : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            Slot 1
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleKeeperSlot(player.id, player.keeperSlot === 2 ? null : 2)
                            }
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                              player.keeperSlot === 2
                                ? 'bg-amber-400 text-zinc-950'
                                : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            Slot 2
                          </button>
                          {isKeeper && (
                            <button
                              type="button"
                              onClick={() => handleKeeperSlot(player.id, null)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-800 text-zinc-500 hover:text-red-400"
                            >
                              Tirar
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Controle de Cargo no Futebol (Apenas Admin/ferreirareuel3@gmail.com pode promover) */}
                      {isSuperAdmin && player.role !== 'admin' && (
                        <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                            <ShieldCheck className="size-3 text-emerald-400" />
                            Cargo no Futebol:
                          </span>
                          <div>
                            {player.role === 'gestor' ? (
                              <button
                                type="button"
                                onClick={() => handleRoleChange(player.id, 'player')}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 active:scale-95 transition-all"
                              >
                                Revogar Gestor
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRoleChange(player.id, 'gestor')}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition-all"
                              >
                                Promover a Gestor
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
            </ul>
          </div>
        )}

        {/* 3. SEÇÃO DA PELADA ATUAL */}
        {activeSection === 'session' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Pelada em Andamento
            </h2>

            {session ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{session.location}</p>
                    <p className="text-xs text-zinc-400">
                      {new Date(session.scheduled_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                    {session.status === 'open'
                      ? 'Aberta'
                      : session.status === 'drawn'
                      ? 'Sorteada'
                      : 'Finalizada'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setFinishModalOpen(true)}
                  className="w-full flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all"
                >
                  <Check className="size-4" />
                  Finalizar Pelada...
                </button>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-zinc-800 p-6 text-center">
                <p className="text-sm font-semibold text-zinc-300">Nenhuma pelada ativa</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Crie uma nova pelada na aba Sorteio para abrir a lista de presença.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Finalização com bloqueio de pagamento dos avulsos */}
      <FinishSessionModal
        open={finishModalOpen}
        teams={teams}
        keepers={roster.filter((p) => p.keeperSlot)}
        linePlayers={linePlayers}
        onClose={() => setFinishModalOpen(false)}
        onFinish={async (confirmedAvulsoIds) => {
          await actions.finishSession(confirmedAvulsoIds)
          showFeedback('Pelada finalizada com sucesso! Presenças computadas.')
        }}
      />
    </div>
  )
}
