import { supabase } from '../lib/supabase'

/** Desembrulha { data, error } do supabase-js lançando o erro. */
const unwrap = ({ data, error }) => {
  if (error) throw error
  return data
}

// ----------------------------------------------------------------------------
// Conta / perfil
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Conta / perfil
// ----------------------------------------------------------------------------
export const fetchAccount = async (userId) => {
  const [profile, player, request, isAdmin, isManager] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle().then(unwrap),
    supabase.from('players').select('*').eq('user_id', userId).maybeSingle().then(unwrap),
    supabase.from('join_requests').select('*').eq('user_id', userId).maybeSingle().then(unwrap),
    supabase.rpc('is_admin').then(unwrap).catch(() => false),
    supabase.rpc('is_manager').then(unwrap).catch(() => false),
  ])
  const role = player?.role ?? (isAdmin ? 'admin' : 'player')
  return {
    profile,
    player,
    request,
    isAdmin: Boolean(isAdmin),
    isManager: Boolean(isManager || isAdmin || role === 'admin' || role === 'gestor'),
    role,
  }
}

export const requestJoin = (message) =>
  supabase.rpc('request_join', { p_message: message || null }).then(unwrap)

export const updateProfile = (userId, { name, position }) =>
  supabase
    .from('profiles')
    .update({ name: name.trim(), position: position || null })
    .eq('id', userId)
    .select()
    .single()
    .then(unwrap)

export async function uploadAvatar(userId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type, cacheControl: '3600' })
  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return supabase
    .from('profiles')
    .update({ avatar_url: data.publicUrl })
    .eq('id', userId)
    .select()
    .single()
    .then(unwrap)
}

// ----------------------------------------------------------------------------
// Jogadores e Cargos
// ----------------------------------------------------------------------------
export async function fetchRoster() {
  const rows = await supabase
    .from('players')
    .select('user_id, rating, keeper_slot, is_active, membership, role, profile:profiles(name, email, position, avatar_url)')
    .then(unwrap)

  return rows.map((r) => ({
    id: r.user_id,
    name: r.profile?.name ?? 'Jogador',
    email: r.profile?.email,
    position: r.profile?.position ?? null,
    avatarUrl: r.profile?.avatar_url ?? null,
    rating: r.rating,
    keeperSlot: r.keeper_slot,
    isActive: r.is_active,
    membership: r.membership ?? 'mensalista',
    role: r.role ?? 'player',
  }))
}

export const updateRating = (userId, rating) =>
  supabase.from('players').update({ rating }).eq('user_id', userId).then(unwrap)

export const setMembership = async (userId, membership) => {
  try {
    return await supabase.rpc('set_membership', { p_user_id: userId, p_membership: membership }).then(unwrap)
  } catch {
    return await supabase.from('players').update({ membership }).eq('user_id', userId).then(unwrap)
  }
}

export const setPlayerRole = (userId, role) =>
  supabase.rpc('set_player_role', { p_user_id: userId, p_role: role }).then(unwrap)

export const setPlayerActive = (userId, isActive) =>
  supabase.from('players').update({ is_active: isActive }).eq('user_id', userId).then(unwrap)

export const setKeeper = (userId, slot) =>
  supabase.rpc('set_keeper', { p_user_id: userId, p_slot: slot }).then(unwrap)

// ----------------------------------------------------------------------------
// Pedidos de entrada (admin/gestor)
// ----------------------------------------------------------------------------
export const fetchPendingRequests = async () => {
  const rows = await supabase
    .from('join_requests')
    .select('id, user_id, message, requested_at, profile:profiles!join_requests_user_id_fkey(name, email, position, avatar_url)')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
    .then(unwrap)

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    message: r.message,
    requestedAt: r.requested_at,
    name: r.profile?.name ?? 'Jogador',
    email: r.profile?.email,
    position: r.profile?.position ?? null,
    avatarUrl: r.profile?.avatar_url ?? null,
  }))
}

export const reviewRequest = (requestId, approve, rating = 3, membership = 'mensalista') =>
  supabase
    .rpc('review_join_request', {
      p_request_id: requestId,
      p_approve: approve,
      p_rating: rating,
      p_membership: membership,
    })
    .then(unwrap)

