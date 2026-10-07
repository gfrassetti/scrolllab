/**
 * Verifica el cobro internacional contra el sandbox REAL de Paddle, con las
 * mismas funciones que usa la app (docs/paddle.md).
 *
 * `npm test` prueba nuestra lógica contra un Paddle simulado; esto confirma
 * que Paddle se comporta como ese simulador supone: que acepta las
 * transacciones non-catalog tal como las arma el servidor (template, cupón,
 * composición del builder y alta de LAB con prueba gratis), que devuelve los
 * montos en centavos, la moneda y el `custom_data` intactos, que el precio
 * recurrente conserva el ciclo y la prueba, y que una transacción sin pagar se
 * puede cancelar (lo que hace la app con un alta abandonada). Todo lo que crea
 * lo cancela al final, salvo con `--keep`.
 *
 * Requiere la API key de SANDBOX (el script aborta con una de producción):
 *   PADDLE_API_KEY          pdl_sdbx_apikey_…
 *   PADDLE_WEBHOOK_SECRET   (opcional) chequea la firma con el secreto real
 *   PADDLE_CLIENT_TOKEN     (opcional) test_… — se valida el prefijo
 *
 * Uso:
 *   npm run check:paddle-sandbox
 *   npm run check:paddle-sandbox -- --keep   deja las transacciones abiertas e
 *     imprime cómo pagarlas a mano en el overlay (tarjeta de prueba
 *     4242 4242 4242 4242, cualquier vencimiento futuro y CVC).
 */
import '../server/loadEnv.js'
import crypto from 'node:crypto'
import { loadPaddleConfig } from '../server/config.js'
import {
  createTransaction,
  getTransaction,
  cancelTransaction,
  buildOrderTransactionBody,
  buildSubscriptionTransactionBody,
  transactionItemsCents,
  usdCents,
  verifyPaddleSignature,
} from '../server/services/paddle.js'
import { hostedPlanPriceIn, BUILDER_HIDDEN_SKUS } from '../server/catalog.js'
import { validateCheckoutItems } from '../server/validation.js'
import { ALLOWED_SECTIONS } from '../server/sections.js'
import {
  TEMPLATE_PRICES_USD,
  discountedUsdOrNull,
  WELCOME_COUPON_PERCENT,
} from '../src/domain/catalog.js'

const keep = process.argv.includes('--keep')

let paddle
try {
  paddle = loadPaddleConfig(process.env, false)
} catch (err) {
  console.error(err.message)
  process.exit(2)
}
if (!paddle.apiKey) {
  console.error('Falta PADDLE_API_KEY (la de SANDBOX: pdl_sdbx_apikey_…).')
  process.exit(2)
}
if (paddle.environment !== 'sandbox') {
  console.error('Este chequeo corre solo contra el sandbox (PADDLE_ENV=sandbox).')
  process.exit(2)
}
const config = { paddle }

const created = []
const results = []

