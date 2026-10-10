import { db } from '../db.js'
import { HttpError } from '../errors.js'
import { validateCheckoutItems, validateRecipe } from '../validation.js'
import { pendingExpiresAt } from '../orderRetention.js'
import { createCheckoutPreference } from './mercadoPago.js'
import { arsFromUsd, discountedArsFromUsd, PRODUCTS } from '../catalog.js'
import { discountedUsdOrNull } from '../../src/domain/catalog.js'
import { getUsdArsRate } from '../fx.js'
import { resolveCouponForCheckout, autoWelcomeCoupon } from './coupons.js'
import { assertQaBuyer } from '../qa.js'
import {
  isQaSku,
  QA_TEMPLATE_SKU,
  QA_TEMPLATE_MODEL,
  QA_TEMPLATE_ARS,
  qaCustomPriceArs,
  qaDiscountedArs,
} from '../../src/domain/qa.js'
import { recipeSectionId } from '../../src/domain/catalog.js'
import {
  createTransaction,
  buildOrderTransactionBody,
  paddleClientInfo,
  PaddleError,
} from './paddle.js'

/** Pasarelas que acepta POST /api/checkout. */
export const CHECKOUT_PROVIDERS = Object.freeze(['mercadopago', 'paddle'])

/**
 * Ítems de prueba (src/domain/qa.js): uno solo por pedido y sin mezclar con
 * productos reales. Precio fijo en pesos (`list_ars`), sin cotización. El
 * template de prueba entrega el ZIP de QA_TEMPLATE_MODEL; la composición, el de
 * su receta (validada igual que la del builder real).
 * @param {any} rawItems
 * @param {{ maxRecipeSections: number }} limits
 */
export function resolveQaItems(rawItems, { maxRecipeSections }) {
  if (!Array.isArray(rawItems) || rawItems.length !== 1 || !isQaSku(rawItems[0]?.sku)) {
    throw new HttpError(400, 'Un producto de prueba se compra solo', { expose: true })
  }
  const raw = rawItems[0]
  if (raw.sku === QA_TEMPLATE_SKU) {
    return [
      {
        sku: QA_TEMPLATE_MODEL,
        title: `PRUEBA — ${QA_TEMPLATE_MODEL.toUpperCase()} (template)`,
        description: 'Compra de prueba: entrega el ZIP real del modelo.',
        unit_price: QA_TEMPLATE_ARS,
        unit_price_usd: 0,
        list_ars: QA_TEMPLATE_ARS,
        currency_id: 'ARS',
        qa: true,
      },
    ]
  }
  const recipe = validateRecipe(raw.recipe, maxRecipeSections)
  const price = qaCustomPriceArs(recipe)
  return [
    {
      sku: `custom:${recipe.map(recipeSectionId).join('+').slice(0, 80)}`,
      title: 'PRUEBA — composición del builder',
      description: 'Compra de prueba: ZIP de la receta armada en el builder.',
      unit_price: price,
      unit_price_usd: 0,
      list_ars: price,
      currency_id: 'ARS',
      recipe,
      qa: true,
    },
  ]
}

/**
 * Caso de uso: crear la orden de una compra (templates o composición del
 * builder) con los precios del servidor, el cupón de bienvenida si viene, y
 * el checkout de la pasarela elegida:
 *  - `mercadopago` (default): ARS a la cotización del día, Checkout Pro.
 *  - `paddle`: USD de lista, transacción de Paddle (docs/paddle.md).
 * Nada sale de montos del cliente: `items` se valida contra el catálogo y la
 * receta contra la allowlist, y el descuento se recalcula sobre el precio de
 * lista.
 *
 * Devuelve lo que responde POST /api/checkout: `{ init_point, orderId }` en MP
 * (+ `mock: true` en modo mock) y `{ provider: 'paddle', orderId,
 * transactionId, paddle }` en Paddle.
 * @param {{ user: any, items: any, couponCode?: string, provider?: string, locale?: string, config: any }} args
 */