// ----------------------------------------------------------------------------
// Pelada (sessão), presença e sorteio
// ----------------------------------------------------------------------------
export const fetchOpenSession = () =>
  supabase
    .from('sessions')
    .select('*')
    .not('status', 'in', '("finished","cancelled")')
    .order('scheduled_at', { ascending: false })
    .limit(1)
    .maybeSingle()
    .then(unwrap)

export const createSession = (userId, { scheduledAt, location }) =>
  supabase
    .from('sessions')
    .insert({
      scheduled_at: scheduledAt,
      location: location?.trim() || 'Society',
      created_by: userId,
    })
    .select()
    .single()
    .then(unwrap)

export const setSessionReferee = (sessionId, refereeId) =>
  supabase
    .rpc('set_session_referee', { p_session_id: sessionId, p_referee_id: refereeId || null })
    .then(unwrap)
    .catch(() => supabase.from('sessions').update({ referee_id: refereeId || null }).eq('id', sessionId).then(unwrap))

export const setSessionReferees = async (sessionId, refereeIds = []) => {
  try {
    return await supabase
      .rpc('set_session_referees', { p_session_id: sessionId, p_referee_ids: refereeIds })
      .then(unwrap)
  } catch {
    // Fallback: seta o primeiro como referee_id na tabela sessions
    return setSessionReferee(sessionId, refereeIds[0] || null)
  }
}

export const fetchSessionReferees = async (sessionId) => {
  try {
    const rows = await supabase
      .from('session_referees')
      .select('user_id, profile:profiles(id, name, avatar_url)')
      .eq('session_id', sessionId)
      .then(unwrap)
    return rows.map((r) => ({
      id: r.user_id,
      name: r.profile?.name ?? 'Árbitro',
      avatarUrl: r.profile?.avatar_url ?? null,
    }))
  } catch {
    return []
  }
}

export const cancelSession = (sessionId) =>
  supabase
    .rpc('cancel_session', { p_session_id: sessionId })
    .then(unwrap)
    .catch(() => supabase.from('sessions').update({ status: 'cancelled' }).eq('id', sessionId).then(unwrap))

export const finishSession = (sessionId, confirmedAvulsoIds = []) =>
  supabase
    .rpc('finish_session', { p_session_id: sessionId, p_confirmed_avulsos: confirmedAvulsoIds })
    .then(unwrap)

export const fetchAttendance = (sessionId) =>
  supabase
    .from('attendance')
    .select('user_id, confirmed, is_approved, payment_confirmed, payment_method, receipt_url')
    .eq('session_id', sessionId)
    .then(unwrap)

export const setAttendance = (sessionId, userId, confirmed) =>
  supabase
    .rpc('set_attendance', { p_session_id: sessionId, p_user_id: userId, p_confirmed: confirmed })
    .then(unwrap)
    .catch(() =>
      supabase
        .from('attendance')
        .upsert({ session_id: sessionId, user_id: userId, confirmed }, { onConflict: 'session_id,user_id' })
        .then(unwrap),
    )

/** Jogador confirma presença (mensalista auto-aprova; avulso envia comprovante ou dinheiro e fica pendente) */
export const confirmAttendance = async (sessionId, { paymentMethod = 'monthly', receiptUrl = null } = {}) => {
  try {
    return await supabase
      .rpc('confirm_attendance', {
        p_session_id: sessionId,
        p_payment_method: paymentMethod,
        p_receipt_url: receiptUrl,
      })
      .then(unwrap)
  } catch {
    const { data: { user } } = await supabase.auth.getUser()
    return supabase
      .from('attendance')
      .upsert(
        {
          session_id: sessionId,
          user_id: user?.id,
          confirmed: true,
          payment_method: paymentMethod,
          receipt_url: receiptUrl,
        },
        { onConflict: 'session_id,user_id' },
      )
      .then(unwrap)
  }
}

/** Jogador cancela sua confirmação de presença */
export const cancelAttendance = async (sessionId) => {
  try {
    return await supabase.rpc('cancel_attendance', { p_session_id: sessionId }).then(unwrap)
  } catch {
    const { data: { user } } = await supabase.auth.getUser()
    return supabase
      .from('attendance')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', user?.id)
      .then(unwrap)
  }
}

