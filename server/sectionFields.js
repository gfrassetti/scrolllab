import { SECTION_FIELDS } from '../src/lib/sectionFields.js'

/**
 * Allowlist server-side de props editables por sección. Sale de los campos del
 * builder (src/lib/sectionFields.js, la fuente única): una prop es editable si
 * tiene campo. Lo que el servidor NO toma del cliente es cómo se valida cada
 * valor: eso lo deciden las reglas de abajo (por nombre de prop y por el schema
 * de listas), sin confiar en el `type` de la UI.
 */
export const ALLOWED_PROPS_BY_SECTION = Object.freeze(
  Object.fromEntries(
    Object.entries(SECTION_FIELDS).map(([id, fields]) => [id, fields.map((f) => f.key)]),
  ),
)

const FLAVOR_PRESETS = new Set(['cobalt', 'berry', 'citrus', 'tropical', 'mint'])
const VARIANT_PRESETS = new Set(['media', 'type'])

const THEME_PRESETS = new Set([
  'auto',
  'chapters',
  'nocturne',
  'monolith',
  'velocity',
  'fizz',
  'atelier',
  'comic',
  'unity',
  'ratio',
  'atrium',
  'meridian',
  'kin',
])

/**
 * Asset URLs baked into the sold ZIP must be a real path/URL:
 * https:// or a site-relative path like /my-can.png.
 * blob:/data: (builder-preview uploads) never survive the session.
 */
const ASSET_URL_RE = /^(https:\/\/|\/)\S{1,500}$/i

export const ASSET_URL_KEYS = new Set([
  'canImage',
  'image',
  'img',
  'img1',
  'img2',
  'img3',
  'img4',
  'img5',
  'img6',
  'img7',
  'img8',
  'imgBack',
  'imgMid',
  'imgFront',
  'nextImg',
  'logoSrc',
  'orbSrc',
  // El form de contacto hace POST acá: una URL https o una ruta del sitio.
  'endpoint',
])

/**
 * Tipos que el server no infiere de `ALLOWED_PROPS_BY_SECTION` (que es un
 * array de nombres): las reglas propias del servidor.
 *  - COLOR_PROP_KEYS / isHrefKey: por convención de nombre (`bg`/`fg`/`accent`,
 *    cualquier `*Href`, o `href`/`link`).
 *  - LIST_PROPS_BY_SECTION: schema de los campos `list` (prop → { max, item }).
 */
const COLOR_RE =
  /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$|^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+))?\s*\)$/i