function check(name, ok, detail = '') {
  results.push(ok)
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

const cents = (txn) => txn.items.map((i) => i.price?.unit_price?.amount)

async function roundTrip(name, body) {
  const txn = await createTransaction(config, body)
  created.push(txn.id)
  const saved = await getTransaction(config, txn.id)
  return { txn, saved, name }
}

async function main() {
  console.log(`Paddle ${paddle.environment} · ${paddle.apiBase}\n`)

  // 1. Template suelto, como lo arma POST /api/checkout con provider=paddle.
  const orderId = 'a'.repeat(24)
  const chapters = await roundTrip(
    'template',
    buildOrderTransactionBody({
      orderId,
      userId: 'check-sandbox',
      lines: [
        { sku: 'chapters', title: 'CHAPTERS [check sandbox]', unit_price: TEMPLATE_PRICES_USD.chapters, picture: '/icon-512.png' },
      ],
      taxCategory: paddle.taxCategory.template,
      clientUrl: 'https://www.scrolllab.com.ar',
    }),
  )
  check(
    'template: Paddle acepta el ítem non-catalog y lo guarda en centavos USD',
    chapters.saved.currency_code === 'USD' &&
      transactionItemsCents(chapters.saved) === usdCents(TEMPLATE_PRICES_USD.chapters),
    `${chapters.saved.id} · ${cents(chapters.saved).join(', ')} centavos · ${chapters.saved.status}`,
  )
  check(
    'template: custom_data vuelve intacto (orderId + kind)',
    chapters.saved.custom_data?.orderId === orderId && chapters.saved.custom_data?.kind === 'order',
  )
  check(
    'template: la transacción queda lista para pagar (ready) con su link de checkout',
    chapters.saved.status === 'ready' && Boolean(chapters.saved.checkout?.url),
    chapters.saved.checkout?.url || 'sin checkout.url: falta el default payment link en el panel',
  )
  const tax = Number(chapters.saved.details?.totals?.tax ?? 0)
  check('template: Paddle calcula totales (impuestos según el país del comprador)', Number.isFinite(tax))

  // 2. Cupón de bienvenida: centavos (149 → 134.10).
  const discounted = discountedUsdOrNull(TEMPLATE_PRICES_USD.chapters, WELCOME_COUPON_PERCENT)
  const coupon = await roundTrip(
    'cupón',
    buildOrderTransactionBody({
      orderId: 'b'.repeat(24),
      userId: 'check-sandbox',
      lines: [{ sku: 'chapters', title: 'CHAPTERS con cupón [check sandbox]', unit_price: discounted }],
      taxCategory: paddle.taxCategory.template,
      clientUrl: 'https://www.scrolllab.com.ar',
    }),
  )
  check(
    `cupón ${WELCOME_COUPON_PERCENT}%: el monto con centavos llega exacto`,
    transactionItemsCents(coupon.saved) === usdCents(discounted),
    `USD ${discounted} → ${cents(coupon.saved)[0]} centavos`,
  )

  // 3. Composición del builder de 30 secciones (la más cara posible).
  const sections = [...ALLOWED_SECTIONS]
    .filter((id) => !BUILDER_HIDDEN_SKUS.some((sku) => id.startsWith(`${sku}/`)))
    .slice(0, 30)
  const [line] = validateCheckoutItems([{ sku: 'custom', recipe: sections }], {
    maxCartItems: 5,
    maxRecipeSections: 30,
    rate: 1,
  })
  const builder = await roundTrip(
    'builder',
    buildOrderTransactionBody({
      orderId: 'c'.repeat(24),
      userId: 'check-sandbox',
      lines: [{ ...line, title: `${line.title} [check sandbox]`, unit_price: line.unit_price_usd }],
      taxCategory: paddle.taxCategory.template,
      clientUrl: 'https://www.scrolllab.com.ar',
    }),
  )
  check(
    'builder: Paddle acepta la composición con su precio por tramos',
    transactionItemsCents(builder.saved) === usdCents(line.unit_price_usd),
    `${sections.length} secciones · USD ${line.unit_price_usd}`,
  )

  // 4. Alta de LAB: precio recurrente con prueba de 7 días.
  const amountUsd = hostedPlanPriceIn('hosted_pro', 'monthly', 'USD')
  const lab = await roundTrip(
    'lab',
    buildSubscriptionTransactionBody({
      subscriptionId: 'd'.repeat(24),
      userId: 'check-sandbox',
      plan: 'hosted_pro',
      tier: 'pro',
      cycle: 'monthly',
      amountUsd,
      trialDays: 7,
      taxCategory: paddle.taxCategory.lab,
    }),
  )
  const price = lab.saved.items?.[0]?.price || {}
  check(
    'LAB: precio recurrente mensual en USD',
    price.billing_cycle?.interval === 'month' &&
      Number(price.unit_price?.amount) === usdCents(amountUsd),
    `USD ${amountUsd}/mes · tax_category ${paddle.taxCategory.lab}`,
  )
  check(
    'LAB: la prueba gratis viaja en el precio (7 días)',
    price.trial_period?.interval === 'day' && Number(price.trial_period?.frequency) === 7,
  )
  check('LAB: custom_data identifica la suscripción', lab.saved.custom_data?.kind === 'lab')

  // 5. Alta abandonada: la app cancela la transacción sin pagar.
  const canceled = await cancelTransaction(config, lab.saved.id).catch((err) => ({ error: err.message }))
  check('alta abandonada: una transacción sin pagar se cancela', canceled?.status === 'canceled', canceled?.error || '')
  created.splice(created.indexOf(lab.saved.id), 1)

  // 6. Firma de webhooks con el secreto real (si está).
  if (paddle.webhookSecret) {
    const raw = JSON.stringify({ event_type: 'transaction.completed', data: { id: 'txn_check' } })
    const ts = Math.floor(Date.now() / 1000)
    const h1 = crypto.createHmac('sha256', paddle.webhookSecret).update(`${ts}:${raw}`).digest('hex')
    let ok = true
    try {
      verifyPaddleSignature({ rawBody: raw, header: `ts=${ts};h1=${h1}`, secret: paddle.webhookSecret })
    } catch {
      ok = false
    }
    check('webhook: la firma se verifica con PADDLE_WEBHOOK_SECRET', ok)
  } else {
    console.log('ℹ️  Sin PADDLE_WEBHOOK_SECRET: no se chequea la firma.')
  }

  if (keep) {
    console.log('\nTransacciones abiertas para pagar a mano (tarjeta 4242 4242 4242 4242):')
    for (const id of created) {
      const t = await getTransaction(config, id)
      console.log(`  ${id} → ${t.checkout?.url || '(sin link: configurá el default payment link)'}`)
    }
    console.log(
      '\nCon la API levantada y el webhook apuntando a /api/webhooks/paddle, al pagar llega' +
        '\ntransaction.completed. Estas transacciones no tienen orden local: la app' +
        '\nalerta «PAGO SIN ORDEN» (es lo esperado). Para el recorrido completo, comprá desde el carrito.',
    )
  }
}

try {
  await main()
} catch (err) {
  check('verificación', false, err.message)
} finally {
  if (!keep) {
    let n = 0
    for (const id of created) {
      try {
        await cancelTransaction(config, id)
        n += 1
      } catch {
        /* ya cancelada o pagada */
      }
    }
    if (n) console.log(`\nLimpieza: ${n} transacciones de test canceladas.`)
  }
}

const failed = results.filter((ok) => !ok).length
console.log(failed ? `\n${failed} verificación(es) fallaron.` : '\nTodo OK contra el sandbox de Paddle.')
process.exit(failed ? 1 : 0)
