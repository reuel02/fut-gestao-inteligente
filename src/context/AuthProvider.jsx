import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import * as api from '../services/api'

/**
 * Sessão + conta do usuário e o "nível de acesso":
 *  notConfigured | loading | signedOut | none (sem pedido) | pending | rejected | member
 * Admin sempre é "member". A segurança real está na RLS; isto só guia a interface.
 */
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(isSupabaseConfigured ? undefined : null)
  const [account, setAccount] = useState(null) // { userId, profile, player, request, isAdmin }

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next)
    })

    return () => {
      active = false
      data?.subscription?.unsubscribe?.()
    }
  }, [])

  const userId = session?.user?.id

  const loadAccount = useCallback(async () => {
    if (!userId) return
    try {
      const loaded = await api.fetchAccount(userId)
      setAccount({ userId, ...loaded })
    } catch {
      setAccount({ userId, profile: null, player: null, request: null, isAdmin: false })
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    loadAccount()
  }, [loadAccount, userId])

  const current = account?.userId === userId ? account : null

  const access = useMemo(() => {
    if (!isSupabaseConfigured) return 'notConfigured'
    if (session === undefined) return 'loading'
    if (!session) return 'signedOut'
    if (!current) return 'loading'
    if (current.isAdmin || current.isManager || current.player?.is_active) return 'member'
    if (current.request?.status === 'pending') return 'pending'
    if (current.request?.status === 'rejected') return 'rejected'
    return 'none'
  }, [session, current])

  const value = useMemo(
    () => ({
      isConfigured: isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      profile: current?.profile ?? null,
      player: current?.player ?? null,
      request: current?.request ?? null,
      isAdmin: current?.isAdmin ?? false,
      isManager: current?.isManager ?? (current?.isAdmin ?? false),
      role: current?.role ?? (current?.isAdmin ? 'admin' : 'player'),
      access,
      refreshAccount: loadAccount,
      signIn: async (email, password) => {
        if (!supabase) throw new Error('Supabase não configurado')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      signUp: async (name, email, password) => {
        if (!supabase) throw new Error('Supabase não configurado')
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })
        if (error) throw error
        return { needsConfirmation: !data.session }
      },
      signOut: () => supabase?.auth?.signOut(),
      requestJoin: async (message) => {
        await api.requestJoin(message)
        await loadAccount()
      },
      saveProfile: async (values) => {
        const profile = await api.updateProfile(userId, values)
        setAccount((prev) => (prev ? { ...prev, profile } : prev))
      },
      saveAvatar: async (file) => {
        const profile = await api.uploadAvatar(userId, file)
        setAccount((prev) => (prev ? { ...prev, profile } : prev))
      },
    }),
    [current, access, loadAccount, session, userId],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
