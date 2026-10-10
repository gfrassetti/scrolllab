const STEPS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/**
 * «hace 5 minutos» / «5 minutes ago» con Intl. Menos de un minuto: «recién»
 * (`justNow`, del i18n de quien llama).
 */
export function formatRelativeTime(date, locale, justNow, now = Date.now()) {
  const time = new Date(date).getTime()
  if (!Number.isFinite(time)) return ''
  const seconds = Math.round((time - now) / 1000)
  if (Math.abs(seconds) < 60) return justNow
  const rtf = new Intl.RelativeTimeFormat(locale === 'en' ? 'en' : 'es-AR', { numeric: 'auto' })
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return justNow
}
