/**
 * Regras fixas do futebol, posições de society e tipos de participação (Mensalista vs Avulso).
 */

export const POSITIONS = {
  GOL: { label: 'Goleiro', short: 'GOL' },
  FIX: { label: 'Fixo', short: 'FIX' },
  ALA: { label: 'Ala', short: 'ALA' },
  PIV: { label: 'Pivô', short: 'PIV' },
}

export const MEMBERSHIP_TYPES = {
  mensalista: {
    id: 'mensalista',
    label: 'Mensalista',
    short: 'MENSAL',
    description: 'Jogador fixo mensal com vaga prioritária',
  },
  avulso: {
    id: 'avulso',
    label: 'Avulso',
    short: 'AVULSO',
    description: 'Jogador avulso/diarista que joga arbitrariamente',
  },
}

export const ROLES = {
  admin: {
    id: 'admin',
    label: 'Administrador',
    short: 'ADMIN',
    description: 'Controle total do sistema e nomeação de gestores',
  },
  gestor: {
    id: 'gestor',
    label: 'Gestor do Futebol',
    short: 'GESTOR',
    description: 'Acesso operacional completo às peladas, súmula e notas',
  },
  player: {
    id: 'player',
    label: 'Jogador',
    short: 'JOGADOR',
    description: 'Acesso padrão de jogador participante',
  },
}

export const TEAM_SIZE = 5 // jogadores de linha por time (sem o goleiro)
export const MAX_PLAYERS = 20 // máximo de jogadores sorteáveis (4 times de 5)
export const VALID_PLAYER_COUNTS = [10, 15, 20] // 2, 3 ou 4 times

