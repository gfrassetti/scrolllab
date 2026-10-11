import { getSectionFields } from './fields.js'

/**
 * Reglas de valores de los campos editables: colores, links, URLs de imagen,
 * precios y listas. El preview, el checkout y LAB pasan por acá; el servidor
 * (server/sectionFields.js) aplica las mismas reglas.
 */

/** Local preview uploads (blob:) / inline data — never ship in the ZIP. */
export function isEphemeralAssetUrl(value) {
  return typeof value === 'string' && /^(blob:|data:)/i.test(value)
}

// #rgb / #rgba / #rrggbb / #rrggbbaa · rgb()/rgba(). Nada de nombres ni CSS
// arbitrario: el color entra crudo en un `style` inline de la sección.
const COLOR_RE =
  /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$|^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+))?\s*\)$/i
// #ancla · /ruta · http(s):// · mailto: · tel:. Sin `javascript:` ni otros esquemas.
const HREF_RE =
  /^(?:#[\w-]*|\/[^\s"'<>]*|https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|tel:\+?[\d\s()-]{3,})$/i

export function sanitizeColor(value) {
  if (typeof value !== 'string') return undefined
  const s = value.trim().toLowerCase()
  return COLOR_RE.test(s) ? s : undefined
}

export function sanitizeHref(value) {
  if (typeof value !== 'string') return undefined
  const s = value.trim()
  if (!s || s.length > 500 || /^\s*javascript:/i.test(s)) return undefined
  return HREF_RE.test(s) ? s : undefined
}

// Imagen o endpoint: https:// o /ruta, sin espacios. La misma regla
// que el servidor (ASSET_URL_RE en server/sectionFields.js): el preview no
// puede mostrar una URL que después no viaja al ZIP. Por eso tampoco blob: ni
// data:, que además no sobreviven a la sesión.
const ASSET_URL_RE = /^(https:\/\/|\/)\S{1,500}$/i

export function sanitizeAssetUrl(value, max = 2000) {
  if (typeof value !== 'string') return undefined
  const s = value.trim().slice(0, max)
  return ASSET_URL_RE.test(s) ? s : undefined
}

// `image` dentro de una lista: misma regla, con el tope de los sub-campos.
export function sanitizeImageUrl(value) {
  return sanitizeAssetUrl(value, 500)
}

// Precio de un producto: número con hasta 2 decimales (15000, 12.5, 12,50).
// Misma regla que el servidor (PRICE_RE en server/sectionFields.js).
const PRICE_RE = /^\d{1,9}(?:[.,]\d{1,2})?$/

export function sanitizePrice(value) {
  if (typeof value !== 'string') return undefined
  const s = value.trim()
  return PRICE_RE.test(s) ? s : undefined
}

/**
 * Sin las filas de lista que quedaron vacías. El editor las conserva para que
 * «Agregar» muestre una fila en blanco, pero no son contenido: ni el preview
 * las dibuja ni la receta las manda, igual que el servidor que las descarta.
 */
export function withoutEmptyRows(props) {
  if (!props || typeof props !== 'object') return props
  let changed = false
  const out = {}
  for (const [key, value] of Object.entries(props)) {
    if (!Array.isArray(value)) {
      out[key] = value
      continue
    }
    const rows = value.filter((row) => row && Object.keys(row).length)
    if (rows.length !== value.length) changed = true
    if (rows.length) out[key] = rows
  }
  if (!changed) return props
  return Object.keys(out).length ? out : undefined
}

// Item de un campo `list`: objeto con sub-campos text/textarea/href/color/image.
// Se conservan los slots vacíos ({}) para que agregar una fila no la borre en
// el acto; el server descarta los items sin ninguna clase al persistir.
function sanitizeListItem(subFields, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const sub = new Map(subFields.map((f) => [f.key, f]))
  const item = {}
  for (const [k, v] of Object.entries(raw)) {
    const f = sub.get(k)
    if (!f || typeof v !== 'string') continue
    const t = v.slice(0, 500)
    if (f.type === 'color') {
      const c = sanitizeColor(t)
      if (c) item[k] = c
    } else if (f.type === 'href') {
      const h = sanitizeHref(t)
      if (h) item[k] = h
    } else if (f.type === 'image') {
      const u = sanitizeImageUrl(t)
      if (u) item[k] = u
    } else if (f.type === 'price') {
      const price = sanitizePrice(t)
      if (price) item[k] = price
    } else if (f.type === 'select' || f.type === 'toggle') {
      // Dentro de una fila también: solo una de sus opciones.
      if ((f.options || []).some((o) => o.value === t)) item[k] = t
    } else if (t) {
      item[k] = t
    }
  }
  return item
}

function sanitizeList(field, value) {
  if (!Array.isArray(value)) return undefined
  const subFields = field.item || []
  const max = field.max ?? 12
  const out = []
  for (const raw of value.slice(0, max)) {
    const item = sanitizeListItem(subFields, raw)
    if (item) out.push(item)
  }
  return out
}

/** «Texto | #ancla» por línea → filas `{ label, href }` (sin destino, solo label). */
function parseLinkLines(text) {
  return String(text)
    .split('\n')
    .map((line) => {
      const [label, href] = line.split('|').map((part) => part.trim())
      if (!label) return null
      return href ? { label, href } : { label }
    })
    .filter(Boolean)
}

/**
 * Lo guardado antes de que los links de los navs fueran una lista: el textarea
 * `linksText` (o `links` como texto, en NavFizz). Sin esto, una composición
 * vieja perdía sus links al pasar por el panel o por el checkout.
 */
function migrateLegacyProps(byKey, props) {
  const field = byKey.get('links')
  if (!field || field.type !== 'list' || !field.fromText) return props
  const legacy =
    typeof props.links === 'string'
      ? props.links
      : typeof props.linksText === 'string' && !Array.isArray(props.links)
        ? props.linksText
        : null
  if (legacy === null) return props
  const { linksText: _legacy, ...rest } = props
  return { ...rest, links: parseLinkLines(legacy) }
}

export function sanitizeProps(sectionId, props) {
  if (!props || typeof props !== 'object') return undefined
  const fields = getSectionFields(sectionId)
  if (fields.length === 0) return undefined
  const byKey = new Map(fields.map((f) => [f.key, f]))
  props = migrateLegacyProps(byKey, props)
  const cleaned = {}
  for (const [key, value] of Object.entries(props)) {
    const field = byKey.get(key)
    if (!field) continue

    if (field.type === 'list') {
      const arr = sanitizeList(field, value)
      if (arr && arr.length) cleaned[key] = arr
      continue
    }
    if (typeof value !== 'string') continue
    const trimmed = value.slice(0, 2000)

    if (field.type === 'color') {
      const c = sanitizeColor(trimmed)
      if (c) cleaned[key] = c
      continue
    }
    if (field.type === 'href') {
      const h = sanitizeHref(trimmed)
      if (h) cleaned[key] = h
      continue
    }
    if (!trimmed) continue
    if (field.type === 'select' || field.type === 'toggle') {
      const ok = (field.options || []).some((o) => o.value === trimmed)
      if (!ok) continue
    }
    if (field.type === 'image' || field.type === 'url') {
      const url = sanitizeAssetUrl(trimmed)
      if (url) cleaned[key] = url
      continue
    }
    cleaned[key] = trimmed
  }
  return Object.keys(cleaned).length ? cleaned : undefined
}

/**
 * LAB: la sección corre en un iframe en OTRO dominio (embed.scrolllab…), así
 * que una ruta /archivo apunta ahí y no al sitio del cliente. En LAB las
 * imágenes van con URL completa (https://…): lo relativo no se guarda y el
 * campo avisa. Misma regla que `sanitizeHostedProps` del servidor.
 */
const ABSOLUTE_ASSET_RE = /^https:\/\//i

export function sanitizeHostedProps(sectionId, props) {
  const clean = sanitizeProps(sectionId, props)
  if (!clean) return clean
  for (const field of getSectionFields(sectionId)) {
    const value = clean[field.key]
    if (field.type === 'image' || field.type === 'url') {
      if (typeof value === 'string' && !ABSOLUTE_ASSET_RE.test(value)) delete clean[field.key]
      continue
    }
    if (field.type !== 'list' || !Array.isArray(value)) continue
    const imageKeys = (field.item || []).filter((sub) => sub.type === 'image').map((sub) => sub.key)
    if (!imageKeys.length) continue
    // Las filas vacías ({}) quedan: son el «Agregar» del editor.
    clean[field.key] = value.map((row) => {
      const out = { ...row }
      for (const k of imageKeys) {
        if (typeof out[k] === 'string' && !ABSOLUTE_ASSET_RE.test(out[k])) delete out[k]
      }
      return out
    })
  }
  return Object.keys(clean).length ? clean : undefined
}
