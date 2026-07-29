import { PRODUCTS, resolveLineItem } from './catalog.js'
import { isAllowedSectionId } from './sections.js'

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
 * Valida el carrito del cliente. Precios y títulos siempre salen del catálogo.
 */
export function validateCheckoutItems(rawItems, { maxCartItems, maxRecipeSections }) {
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
      // No aceptar título del cliente
      line.title = PRODUCTS.custom.title
      line.sku = `custom:${recipe.join('+').slice(0, 80)}`
    } else {
      line.recipe = undefined
    }

    resolved.push({
      sku: line.sku,
      title: line.title,
      unit_price: line.unit_price,
      currency_id: line.currency_id,
      recipe: line.recipe,
    })
  }

  return resolved
}

export function validateRecipe(recipe, maxRecipeSections = 30) {
  if (!Array.isArray(recipe) || recipe.length === 0) {
    throw new HttpError(400, 'La composición custom necesita una receta')
  }
  if (recipe.length > maxRecipeSections) {
    throw new HttpError(400, `Máximo ${maxRecipeSections} secciones en la receta`)
  }
  const cleaned = []
  for (const id of recipe) {
    if (!isAllowedSectionId(id)) {
      throw new HttpError(400, `Sección no permitida: ${String(id)}`)
    }
    cleaned.push(id)
  }
  return cleaned
}
