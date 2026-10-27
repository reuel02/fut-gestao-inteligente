import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

/** Todas as tabelas e funções do app vivem no schema "fut". */
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, { db: { schema: 'fut' } })
  : null

/** Apenas para a interface — a segurança real é a RLS (fut.is_admin()). */
export const ADMIN_EMAIL = 'ferreirareuel3@gmail.com'
