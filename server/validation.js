import {
  PRODUCTS,
  resolveLineItem,
  priceCustomRecipeUsd,
  recipeSectionId,
  arsFromUsd,
} from './catalog.js'
import { isAllowedSectionId } from './sections.js'
import { sanitizeSectionProps } from './sectionFields.js'

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
    this.name = 'HttpError'
  }
}

export function assertObjectIdLike(id) {
  if (typeof id !== 'string' || !/^[a-fA-F0-9]{12,24}$/.test(id)) {
    throw new HttpError(400, 'ID inválido')
  }
  return id
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
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') {
      throw new HttpError(400, 'Ítem inválido')
    }
    if (typeof raw.sku !== 'string' || !raw.sku) {
      throw new HttpError(400, 'SKU inválido')
    }

    const line = resolveLineItem({ sku: raw.sku })
    if (!line) throw new HttpError(400, `SKU inválido: ${raw.sku}`)

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
      unit_price: arsFromUsd(line.unit_price_usd, rate),
      unit_price_usd: line.unit_price_usd,
      currency_id: line.currency_id,
      recipe: line.recipe,
    })
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
    const props =
      entry && typeof entry === 'object' && !Array.isArray(entry)
        ? sanitizeSectionProps(id, entry.props)
        : undefined
    cleaned.push(props ? { id, props } : { id })
  }
  return cleaned
}
