import {
  PRODUCTS,
  resolveLineItem,
  priceCustomRecipeUsd,
  recipeSectionId,
  arsFromUsd,
  BUILDER_HIDDEN_SKUS,
  BUNDLE_MODELS,
} from './catalog.js'
import { isAllowedSectionId } from './sections.js'
import { sanitizeSectionProps } from './sectionFields.js'
import { HttpError } from './errors.js'

// Re-export: varios módulos y tests la importan de acá.
export { HttpError }

export function assertObjectIdLike(id) {
  if (typeof id !== 'string' || !/^[a-fA-F0-9]{12,24}$/.test(id)) {
    throw new HttpError(400, 'ID inválido')
  }
  return id
}

// El mail termina en un CSV y en la API del CRM: sin < > " ' ` \ ni espacios.
const LEAD_EMAIL_RE = /^[^\s@<>"'`\\]+@[^\s@<>"'`\\]+\.[^\s@<>"'`\\]{2,}$/
const LEAD_EMAIL_MAX = 120

/** Email del cupón de bienvenida (el de la cuenta de Google): en minúsculas y con forma de mail, o 400. */
export function normalizeLeadEmail(raw) {
  const email = String(raw ?? '').trim().toLowerCase()
  if (!email || email.length > LEAD_EMAIL_MAX || !LEAD_EMAIL_RE.test(email)) {
    throw new HttpError(400, 'Email inválido')
  }
  return email
}

/**
 * utm_source / utm_medium / utm_campaign que trae el front (de un video o un
 * post): slugs de hasta 32 caracteres o nada. Devuelve `{ utmSource, utmMedium,
 * utmCampaign }` con solo los que sirven.
 */
export function cleanUtm(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const field of ['source', 'medium', 'campaign']) {
    const value =
      typeof raw[field] === 'string'
        ? raw[field]
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 32)
        : ''
    if (value) out[`utm${field[0].toUpperCase()}${field.slice(1)}`] = value
  }
  return out
}

/**
 * Valida el carrito del cliente. Precios y títulos siempre salen del catálogo:
 * el precio de lista está en USD y `rate` lo lleva a pesos para esta orden.
 */
export function validateCheckoutItems(
  rawItems,
  { maxCartItems, maxRecipeSections, rate },
) {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new HttpError(500, 'Cotización USD→ARS no disponible')
  }
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, 'El carrito está vacío')
  }
  if (rawItems.length > maxCartItems) {
    throw new HttpError(400, `Máximo ${maxCartItems} ítems por orden`)
  }

  const resolved = []
  const skus = new Set()
  let hasCustom = false
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') {
      throw new HttpError(400, 'Ítem inválido')
    }
    if (typeof raw.sku !== 'string' || !raw.sku) {
      throw new HttpError(400, 'SKU inválido')
    }

    const line = resolveLineItem({ sku: raw.sku })
    if (!line) throw new HttpError(400, `SKU inválido: ${raw.sku}`)

    // El mismo template dos veces se cobraría dos veces (el front no lo deja,
    // pero el servidor no confía en el front).
    if (line.sku === 'custom' || String(line.sku).startsWith('custom:')) {
      if (hasCustom) {
        throw new HttpError(400, 'Solo una composición del builder por compra', {
          expose: true,
        })
      }
      hasCustom = true
    } else if (skus.has(line.sku)) {
      throw new HttpError(400, `${line.title} ya está en el carrito`, { expose: true })
    } else {
      skus.add(line.sku)
    }

    if (line.sku === 'custom' || String(line.sku).startsWith('custom:')) {
      const recipe = validateRecipe(raw.recipe, maxRecipeSections)
      line.recipe = recipe
      line.title = PRODUCTS.custom.title
      const ids = recipe.map(recipeSectionId).join('+')
      line.sku = `custom:${ids.slice(0, 80)}`
      line.unit_price_usd = priceCustomRecipeUsd(recipe)
    } else {
      line.recipe = undefined
    }

    resolved.push({
      sku: line.sku,
      title: line.title,
      description: line.description,
      unit_price: arsFromUsd(line.unit_price_usd, rate),
      unit_price_usd: line.unit_price_usd,
      currency_id: line.currency_id,
      recipe: line.recipe,
    })
  }

  // Un modelo suelto que ya viene en el bundle también se pagaría dos veces.
  if (skus.has('bundle')) {
    const inBundle = resolved.find((i) => BUNDLE_MODELS.includes(i.sku))
    if (inBundle) {
      throw new HttpError(
        400,
        `${inBundle.title} ya viene en el bundle: sacalo del carrito`,
        { expose: true },
      )
    }
  }

  return resolved
}

/**
 * Accepts legacy string[] or [{ id, props? }, ...].
 * Returns normalized [{ id, props? }, ...].
 */
export function validateRecipe(recipe, maxRecipeSections = 30) {
  if (!Array.isArray(recipe) || recipe.length === 0) {
    throw new HttpError(400, 'La composición custom necesita una receta')
  }
  if (recipe.length > maxRecipeSections) {
    throw new HttpError(400, `Máximo ${maxRecipeSections} secciones en la receta`)
  }
  const cleaned = []
  for (const entry of recipe) {
    const id = recipeSectionId(entry)
    if (!isAllowedSectionId(id)) {
      throw new HttpError(400, `Sección no permitida: ${String(id)}`)
    }
    const model = String(id).split('/')[0]
    if (BUILDER_HIDDEN_SKUS.includes(model)) {
      throw new HttpError(400, `Sección no permitida: ${String(id)}`)
    }
    const props =
      entry && typeof entry === 'object' && !Array.isArray(entry)
        ? sanitizeSectionProps(id, entry.props)
        : undefined
    cleaned.push(props ? { id, props } : { id })
  }
  return cleaned
}
