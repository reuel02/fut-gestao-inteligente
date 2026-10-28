import { useState, useRef, useEffect } from 'react'
import { Activity, Camera, Check, Loader2, LogOut, ShieldAlert, X, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { POSITIONS } from '../../data/rules'
import Avatar from '../../components/Avatar'
import RatingPips from '../../components/RatingPips'
import MembershipBadge from '../../components/MembershipBadge'
import PlayerActionsModal from '../stats/PlayerActionsModal'

export default function ProfileModal({ open, onClose }) {
  const { profile, player, isAdmin, isManager, saveProfile, saveAvatar, signOut } = useAuth()
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionsModalOpen, setActionsModalOpen] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setPosition(profile.position || 'ALA')
    }
    setError('')
    setSuccess('')
  }, [profile, open])

  if (!open) return null

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!name.trim()) {
      setError('O nome não pode ficar vazio.')
      return
    }

    setSaving(true)
    try {
      await saveProfile({ name, position })
      setSuccess('Perfil atualizado com sucesso!')
      setTimeout(() => setSuccess(''), 2500)
    } catch (err) {
      setError(err.message || 'Erro ao salvar alterações.')
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem (JPEG, PNG ou WebP).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2 MB.')
      return
    }

    setError('')
    setUploading(true)
    try {
      await saveAvatar(file)
      setSuccess('Foto de perfil atualizada!')
      setTimeout(() => setSuccess(''), 2500)
    } catch (err) {
      setError(err.message || 'Erro ao enviar foto.')
    } finally {
      setUploading(false)
    }
  }

  const dummyPlayer = {
    id: profile?.id || 'me',
    name: name || profile?.name || 'Jogador',
    avatarUrl: profile?.avatar_url,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      {/* Overlay escuro */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Meu Perfil"
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />

        <header className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <div>
            <h2 className="text-lg font-black text-white">Meu Perfil</h2>
            <p className="text-xs text-zinc-400">Edite suas informações da pelada</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-300"
          >
            <ShieldAlert className="size-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="alert"
            className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-300"
          >
            <Check className="size-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Foto de Perfil */}
        <div className="mt-5 flex flex-col items-center">
          <div className="relative group">
            <Avatar player={dummyPlayer} size="xl" className="ring-4 ring-zinc-800 shadow-xl" />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Alterar foto de perfil"
              className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 shadow-md hover:bg-emerald-400 active:scale-95 transition-all"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">Toque no ícone para trocar sua foto</p>
        </div>

        {/* Nota técnica e Participação (somente leitura para jogador) */}
        <div className="mt-5 space-y-2">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Sua Nota Técnica
                </span>
                <p className="text-xs text-zinc-500">Definida exclusivamente pelo organizador</p>
              </div>
              <div className="flex items-center gap-2">
                <RatingPips value={player?.rating ?? 3} />
              </div>
            </div>
            {isAdmin ? (
              <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center gap-1.5 text-[11px] font-bold text-red-400">
                <ShieldAlert className="size-3.5" /> Você é o Administrador do Futebol
              </div>
            ) : isManager ? (
              <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                <ShieldCheck className="size-3.5" /> Você é Gestor do Futebol
              </div>
            ) : (
              <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                Cargo: Jogador
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Tipo de Participação
              </span>
              <p className="text-xs text-zinc-500">Definido exclusivamente pelo organizador</p>
            </div>
            <MembershipBadge type={player?.membership || 'mensalista'} size="sm" />
          </div>

          {/* Botão de Histórico de Lances do Jogador */}
          <button
            type="button"
            onClick={() => setActionsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all"
          >
            <Activity className="size-4" />
            Minhas Últimas Ações (Gols, Assists e Defesas)
          </button>
        </div>

        {/* Formulário de edição */}
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="profile-name"
              className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1"
            >
              Nome / Apelido
            </label>
            <input
              id="profile-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Posição no Society
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(POSITIONS).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPosition(key)}
                  className={`flex items-center justify-between rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    position === key
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{val.label}</span>
                  <span className="text-[10px] opacity-60">({val.short})</span>
                </button>
              ))}
            </div>
          </div>

          <button
            id="btn-save-profile"
            type="submit"
            disabled={saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-extrabold text-zinc-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : 'Salvar Alterações'}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-900 pt-4 text-center">
          <button
            type="button"
            onClick={() => {
              onClose()
              signOut()
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:text-red-400"
          >
            <LogOut className="size-3.5" />
            Sair da conta ({profile?.email})
          </button>
        </div>
      </div>

      <PlayerActionsModal
        open={actionsModalOpen}
        player={dummyPlayer}
        onClose={() => setActionsModalOpen(false)}
      />
    </div>
  )
}
