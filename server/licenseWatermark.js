import crypto from 'node:crypto'

/**
 * Trazabilidad por comprador (docs/ip-protection-brief.md §3.5). Cada ZIP lleva
 * el número de orden en TEXTO VISIBLE (token estable `SCROLLLAB-LICENSE`, para
 * buscar filtraciones en GitHub/marketplaces) y, además, un identificador
 * INVISIBLE de respaldo por si borran lo visible. Las marcas van repartidas en
 * varios archivos (App.jsx, index.css, README) — quitar una no borra la traza.
 * Nada de esto altera el runtime: son sólo comentarios.
 */

// Código corto y estable por orden. No expone el orderId directamente (hay que
// recomputarlo contra la tabla de órdenes), pero es determinístico y recuperable.
function fingerprintId({ orderId, email } = {}) {
  return crypto
    .createHash('sha256')
    .update(`${orderId || ''}|${email || ''}`)
    .digest('hex')
    .slice(0, 16)
}

// Marca invisible: el payload se codifica como bits en caracteres de ancho cero
// (U+200B/U+200C) entre dos centinelas (U+2060). Va SIEMPRE dentro de un
// comentario — fuera de un comentario, U+200B rompería el parseo del build.
const FP_ZERO = '​'
const FP_ONE = '‌'
const FP_EDGE = '⁠⁠'

function encodeInvisible(payload) {
  const bits = []
  for (const byte of Buffer.from(payload, 'utf8')) {
    for (let b = 7; b >= 0; b--) bits.push((byte >> b) & 1)
  }
  return FP_EDGE + bits.map((bit) => (bit ? FP_ONE : FP_ZERO)).join('') + FP_EDGE
}

/** Recupera el payload invisible de un archivo filtrado (para trazar la fuga). */
export function extractInvisibleMark(content) {
  const text = String(content || '')
  const start = text.indexOf(FP_EDGE)
  if (start === -1) return null
  const from = start + FP_EDGE.length
  const end = text.indexOf(FP_EDGE, from)
  if (end === -1) return null
  const bits = []
  for (const ch of text.slice(from, end)) {
    if (ch === FP_ONE) bits.push(1)
    else if (ch === FP_ZERO) bits.push(0)
  }
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let v = 0
    for (let b = 0; b < 8; b++) v = (v << 1) | bits[i + b]
    bytes.push(v)
  }
  return bytes.length ? Buffer.from(bytes).toString('utf8') : null
}

/** Id de fingerprint (público) para el test / verificación de fugas. */
export function licenseFingerprint(licenseMeta) {
  return licenseMeta ? `SL:${fingerprintId(licenseMeta)}` : null
}

function invisibleMark(licenseMeta) {
  return licenseMeta ? encodeInvisible(`SL:${fingerprintId(licenseMeta)}`) : ''
}

function fingerprintComment(licenseMeta = {}) {
  const { orderId, email, date } = licenseMeta
  const inv = invisibleMark(licenseMeta)
  return `/**
 * SCROLLLAB-LICENSE ${orderId || 'unknown'}
 * Licencia regular emitida a ${email || 'unknown'}${date ? ` el ${date}` : ''}.
 * Uso permitido según LICENSE.txt (incluido en este ZIP). Redistribuir,
 * revender o republicar el código fuente está prohibido. Este encabezado
 * identifica al comprador original; quitarlo no cambia los términos.${inv ? `\n * ${inv}` : ''}
 */
`
}

export function stampApp(appSrc, licenseMeta) {
  return licenseMeta ? `${fingerprintComment(licenseMeta)}\n${appSrc}` : appSrc
}

// Marca de respaldo en archivos "silenciosos": si el comprador borra el
// encabezado de App.jsx, la traza sigue viva en index.css y en el README.
export function stampCss(cssText, licenseMeta) {
  if (!licenseMeta) return cssText
  const { orderId } = licenseMeta
  return `${cssText}\n/* SCROLLLAB-LICENSE ${orderId || 'unknown'} — identifica al comprador original (ver LICENSE.txt).${invisibleMark(licenseMeta)} */\n`
}

export function stampReadme(md, licenseMeta) {
  if (!licenseMeta) return md
  const { orderId } = licenseMeta
  return `${md}\n<!-- SCROLLLAB-LICENSE ${orderId || 'unknown'} — identifica al comprador original (ver LICENSE.txt).${invisibleMark(licenseMeta)} -->\n`
}
