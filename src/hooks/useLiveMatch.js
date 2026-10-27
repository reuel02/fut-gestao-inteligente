import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from '../services/api'

/**
 * Estado da partida ao vivo, persistido no Supabase.
 * - Cronômetro sincronizado entre aparelhos: elapsed_seconds + (agora - started_at).
 * - Somente o admin escreve (RLS); os demais membros acompanham em tempo real.
 * - A partida é criada sob demanda (ao iniciar o relógio ou registrar o primeiro gol).
 */
export function useLiveMatch({ teams, keepers, match, events, sessionId, userId, canEdit, refresh }) {
  const [matchup, setMatchup] = useState([0, 1])
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState('')

  const live = match?.status === 'live'

  useEffect(() => {
    if (!live) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [live])

  const seconds = match
    ? match.elapsed_seconds +
      (live && match.started_at
        ? Math.max(0, Math.floor((now - Date.parse(match.started_at)) / 1000))
        : 0)
    : 0

  // Times em campo (cada lado com seu goleiro fixo)
  const matchTeams = useMemo(() => {
    if (teams.length < 2) return null
    let home
    let away
    if (match) {
      home = teams.find((t) => t.id === match.home_team_id)
      away = teams.find((t) => t.id === match.away_team_id)
    } else {
      const valid =
        matchup[0] < teams.length && matchup[1] < teams.length && matchup[0] !== matchup[1]
      const [i, j] = valid ? matchup : [0, 1]
      home = teams[i]
      away = teams[j]
    }
    if (!home || !away) return null
    return [
      { ...home, keeper: keepers.find((k) => k.keeperSlot === 1) },
      { ...away, keeper: keepers.find((k) => k.keeperSlot === 2) },
    ]
  }, [teams, keepers, match, matchup])

  const score = useMemo(() => {
    const result = Object.fromEntries((matchTeams ?? []).map((t) => [t.id, 0]))
    events.forEach((e) => {
      if (e.type === 'goal' && e.teamId in result) result[e.teamId] += 1
    })
    return result
  }, [events, matchTeams])

  const ensureMatch = useCallback(async () => {
    if (match) return match
    return api.createMatch({
      session_id: sessionId,
      home_team_id: matchTeams[0].id,
      away_team_id: matchTeams[1].id,
      home_keeper_id: matchTeams[0].keeper?.id ?? null,
      away_keeper_id: matchTeams[1].keeper?.id ?? null,
    })
  }, [match, sessionId, matchTeams])

  const toggleClock = useCallback(async () => {
    if (!canEdit) return
    try {
      setError('')
      const m = await ensureMatch()
      if (m.status === 'live') {
        await api.updateMatch(m.id, { status: 'paused', elapsed_seconds: seconds, started_at: null })
      } else {
        const timestamp = new Date().toISOString()
        await api.updateMatch(m.id, { status: 'live', started_at: timestamp })
      }
      setNow(Date.now())
      await refresh()
    } catch (e) {
      setError(e.message || 'Erro ao alterar o cronômetro.')
    }
  }, [canEdit, ensureMatch, seconds, refresh])

  const reset = useCallback(async () => {
    if (!canEdit) return
    try {
      setError('')
      if (match) await api.deleteMatch(match.id)
      await refresh()
    } catch (e) {
      setError(e.message || 'Erro ao zerar partida.')
    }
  }, [canEdit, match, refresh])

  const finish = useCallback(async () => {
    if (!canEdit || !match) return
    try {
      setError('')
      const timestamp = new Date().toISOString()
      await api.updateMatch(match.id, {
        status: 'finished',
        elapsed_seconds: seconds,
        started_at: null,
        ended_at: timestamp,
      })
      setMatchup([0, 1])
      await refresh()
    } catch (e) {
      setError(e.message || 'Erro ao encerrar partida.')
    }
  }, [canEdit, match, seconds, refresh])

  const addGoal = useCallback(async ({ teamId, scorer, assist }) => {
    if (!canEdit) return
    try {
      setError('')
      const m = await ensureMatch()
      await api.addEvent({
        match_id: m.id,
        type: 'goal',
        team_id: teamId,
        player_id: scorer.id,
        assist_player_id: assist?.id ?? null,
        minute: Math.max(1, Math.ceil(seconds / 60)),
        created_by: userId,
      })
      await refresh()
    } catch (e) {
      setError(e.message || 'Erro ao salvar gol.')
    }
  }, [canEdit, ensureMatch, seconds, userId, refresh])

  const removeEvent = useCallback(async (id) => {
    if (!canEdit) return
    try {
      setError('')
      await api.removeEvent(id)
      await refresh()
    } catch (e) {
      setError(e.message || 'Erro ao remover gol.')
    }
  }, [canEdit, refresh])

  return {
    matchTeams,
    matchup,
    setMatchup,
    seconds,
    running: live,
    started: Boolean(match) && (seconds > 0 || events.length > 0),
    events,
    score,
    error,
    toggleClock,
    reset,
    finish,
    addGoal,
    removeEvent,
  }
}
