/**
 * Sorteio balanceado de times de society.
 *
 * - Os goleiros são fixos e NÃO participam do sorteio.
 * - Cada time tem TEAM_SIZE (5) jogadores de linha; 10, 15 ou 20 jogadores
 *   resultam em 2, 3 ou 4 times.
 * - Alocação gulosa: jogadores por nota (maior → menor) sempre no time de
 *   menor força total que ainda tenha vaga.
 * - Refinamento: trocas entre o time mais forte e o mais fraco enquanto
 *   isso reduzir a diferença entre eles.
 *
 * Embaralhamos antes de ordenar para que empates de nota gerem sorteios diferentes.
 */

import { TEAM_SIZE, VALID_PLAYER_COUNTS } from '../data/rules'

export const TEAM_THEMES = [
  {
    letter: 'A',
    text: 'text-emerald-400',
    soft: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    bar: 'bg-emerald-500',
    solid: 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400',
    glow: 'shadow-emerald-500/20',
  },
  {
    letter: 'B',
    text: 'text-sky-400',
    soft: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    bar: 'bg-sky-500',
    solid: 'bg-sky-500 text-zinc-950 hover:bg-sky-400',
    glow: 'shadow-sky-500/20',
  },
  {
    letter: 'C',
    text: 'text-fuchsia-400',
    soft: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/30',
    bar: 'bg-fuchsia-500',
    solid: 'bg-fuchsia-500 text-zinc-950 hover:bg-fuchsia-400',
    glow: 'shadow-fuchsia-500/20',
  },
  {
    letter: 'D',
    text: 'text-rose-400',
    soft: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    bar: 'bg-rose-500',
    solid: 'bg-rose-500 text-zinc-950 hover:bg-rose-400',
    glow: 'shadow-rose-500/20',
  },
]

/** Quantidade de times para N jogadores (0 = quantidade inválida para sorteio). */
export const getTeamCount = (playerCount) =>
  VALID_PLAYER_COUNTS.includes(playerCount) ? playerCount / TEAM_SIZE : 0

const shuffle = (list) => {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const withMetrics = (team) => {
  const total = team.players.reduce((sum, p) => sum + p.rating, 0)
  return {
    ...team,
    total,
    average: team.players.length ? total / team.players.length : 0,
    players: [...team.players].sort((a, b) => b.rating - a.rating),
  }
}

/** Recebe os jogadores de linha confirmados (10, 15 ou 20) e devolve os times. */
export function balanceTeams(players) {
  const teamCount = Math.max(1, Math.floor(players.length / TEAM_SIZE))
  const teams = Array.from({ length: teamCount }, (_, i) => ({
    id: TEAM_THEMES[i].letter,
    letter: TEAM_THEMES[i].letter,
    name: `Time ${TEAM_THEMES[i].letter}`,
    themeIndex: i,
    players: [],
    total: 0,
  }))

  const sorted = shuffle(players).sort((a, b) => b.rating - a.rating)

  sorted.forEach((player) => {
    const open = teams.filter((t) => t.players.length < TEAM_SIZE)
    const target = open.reduce((best, t) => (t.total < best.total ? t : best))
    target.players.push(player)
    target.total += player.rating
  })

  // Refinamento: trocas 1x1 entre o time mais forte e o mais fraco
  for (let step = 0; step < 50; step++) {
    const ranked = [...teams].sort((a, b) => b.total - a.total)
    const strong = ranked[0]
    const weak = ranked[ranked.length - 1]
    const gap = strong.total - weak.total
    let bestSwap = null
    let bestGap = gap

    strong.players.forEach((a, ai) => {
      weak.players.forEach((b, bi) => {
        const newGap = Math.abs(gap - 2 * (a.rating - b.rating))
        if (newGap < bestGap) {
          bestGap = newGap
          bestSwap = { ai, bi }
        }
      })
    })

    if (!bestSwap) break
    const a = strong.players[bestSwap.ai]
    const b = weak.players[bestSwap.bi]
    strong.players[bestSwap.ai] = b
    weak.players[bestSwap.bi] = a
    strong.total += b.rating - a.rating
    weak.total += a.rating - b.rating
  }

  return teams.map(withMetrics)
}

/** Diferença entre a maior e a menor média — usada para o selo "Equilibrado". */
export const getSpread = (teams) => {
  const avgs = teams.map((t) => t.average)
  return Math.max(...avgs) - Math.min(...avgs)
}

export const formatNumber = (n, digits = 1) => n.toFixed(digits).replace('.', ',')
