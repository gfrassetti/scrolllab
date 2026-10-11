/**
 * Formularios como widgets de LAB: el visitante del sitio del cliente escribe y
 * el mensaje le llega por mail al dueño del widget. En el sitio, el builder y
 * el ZIP el formulario manda a su `endpoint`; en LAB el frame lo apunta a
 * `/api/embed/:key/form` y el campo no se muestra en el editor.
 *
 * Dominio puro: lo usan el frame del embed, el editor de LAB y el servidor.
 */

/** Las secciones de formulario que LAB sirve con su propio envío por mail. */
export const LAB_FORM_SECTIONS = Object.freeze(['contact/ContactForm', 'meridian/Contact', 'fizz/ContactSteps'])

/** @param {string} sectionId */
export function isLabFormSection(sectionId) {
  return LAB_FORM_SECTIONS.includes(String(sectionId || ''))
}

/**
 * Campos del builder que LAB no ofrece: el `endpoint` lo pone LAB (si no, el
 * formulario mandaría a otro lado y el dueño no recibiría nada).
 */
export const LAB_HIDDEN_FIELDS = Object.freeze(['endpoint'])

export const LAB_FORM_LIMITS = Object.freeze({
  maxFields: 24,
  maxLabel: 80,
  maxValue: 5000,
  maxTotal: 20000,
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Lo que el formulario manda pero no es una respuesta del visitante. */
const META_KEYS = new Set(['formType', 'website_hp'])
/** Etiquetas legibles de las claves fijas de los formularios del catálogo. */
const LABELS = {
  es: {
    name: 'Nombre',
    email: 'Email',
    phone: 'Teléfono',
    company: 'Empresa',
    budget: 'Presupuesto',
    timeline: 'Plazo',
    time: 'Horario',
    date: 'Fecha',
    people: 'Personas',
    message: 'Mensaje',
  },
  en: {
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    company: 'Company',
    budget: 'Budget',
    timeline: 'Timeline',
    time: 'Best time',
    date: 'Date',
    people: 'People',
    message: 'Message',
  },
}
const FORM_TYPES = new Set(['contact', 'quote', 'newsletter', 'callback', 'booking'])

/**
 * Limpia lo que manda un formulario de LAB. Devuelve null si no hay nada que
 * mandar (vacío, mal formado, demasiado grande) o `{ spam: true }` si el campo
 * trampa vino lleno (el visitante humano no lo ve: se responde OK y no se
 * manda nada).
 * @param {unknown} body
 * @param {'es' | 'en'} [locale]
 * @returns {null | { spam: true } | { formType: string, fields: Array<[string, string]>, replyTo: string | null }}
 */
export function cleanLabFormMessage(body, locale = 'es') {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const raw = /** @type {Record<string, unknown>} */ (body)
  if (typeof raw.website_hp === 'string' && raw.website_hp.trim()) return { spam: true }
  const labels = LABELS[locale] || LABELS.es
  /** @type {Array<[string, string]>} */
  const fields = []
  let total = 0
  for (const [key, value] of Object.entries(raw)) {
    if (META_KEYS.has(key)) continue
    if (typeof value !== 'string' && typeof value !== 'number') continue
    const text = String(value).replace(/\r\n?/g, '\n').trim()
    if (!text) continue
    const label = String(labels[key] || key).replace(/\s+/g, ' ').trim().slice(0, LAB_FORM_LIMITS.maxLabel)
    if (!label) continue
    if (text.length > LAB_FORM_LIMITS.maxValue) return null
    total += label.length + text.length
    if (total > LAB_FORM_LIMITS.maxTotal) return null
    fields.push([label, text])
    if (fields.length > LAB_FORM_LIMITS.maxFields) return null
  }
  if (!fields.length) return null
  const email = typeof raw.email === 'string' ? raw.email.trim() : ''
  return {
    formType: typeof raw.formType === 'string' && FORM_TYPES.has(raw.formType) ? raw.formType : 'contact',
    fields,
    replyTo: EMAIL_RE.test(email) && email.length <= 254 ? email : null,
  }
}