/** Upload de comprovante de pagamento para jogador avulso */
export async function uploadReceipt(userId, file) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, file, { contentType: file.type, cacheControl: '3600' })
  if (error) {
    // Tenta fallback para avatars caso bucket receipts ainda não esteja criado
    const fallback = await supabase.storage
      .from('avatars')
      .upload(`receipts/${path}`, file, { contentType: file.type, cacheControl: '3600' })
    if (fallback.error) throw error
    const { data } = supabase.storage.from('avatars').getPublicUrl(`receipts/${path}`)
    return data.publicUrl
  }

  const { data } = supabase.storage.from('receipts').getPublicUrl(path)
  return data.publicUrl
}

export const approveAvulsoAttendance = (sessionId, userId, approved, paymentConfirmed = false) =>
  supabase
    .rpc('approve_avulso_attendance', {
      p_session_id: sessionId,
      p_user_id: userId,
      p_approved: approved,
      p_payment_confirmed: paymentConfirmed,
    })
    .then(unwrap)

/** Histórico das últimas ações (Gols, Assistências, Defesas) formatado */
export const fetchPlayerRecentActions = async (userId = null, limit = 50) => {
  try {
    return await supabase
      .rpc('get_player_recent_actions', { p_user_id: userId, p_limit: limit })
      .then(unwrap)
  } catch {
    return []
  }
}

/** Estatísticas filtradas por período (renovado todo dia 10) */
export const fetchPeriodStats = async (startIso, endIso) => {
  try {
    return await supabase
      .rpc('get_period_stats', { p_start: startIso, p_end: endIso })
      .then(unwrap)
  } catch {
    return fetchStats()
  }
}

export async function fetchTeams(sessionId) {
  const [teams, members] = await Promise.all([
    supabase.from('teams').select('id, letter, total_rating').eq('session_id', sessionId).order('letter').then(unwrap),
    supabase.from('team_players').select('team_id, user_id, rating_snapshot').eq('session_id', sessionId).then(unwrap),
  ])
  return teams.map((t) => ({
    id: t.id,
    letter: t.letter,
    totalRating: t.total_rating,
    members: members
      .filter((m) => m.team_id === t.id)
      .map((m) => ({ userId: m.user_id, rating: m.rating_snapshot })),
  }))
}

/** teams: saída de balanceTeams() — cada time com `letter` e `players` (ids). */
export const saveDraw = (sessionId, teams) =>
  supabase
    .rpc('save_draw', {
      p_session_id: sessionId,
      p_teams: teams.map((t) => ({ letter: t.letter, players: t.players.map((p) => p.id) })),
    })
    .then(unwrap)

// ----------------------------------------------------------------------------
// Partida ao vivo e Súmula
// ----------------------------------------------------------------------------
export const fetchLiveMatch = (sessionId) =>
  supabase
    .from('matches')
    .select('*')
    .eq('session_id', sessionId)
    .neq('status', 'finished')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
    .then(unwrap)

export const createMatch = (match) => supabase.from('matches').insert(match).select().single().then(unwrap)

export const updateMatch = (matchId, patch) =>
  supabase.from('matches').update(patch).eq('id', matchId).select().single().then(unwrap)

export const deleteMatch = (matchId) => supabase.from('matches').delete().eq('id', matchId).then(unwrap)

export const fetchEvents = (matchId) =>
  supabase
    .from('match_events')
    .select('id, type, team_id, player_id, assist_player_id, minute, created_at')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .then(unwrap)

export const addEvent = (event) => supabase.from('match_events').insert(event).then(unwrap)

export const editEvent = (eventId, { playerId, assistPlayerId, minute }) =>
  supabase
    .rpc('edit_match_event', {
      p_event_id: eventId,
      p_player_id: playerId,
      p_assist_player_id: assistPlayerId || null,
      p_minute: minute,
    })
    .then(unwrap)
    .catch(() =>
      supabase
        .from('match_events')
        .update({
          player_id: playerId,
          assist_player_id: assistPlayerId || null,
          minute,
        })
        .eq('id', eventId)
        .then(unwrap),
    )

export const removeEvent = (eventId) =>
  supabase
    .rpc('delete_match_event', { p_event_id: eventId })
    .then(unwrap)
    .catch(() => supabase.from('match_events').delete().eq('id', eventId).then(unwrap))

// ----------------------------------------------------------------------------
// Estatísticas
// ----------------------------------------------------------------------------
export const fetchStats = () => supabase.from('player_stats').select('*').then(unwrap)

