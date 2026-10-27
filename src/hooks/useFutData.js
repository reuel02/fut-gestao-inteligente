import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import * as api from '../services/api'
import { TEAM_THEMES } from '../utils/balanceTeams'

const EMPTY = {
  roster: [],
  session: null,
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

/**
 * Carrega e mantém sincronizados (Realtime) todos os dados do futebol.
 * Devolve os dados já no formato usado pela interface + ações de escrita.
 */
export function useFutData({ userId, isAdmin }) {
  const [raw, setRaw] = useState(EMPTY)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const adminRef = useRef(isAdmin)

  useEffect(() => {
    adminRef.current = isAdmin
  }, [isAdmin])

  const refresh = useCallback(async () => {
    try {
      const [roster, session, stats, requests] = await Promise.all([
        api.fetchRoster(),
        api.fetchOpenSession(),
        api.fetchStats(),
        adminRef.current ? api.fetchPendingRequests() : Promise.resolve([]),
      ])

      let attendance = []
      let teams = []
      let match = null
      let events = []
      if (session) {
        ;[attendance, teams, match] = await Promise.all([
          api.fetchAttendance(session.id),
          api.fetchTeams(session.id),
          api.fetchLiveMatch(session.id),
        ])
        if (match) events = await api.fetchEvents(match.id)
      }

      setRaw({ roster, session, attendance, teams, match, events, stats, requests })
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
    const confirmedIds = new Set(raw.attendance.filter((a) => a.confirmed).map((a) => a.user_id))
    const linePlayers = activeRoster
      .filter((p) => !p.keeperSlot)
      .map((p) => ({ ...p, confirmed: confirmedIds.has(p.id) }))

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
      scorer: byId.get(e.player_id) ?? unknownPlayer(e.player_id),
      assist: e.assist_player_id ? (byId.get(e.assist_player_id) ?? unknownPlayer(e.assist_player_id)) : null,
    }))

    return {
      roster: raw.roster,
      linePlayers,
      keepers,
      session: raw.session,
      teams,
      match: raw.match,
      events,
      stats: raw.stats,
      requests: raw.requests,
    }
  }, [raw])

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
      createSession: run((values) => api.createSession(userId, values)),
      finishSession: run(() => api.finishSession(raw.session.id)),
      saveDraw: run((teams) => api.saveDraw(raw.session.id, teams)),
      reviewRequest: run(api.reviewRequest),
      updateRating: run(api.updateRating),
      setMembership: run(api.setMembership),
      setKeeper: run(api.setKeeper),
      setPlayerActive: run(api.setPlayerActive),
    }
  }, [raw.session, userId, refresh])

  return { status, error, data, actions, refresh }
}