export async function createCheckoutOrder({
  user,
  items,
  couponCode,
  provider = 'mercadopago',
  locale,
  config,
}) {
  if (!CHECKOUT_PROVIDERS.includes(provider)) {
    throw new HttpError(400, 'Medio de pago inválido')
  }
  const paddle = provider === 'paddle'
  if (paddle && !config.paddle?.enabled) {
    throw new HttpError(400, 'El pago internacional no está disponible', { expose: true })
  }
  const lang = locale === 'en' ? 'en' : 'es'

  // Producto de prueba: solo para las cuentas de QA_BUYER_EMAILS y solo con
  // Mercado Pago (src/domain/qa.js).
  const qa = Array.isArray(items) && items.some((i) => isQaSku(i?.sku))
  if (qa) {
    assertQaBuyer(user, config)
    if (paddle) {
      throw new HttpError(400, 'Los productos de prueba se cobran solo con Mercado Pago', { expose: true })
    }
  }

  // Paddle cobra en USD: no depende de la cotización (la validación pide una
  // tasa para el precio en pesos, que en Paddle no se usa). Prueba: pesos fijos.
  const fx = paddle || qa ? null : await getUsdArsRate()
  const resolved = qa
    ? resolveQaItems(items, { maxRecipeSections: config.maxRecipeSections })
    : validateCheckoutItems(items, {
        maxCartItems: config.maxCartItems,
        maxRecipeSections: config.maxRecipeSections,
        rate: fx ? fx.rate : 1,
      })

  // Cupón de bienvenida: el cliente manda solo el código; el descuento lo
  // calcula el servidor sobre el precio de lista, nunca sale de un monto suyo.
  // Sin código (un «Comprar» rápido), el servidor aplica igual el 10% si es su
  // primera compra: nunca depende de que el front lo mande.
  let coupon = couponCode
    ? await resolveCouponForCheckout({
        code: couponCode,
        userId: db.uid(user),
        userEmail: user.email,
      })
    : await autoWelcomeCoupon({ user })
  // Prueba a $1: el 10% no baja el precio. No se aplica ni se gasta (y la
  // pantalla de MP no dice «10% off» sin descuento).
  if (qa && coupon && resolved.every((i) => qaDiscountedArs(i.list_ars, coupon.percent) >= i.list_ars)) {
    coupon = null
  }

  // Paddle cobra el precio de lista en USD; MP, en pesos.
  const lines = resolved.map((i) => {
    if (qa) return coupon ? { ...i, unit_price: qaDiscountedArs(i.list_ars, coupon.percent) } : i
    if (paddle) {
      const usd = coupon
        ? discountedUsdOrNull(i.unit_price_usd, coupon.percent)
        : i.unit_price_usd
      return { ...i, unit_price: usd, currency_id: 'USD' }
    }
    return coupon
      ? { ...i, unit_price: discountedArsFromUsd(i.unit_price_usd, fx?.rate, coupon.percent) }
      : i
  })

  // Un cupón al 100 % (o un precio mal cargado) no se manda a Paddle: cobraría
  // cero y entregaría el ZIP gratis.
  if (paddle && lines.some((l) => !(Number(l.unit_price) > 0))) {
    throw new HttpError(400, 'Ese precio no se puede cobrar con tarjeta', { expose: true })
  }

  // En USD se suma en centavos: 0.1 + 0.2 no es 0.3.
  const total = paddle
    ? lines.reduce((sum, i) => sum + Math.round(i.unit_price * 100), 0) / 100
    : lines.reduce((sum, i) => sum + i.unit_price, 0)
  const order = await db.createOrder({
    userId: db.uid(user),
    status: 'pending',
    provider,
    locale: lang,
    items: lines.map((i) => ({
      sku: i.sku,
      title: i.title,
      unit_price: i.unit_price,
      unit_price_usd: i.unit_price_usd,
      currency_id: i.currency_id,
      recipe: i.recipe || undefined,
      ...(qa ? { list_ars: i.list_ars, qa: true } : {}),
    })),
    total,
    totalUsd: resolved.reduce((sum, i) => sum + i.unit_price_usd, 0),
    ...(fx ? { fxRate: fx.rate } : {}),
    couponCode: coupon?.code,
    discountPct: coupon?.percent,
    currency_id: paddle ? 'USD' : 'ARS',
    expiresAt: pendingExpiresAt(),
    ...(qa ? { qa: true } : {}),
  })

  const orderId = db.uid(order) || order.id

  // Lo que ve el comprador en la pantalla de la pasarela: el descuento con nombre
  // (el precio ya viene descontado; el título dice por qué).
  const shown = coupon ? lines.map((l) => labelDiscount(l, coupon.percent, { paddle, lang, rate: fx?.rate })) : lines

  if (paddle) return startPaddleCheckout({ order, orderId, lines: shown, user, config })

  if (config.mpMock) {
    return {
      init_point: `${config.clientUrl}/checkout/mock?orderId=${orderId}`,
      orderId,
      mock: true,
    }
  }

  const result = await createCheckoutPreference({
    accessToken: config.mpAccessToken,
    items: shown,
    orderId,
    userId: db.uid(user),
    clientUrl: config.clientUrl,
    apiPublicUrl: config.apiPublicUrl,
    payer: { email: user.email, name: user.name },
  })

  order.mpPreferenceId = result.id
  await order.save()

  // sandbox_init_point está deprecado por MP: con credenciales de Prueba,
  // init_point ya abre el entorno de test.
  return {
    init_point: result.init_point,
    orderId,
  }
}

