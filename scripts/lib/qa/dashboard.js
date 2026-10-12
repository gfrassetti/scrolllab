/**
 * El tablero de QA: lo que el dueño mira sin abrir la terminal (nota de
 * Obsidian «QA — tablero» y `npm run qa:status`). Puro: recibe el registro de
 * hallazgos y el estado del barrido, devuelve markdown. Lo prueba
 * scripts/lib/qa/__tests__/dashboard.test.js. ADR 0007.
 */

const STEP_NAMES = {
  zip: 'ZIP',
  editable: 'campos',
  builder: 'builder',
  'builder-save': 'guardado',
  colors: 'colores',
  visual: 'ZIP compilado',
  mobile: 'teléfono',
  motion: 'movimiento',
  parity: 'PC ↔ teléfono',
  'lab-screen': 'LAB (revisión)',
  'lab-flow': 'LAB (editar/publicar)',
  'lab-e2e': 'LAB (embed)',
}

/** Fecha y hora de Argentina (los registros se guardan en UTC). */
const day = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'
const line = (f) =>
  `- **${f.model}** · ${STEP_NAMES[f.step] || f.step} — ${f.detail}` +
  `${f.timesSeen > 1 ? ` _(visto ${f.timesSeen} veces)_` : ''} \`${f.id}\``

/**
 * @param {Record<string, any>} ledger id → hallazgo (storage/qa/findings.json)
 * @param {{ lastRun?: string, lastCommit?: string, rotation?: string }} state
 * @param {{ now: string, observations?: string, recentDays?: number }} opts
 */
export function renderDashboard(ledger, state, { now, observations = '', recentDays = 7 }) {
  const all = Object.values(ledger || {})
  const open = all.filter((f) => f.status === 'open')
  const person = all.filter((f) => f.status === 'needs-person')
  const since = new Date(Date.parse(now) - recentDays * 86400000).toISOString()
  const fixed = all
    .filter((f) => f.status === 'fixed' && (f.fixedAt || '') >= since)
    .sort((a, b) => (b.fixedAt || '').localeCompare(a.fixedAt || ''))

  const byModel = new Map()
  for (const f of open) byModel.set(f.model, [...(byModel.get(f.model) || []), f])

  const verdict = person.length
    ? `🟠 ${person.length} esperan tu decisión`
    : open.length
      ? `🟡 ${open.length} abiertos (los toma el agente de noche)`
      : '🟢 todo en verde'

  const lastObs = String(observations).split(/\n(?=## )/).filter((b) => b.startsWith('## ')).slice(-1)[0] || ''

  return [
    '---',
    'tags: [scrolllab, qa]',
    '---',
    '',
    '# QA — tablero',
    '',
    `**${verdict}** · último barrido ${day(state?.lastRun)} sobre \`${(state?.lastCommit || '').slice(0, 7) || '—'}\`` +
      ` · actualizado ${day(now)}`,
    '',
    'Se reescribe solo en cada barrido (3:00 y 14:00) y cuando el agente anota un arreglo. Historial: [[QA — bitácora de pruebas]] · ' +
      'procedimiento: [[Probar secciones — builder y LAB (procedimiento)]] · detalle: `storage/qa/report.md`.',
    '',
    `## Esperan tu decisión (${person.length})`,
    '',
    person.length
      ? person.map((f) => `${line(f)}${f.note ? `\n  - ${f.note}` : ''}`).join('\n')
      : '_Nada._ El agente pasa acá lo que no pudo arreglar en dos intentos o lo que está fuera de la sección (servidor, motor, precios).',
    '',
    `## Abiertos (${open.length})`,
    '',
    open.length
      ? [...byModel.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([model, list]) => `### ${model} (${list.length})\n${list.map(line).join('\n')}`)
          .join('\n\n')
      : '_Nada abierto._',
    '',
    `## Arreglados en los últimos ${recentDays} días (${fixed.length})`,
    '',
    fixed.length
      ? fixed.map((f) => `- ${day(f.fixedAt)} · **${f.model}** · ${STEP_NAMES[f.step] || f.step} — ${f.detail}${f.note ? ` → ${f.note}` : ''}`).join('\n')
      : '_Nada todavía._',
    '',
    '## Última observación visual (agente que mira)',
    '',
    lastObs.trim() || '_Sin observaciones todavía._',
    '',
  ].join('\n')
}

/** Una línea para la terminal. */
export function statusLine(ledger) {
  const all = Object.values(ledger || {})
  const n = (s) => all.filter((f) => f.status === s).length
  return `abiertos ${n('open')} · esperan decisión ${n('needs-person')} · arreglados ${n('fixed')}`
}
