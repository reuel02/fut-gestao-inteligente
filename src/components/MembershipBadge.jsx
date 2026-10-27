import { CalendarCheck, User } from 'lucide-react'

/** Badge visual para diferenciar Mensalista (fixo) de Avulso (diarista/esporádico). */
export default function MembershipBadge({ type = 'mensalista', size = 'sm' }) {
  const isMensal = type === 'mensalista'

  if (size === 'xs') {
    return (
      <span
        title={isMensal ? 'Jogador Mensalista' : 'Jogador Avulso'}
        className={`inline-flex items-center gap-0.5 rounded px-1 py-0.2 text-[9px] font-extrabold uppercase tracking-wide ${
          isMensal
            ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
            : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
        }`}
      >
        {isMensal ? 'Mensal' : 'Avulso'}
      </span>
    )
  }

  return (
    <span
      title={isMensal ? 'Jogador Mensalista (fixo)' : 'Jogador Avulso (diarista)'}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
        isMensal
          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
          : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
      }`}
    >
      {isMensal ? (
        <CalendarCheck className="size-2.5" aria-hidden="true" />
      ) : (
        <User className="size-2.5" aria-hidden="true" />
      )}
      {isMensal ? 'Mensalista' : 'Avulso'}
    </span>
  )
}
