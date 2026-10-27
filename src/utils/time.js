const pad = (n) => String(n).padStart(2, '0')

/** Formata segundos como MM:SS. */
export const formatClock = (total) => `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
