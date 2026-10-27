import { supabase } from '../lib/supabase'

/** Desembrulha { data, error } do supabase-js lançando o erro. */
const unwrap = ({ data, error }) => {
  if (error) throw error
  return data
}

// ----------------------------------------------------------------------------
// Conta / perfil
// ----------------------------------------------------------------------------
export const fetchAccount = async (userId) => {
  const [profile, player, request, isAdmin] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle().then(unwrap),
    supabase.from('players').select('*').eq('user_id', userId).maybeSingle().then(unwrap),
    supabase.from('join_requests').select('*').eq('user_id', userId).maybeSingle().then(unwrap),
    supabase.rpc('is_admin').then(unwrap),
  ])
  return { profile, player, request, isAdmin: Boolean(isAdmin) }
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
// Jogadores
// ----------------------------------------------------------------------------
export async function fetchRoster() {
  const rows = await supabase
    .from('players')
    .select('user_id, rating, keeper_slot, is_active, membership, profile:profiles(name, email, position, avatar_url)')
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

export const setPlayerActive = (userId, isActive) =>
  supabase.from('players').update({ is_active: isActive }).eq('user_id', userId).then(unwrap)

export const setKeeper = (userId, slot) =>
  supabase.rpc('set_keeper', { p_user_id: userId, p_slot: slot }).then(unwrap)

// ----------------------------------------------------------------------------
// Pedidos de entrada (admin)
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
    .neq('status', 'finished')
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

export const finishSession = (sessionId) =>
  supabase.from('sessions').update({ status: 'finished' }).eq('id', sessionId).then(unwrap)

export const fetchAttendance = (sessionId) =>
  supabase.from('attendance').select('user_id, confirmed').eq('session_id', sessionId).then(unwrap)

export const setAttendance = (sessionId, userId, confirmed) =>
  supabase
    .from('attendance')
    .upsert({ session_id: sessionId, user_id: userId, confirmed }, { onConflict: 'session_id,user_id' })
    .then(unwrap)

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
// Partida ao vivo
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

export const removeEvent = (eventId) => supabase.from('match_events').delete().eq('id', eventId).then(unwrap)

// ----------------------------------------------------------------------------
// Estatísticas
// ----------------------------------------------------------------------------
export const fetchStats = () => supabase.from('player_stats').select('*').then(unwrap)