/**
 * Título y descripción de un ítem con el descuento de primera compra a la vista,
 * para la pantalla de Mercado Pago o de Paddle (el monto ya viene descontado).
 * @param {any} line
 * @param {number} percent
 * @param {{ paddle: boolean, lang?: string, rate?: number }} opts
 */
export function labelDiscount(line, percent, { paddle, lang, rate }) {
  if (paddle) {
    const en = lang === 'en'
    return {
      ...line,
      title: `${line.title} (${percent}% off, ${en ? 'first purchase' : 'primera compra'})`,
      description: en
        ? `List price US$${line.unit_price_usd} — ${percent}% first-purchase discount applied.`
        : `Precio de lista US$ ${line.unit_price_usd} — ${percent}% de descuento de primera compra.`,
    }
  }
  const list = line.list_ars ?? (rate ? arsFromUsd(line.unit_price_usd, rate) : null)
  return {
    ...line,
    title: `${line.title} · ${percent}% off primera compra`,
    description: list
      ? `Precio de lista $ ${list.toLocaleString('es-AR')} — ${percent}% de descuento de primera compra.`
      : `${percent}% de descuento de primera compra.`,
  }
}

/**
 * Transacción de Paddle de una orden ya creada. Sin cuenta (mock de dev), el
 * mismo pago mock que Mercado Pago. Si Paddle no la crea, la orden se borra:
 * una orden sin transacción no se puede pagar nunca y no tiene que aparecer
 * en Mis compras.
 */
async function startPaddleCheckout({ order, orderId, lines, user, config }) {
  if (config.paddle.mock) {
    return {
      provider: 'paddle',
      init_point: `${config.clientUrl}/checkout/mock?orderId=${orderId}`,
      orderId,
      mock: true,
    }
  }
  let txn
  try {
    txn = await createTransaction(
      config,
      buildOrderTransactionBody({
        orderId,
        userId: db.uid(user),
        lines: lines.map((l) => ({
          ...l,
          picture: PRODUCTS[l.sku]?.picture || '/icon-512.png',
        })),
        taxCategory: config.paddle.taxCategory.template,
        clientUrl: config.clientUrl,
      }),
    )
  } catch (err) {
    console.error(`checkout paddle FALLÓ order=${orderId}`, err?.message || err)
    await db.deletePendingOrder(orderId)
    throw new HttpError(
      502,
      err instanceof PaddleError && err.status === 503
        ? 'El pago internacional no está disponible'
        : 'No pudimos iniciar el pago internacional. Probá de nuevo en unos minutos.',
      { expose: true },
    )
  }
  order.paddleTransactionId = String(txn.id)
  await order.save()
  return {
    provider: 'paddle',
    orderId,
    transactionId: String(txn.id),
    paddle: paddleClientInfo(config),
    customerEmail: user.email,
  }
}