const HREF_RE =
  /^(?:#[\w-]*|\/[^\s"'<>]*|https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|tel:\+?[\d\s()-]{3,})$/i

// Precio de un producto del kit commerce: número con hasta 2 decimales.
const PRICE_RE = /^\d{1,9}(?:[.,]\d{1,2})?$/

export const COLOR_PROP_KEYS = new Set([
  'bg',
  'fg',
  'accent',
  'bg2',
  'fg2',
  // FIZZ: colores del menú y de la entrada de los sabores. Iban como texto libre
  // (2000 caracteres hasta un `style` inline); los validaba solo el cliente.
  'menuBg',
  'menuInk',
  'startBg',
  'startInk',
])
const HREF_PROP_KEYS = new Set(['href', 'link'])
export const isHrefKey = (k) => HREF_PROP_KEYS.has(k) || /href$/i.test(k)

// Para el servidor un `textarea` es texto: solo color / href / image / price
// tienen regla propia en sanitizeListValue.
const serverItemType = (type) => (type === 'textarea' ? 'text' : type)

export const LIST_PROPS_BY_SECTION = Object.freeze(
  Object.fromEntries(
    Object.entries(SECTION_FIELDS)
      .map(([id, fields]) => [
        id,
        Object.fromEntries(
          fields
            .filter((field) => field.type === 'list')
            .map((field) => [
              field.key,
              {
                max: field.max,
                item: Object.fromEntries(
                  (field.item || []).map((sub) => [sub.key, serverItemType(sub.type)]),
                ),
              },
            ]),
        ),
      ])
      .filter(([, lists]) => Object.keys(lists).length),
  ),
)

function sanitizeColor(value) {
  const s = String(value).trim().toLowerCase()
  return COLOR_RE.test(s) ? s : undefined
}

function sanitizeHref(value) {
  const s = String(value).trim()
  if (!s || s.length > 500 || /^\s*javascript:/i.test(s)) return undefined
  return HREF_RE.test(s) ? s : undefined
}

function sanitizeListValue(schema, value) {
  if (!Array.isArray(value)) return undefined
  const max = schema.max ?? 12
  const out = []
  for (const raw of value) {
    if (out.length >= max) break
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const item = {}
    for (const [k, type] of Object.entries(schema.item || {})) {
      const v = raw[k]
      if (typeof v !== 'string') continue
      const t = v.slice(0, 500)
      if (type === 'color') {
        const c = sanitizeColor(t)
        if (c) item[k] = c
      } else if (type === 'href') {
        const h = sanitizeHref(t)
        if (h) item[k] = h
      } else if (type === 'image') {
        // URL real: https:// o /ruta. blob:/data: no sobreviven al persist.
        if (ASSET_URL_RE.test(t)) item[k] = t
      } else if (type === 'price') {
        if (PRICE_RE.test(t.trim())) item[k] = t.trim()
      } else if (t) {
        item[k] = t
      }
    }
    // El server descarta el item sin ninguna clase (slot vacío del editor).
    if (Object.keys(item).length) out.push(item)
  }
  return out
}

/**
 * @param {string} sectionId
 * @param {unknown} props lo que mandó el cliente: no se confía en nada de ahí
 * @returns {Record<string, unknown> | undefined} solo las props permitidas y válidas, o undefined si no queda ninguna
 */
export function sanitizeSectionProps(sectionId, props) {
  if (!props || typeof props !== 'object' || Array.isArray(props)) return undefined
  const allowed = ALLOWED_PROPS_BY_SECTION[sectionId]
  if (!allowed) return undefined
  const allow = new Set(allowed)
  const listSchemas = LIST_PROPS_BY_SECTION[sectionId] || {}
  /** @type {Record<string, unknown>} */
  const cleaned = {}
  for (const [key, value] of Object.entries(props)) {
    if (!allow.has(key)) continue

    if (listSchemas[key]) {
      const arr = sanitizeListValue(listSchemas[key], value)
      if (arr && arr.length) cleaned[key] = arr
      continue
    }
    if (typeof value !== 'string') continue
    const trimmed = value.slice(0, 2000)

    if (COLOR_PROP_KEYS.has(key)) {
      const c = sanitizeColor(trimmed)
      if (c) cleaned[key] = c
      continue
    }
    if (isHrefKey(key)) {
      const h = sanitizeHref(trimmed)
      if (h) cleaned[key] = h
      continue
    }
    if (!trimmed) continue
    if (key === 'flavor' && !FLAVOR_PRESETS.has(trimmed)) continue
    if (key === 'theme' && !THEME_PRESETS.has(trimmed)) continue
    if (key === 'variant' && !VARIANT_PRESETS.has(trimmed)) continue
    if (ASSET_URL_KEYS.has(key) && !ASSET_URL_RE.test(trimmed)) continue
    cleaned[key] = trimmed
  }
  return Object.keys(cleaned).length ? cleaned : undefined
}

/**
 * LAB: la sección corre en un iframe en OTRO dominio (embed.scrolllab…), así
 * que una ruta /archivo apunta ahí y no al sitio del cliente: la imagen sale
 * rota. En LAB las imágenes van siempre con URL completa (https://…) y lo
 * relativo se descarta — al guardar y también al servir, por las instancias
 * que se publicaron antes de esta regla. El builder sí acepta /ruta (va al
 * `public/` del ZIP).
 */
const ABSOLUTE_ASSET_RE = /^https:\/\//i

/**
 * @param {string} sectionId
 * @param {unknown} props lo que mandó el cliente: no se confía en nada de ahí
 * @returns {Record<string, unknown> | undefined} igual que sanitizeSectionProps, y sin imágenes de ruta relativa (en LAB van con URL completa)
 */
export function sanitizeHostedProps(sectionId, props) {
  const clean = sanitizeSectionProps(sectionId, props)
  if (!clean) return clean
  const listSchemas = LIST_PROPS_BY_SECTION[sectionId] || {}
  for (const [key, value] of Object.entries(clean)) {
    if (ASSET_URL_KEYS.has(key) && typeof value === 'string') {
      if (!ABSOLUTE_ASSET_RE.test(value)) delete clean[key]
      continue
    }
    const schema = listSchemas[key]
    if (!schema || !Array.isArray(value)) continue
    const imageKeys = Object.entries(schema.item || {})
      .filter(([, type]) => type === 'image')
      .map(([k]) => k)
    if (!imageKeys.length) continue
    const rows = value
      .map((row) => {
        const out = { ...row }
        for (const k of imageKeys) {
          if (typeof out[k] === 'string' && !ABSOLUTE_ASSET_RE.test(out[k])) delete out[k]
        }
        return out
      })
      .filter((row) => Object.keys(row).length)
    if (rows.length) clean[key] = rows
    else delete clean[key]
  }
  return Object.keys(clean).length ? clean : undefined
}
