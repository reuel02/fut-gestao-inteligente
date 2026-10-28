const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

/**
 * Retorna as informações do período mensal baseado no corte do dia 10 de cada mês.
 * Exemplo: 27/10 -> início: 10/10 00:00, fim: 10/11 00:00 -> "Temporada de Outubro · 10/10 a 10/11"
 * Exemplo: 05/11 -> início: 10/10 00:00, fim: 10/11 00:00 -> "Temporada de Outubro · 10/10 a 10/11"
 */
export function getPeriodForDate(refDate = new Date()) {
  const d = new Date(refDate)
  const day = d.getDate()
  const year = d.getFullYear()
  const month = d.getMonth() // 0 a 11

  let startYear = year
  let startMonth = month

  if (day < 10) {
    // Pertence ao ciclo iniciado no dia 10 do mês anterior
    startMonth = month - 1
    if (startMonth < 0) {
      startMonth = 11
      startYear = year - 1
    }
  }

  const startDate = new Date(startYear, startMonth, 10, 0, 0, 0, 0)
  const endDate = new Date(
    startMonth === 11 ? startYear + 1 : startYear,
    startMonth === 11 ? 0 : startMonth + 1,
    10,
    0,
    0,
    0,
    0,
  )

  const pad = (n) => String(n).padStart(2, '0')
  const startStr = `${pad(startDate.getDate())}/${pad(startDate.getMonth() + 1)}`
  const endStr = `${pad(endDate.getDate())}/${pad(endDate.getMonth() + 1)}`
  const monthName = MONTH_NAMES[startMonth]

  return {
    id: `${startYear}-${pad(startMonth + 1)}`,
    name: `Temporada de ${monthName}`,
    rangeLabel: `${startStr} a ${endStr}`,
    fullTitle: `Temporada de ${monthName} · ${startStr} a ${endStr}`,
    start: startDate,
    end: endDate,
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
  }
}

/**
 * Retorna os últimos N períodos (atual + anteriores) para permitir filtro de temporadas.
 */
export function getRecentPeriods(count = 4) {
  const periods = []
  const current = getPeriodForDate(new Date())
  periods.push({ ...current, isCurrent: true })

  let currentRef = new Date(current.start)
  for (let i = 1; i < count; i += 1) {
    // Retrocede para o mês anterior
    currentRef = new Date(currentRef.getFullYear(), currentRef.getMonth() - 1, 15)
    periods.push(getPeriodForDate(currentRef))
  }

  return periods
}

/**
 * Verifica se uma data (string ISO ou Date) está contida dentro do período.
 */
export function isDateInPeriod(targetDate, period) {
  if (!targetDate || !period) return false
  const time = new Date(targetDate).getTime()
  return time >= period.start.getTime() && time < period.end.getTime()
}
