import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import * as api from '../services/api'
import { TEAM_THEMES } from '../utils/balanceTeams'

const EMPTY = {
  roster: [],
  session: null,
  sessionReferees: [],
  attendance: [],
  teams: [],
  match: null,
  events: [],
  stats: [],
  requests: [],
}

const unknownPlayer = (id) => ({
  id,
  name: 'Jogador',
  position: null,
  avatarUrl: null,
  rating: 3,
  membership: 'mensalista',
})

const formatEventTime = (iso) => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

/**
 * Carrega e mantém sincronizados (Realtime) todos os dados do futebol.
 * Devolve os dados já no formato usado pela interface + ações de escrita.
 */
export function useFutData({ userId, isAdmin, isManager }) {
  const [raw, setRaw] = useState(EMPTY)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const privilegedRef = useRef(Boolean(isAdmin || isManager))

  useEffect(() => {
    privilegedRef.current = Boolean(isAdmin || isManager)
  }, [isAdmin, isManager])

  const refresh = useCallback(async () => {
    try {
      const [roster, session, stats, requests] = await Promise.all([
        api.fetchRoster(),
        api.fetchOpenSession(),
        api.fetchStats(),
        privilegedRef.current ? api.fetchPendingRequests() : Promise.resolve([]),
      ])

      let attendance = []
      let teams = []
      let match = null
      let events = []
      let sessionReferees = []
      if (session) {
        ;[attendance, teams, match, sessionReferees] = await Promise.all([
          api.fetchAttendance(session.id),
          api.fetchTeams(session.id),
          api.fetchLiveMatch(session.id),
          api.fetchSessionReferees(session.id),
        ])
        if (match) events = await api.fetchEvents(match.id)
      }

      setRaw({ roster, session, sessionReferees, attendance, teams, match, events, stats, requests })
      setStatus('ready')
      setError('')
    } catch (e) {
      setError(e.message || 'Erro ao carregar os dados.')
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'))
    }
  }, [])

  // Carga inicial + Realtime (qualquer mudança no schema "fut" recarrega, com debounce)
  useEffect(() => {
    if (!userId) return undefined
    refresh()

    if (!supabase) return undefined

    let timer
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(refresh, 300)
    }
    const channel = supabase
      .channel('fut-changes')
      .on('postgres_changes', { event: '*', schema: 'fut' }, schedule)
      .subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [userId, refresh])

  // ---- Dados derivados no formato da UI ------------------------------------
  const data = useMemo(() => {
    const byId = new Map(raw.roster.map((p) => [p.id, p]))
    const activeRoster = raw.roster.filter((p) => p.isActive)
    const keepers = activeRoster
      .filter((p) => p.keeperSlot)
      .sort((a, b) => a.keeperSlot - b.keeperSlot)

    const attendanceMap = new Map(raw.attendance.map((a) => [a.user_id, a]))

    const linePlayers = activeRoster
      .filter((p) => !p.keeperSlot)
      .map((p) => {
        const att = attendanceMap.get(p.id)
        const isMensal = (p.membership || 'mensalista') === 'mensalista'
        const requested = Boolean(att?.confirmed)
        // Mensalista: auto-aprovado quando confirma. Avulso: requer aprovação manual do gestor.
        const confirmed = isMensal ? requested : Boolean(att?.confirmed && att?.is_approved)
        const pendingApproval = !isMensal && requested && !att?.is_approved
        const paymentConfirmed = Boolean(att?.payment_confirmed)

        return {
          ...p,
          confirmed,
          requested,
          pendingApproval,
          paymentConfirmed,
          paymentMethod: att?.payment_method || (isMensal ? 'monthly' : 'pix'),
          receiptUrl: att?.receipt_url || null,
          isApproved: att?.is_approved ?? false,
        }
      })

    const pendingAvulsos = linePlayers.filter((p) => p.pendingApproval)

    const teams = raw.teams.map((t) => {
      const themeIndex = Math.max(0, TEAM_THEMES.findIndex((th) => th.letter === t.letter))
      const players = t.members
        .map((m) => ({ ...(byId.get(m.userId) ?? unknownPlayer(m.userId)), rating: m.rating }))
        .sort((a, b) => b.rating - a.rating)
      const total = players.reduce((sum, p) => sum + p.rating, 0)
      return {
        id: t.id,
        letter: t.letter,
        name: `Time ${t.letter}`,
        themeIndex,
        players,
        total,
        average: players.length ? total / players.length : 0,
      }
    })

    const events = raw.events.map((e) => ({
      id: e.id,
      type: e.type,
      teamId: e.team_id,
      minute: e.minute,
      createdAt: e.created_at,
      recordedTime: formatEventTime(e.created_at),
      scorer: byId.get(e.player_id) ?? unknownPlayer(e.player_id),
      assist: e.assist_player_id ? (byId.get(e.assist_player_id) ?? unknownPlayer(e.assist_player_id)) : null,
    }))

    const referees = raw.sessionReferees && raw.sessionReferees.length > 0
      ? raw.sessionReferees
      : raw.session?.referee_id
        ? [byId.get(raw.session.referee_id)].filter(Boolean)
        : []
    const referee = referees[0] ?? null
    const isReferee = referees.some((r) => r.id === userId)
    const canEditSumula = Boolean(isAdmin || isManager || isReferee)

    return {
      roster: raw.roster,
      linePlayers,
      pendingAvulsos,
      keepers,
      session: raw.session,
      teams,
      match: raw.match,
      events,
      stats: raw.stats,
      requests: raw.requests,
      referees,
      referee,
      isReferee,
      canEditSumula,
    }
  }, [raw, userId, isAdmin, isManager])

  // ---- Ações ----------------------------------------------------------------
  const actions = useMemo(() => {
    const run = (fn) => async (...args) => {
      const result = await fn(...args)
      await refresh()
      return result
    }
    return {
      toggleAttendance: run((playerId, confirmed) =>
        api.setAttendance(raw.session.id, playerId, confirmed),
      ),
      confirmAttendance: run((options) => api.confirmAttendance(raw.session.id, options)),
      cancelAttendance: run(() => api.cancelAttendance(raw.session.id)),
      approveAvulsoAttendance: run((playerId, approved, paymentConfirmed) =>
        api.approveAvulsoAttendance(raw.session.id, playerId, approved, paymentConfirmed),
      ),
      createSession: run((values) => api.createSession(userId, values)),
      setSessionReferee: run((refereeId) => api.setSessionReferee(raw.session.id, refereeId)),
      setSessionReferees: run((refereeIds) => api.setSessionReferees(raw.session.id, refereeIds)),
      cancelSession: run(() => api.cancelSession(raw.session.id)),
      finishSession: run((confirmedAvulsoIds) => api.finishSession(raw.session.id, confirmedAvulsoIds)),
      saveDraw: run((teams) => api.saveDraw(raw.session.id, teams)),
      reviewRequest: run(api.reviewRequest),
      updateRating: run(api.updateRating),
      setMembership: run(api.setMembership),
      setPlayerRole: run(api.setPlayerRole),
      setKeeper: run(api.setKeeper),
      setPlayerActive: run(api.setPlayerActive),
      editEvent: run(api.editEvent),
      deleteEvent: run(api.removeEvent),
      uploadReceipt: api.uploadReceipt,
      fetchRecentActions: api.fetchPlayerRecentActions,
    }
  }, [raw.session, userId, refresh])

  return { status, error, data, actions, refresh }
}
