const GRADIENTS = [
  'from-emerald-400 to-teal-600',
  'from-sky-400 to-indigo-600',
  'from-amber-400 to-orange-600',
  'from-fuchsia-400 to-purple-600',
  'from-rose-400 to-red-600',
  'from-lime-400 to-green-600',
  'from-cyan-400 to-blue-600',
]

const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-20 text-2xl',
  '2xl': 'size-28 text-4xl',
}

// Hash simples e estável do id (uuid) para escolher o gradiente
const hash = (value) => [...String(value)].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7)

/** Avatar: foto de perfil quando existe; senão iniciais com gradiente determinístico. */
export default function Avatar({ player, size = 'md', className = '' }) {
  const gradient = GRADIENTS[hash(player.id) % GRADIENTS.length]
  const base = `inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-zinc-950 ${SIZES[size]} ${className}`

  if (player.avatarUrl) {
    return (
      <img
        src={player.avatarUrl}
        alt=""
        loading="lazy"
        className={`${base} bg-zinc-800 object-cover`}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${base} bg-gradient-to-br font-bold text-white shadow-inner ${gradient}`}
    >
      {player.name.slice(0, 2).toUpperCase()}
    </span>
  )
}
