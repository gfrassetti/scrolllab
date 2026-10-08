/**
 * Verifica las suscripciones de LAB contra el sandbox REAL de MercadoPago, con
 * las mismas funciones que usa la app (body del alta, baja confirmada).
 *
 * `npm test` prueba nuestra lógica contra un MP simulado; esto confirma que MP
 * se comporta como ese simulador supone: que difiere el primer cobro con
 * `start_date` (prueba gratis y re-suscripción sin doble cobro), que una alta
 * autorizada con tarjeta no cobra antes de tiempo, que el cambio de plan
 * modifica esa misma suscripción (no abre otra), que la baja funciona y que
 * MP acepta las preferences de pago único tal como las arma la app (la de la
 * diferencia al subir de plan y la de compra de templates, con los datos del
 * comprador y el vencimiento del efectivo). Todo lo que crea lo cancela al
 * final.
 *
 * Requiere credenciales de PRUEBA (nunca las de producción: el script aborta
 * si el token no es de un usuario de test) y salida a api.mercadopago.com:
 *   MP_TEST_ACCESS_TOKEN  access token del vendedor de test
 *   MP_TEST_PUBLIC_KEY    public key del vendedor de test (para la tarjeta)
 *   MP_TEST_PAYER_EMAIL   email de un comprador de test
 *
 * Uso: npm run check:mp-sandbox
 */
import 'dotenv/config'
import {
  billingFrequency,
  buildPreapprovalBody,
  cancelPreapproval,
  fetchPreapproval,
  updatePreapprovalAmount,
  createUpgradePreference,
  createCheckoutPreference,
} from '../server/services/mercadoPago.js'
import {
  cancelPreapprovalConfirmed,
  upgradeReference,
} from '../server/services/subscriptions.js'
import { hostedPlanPrice, BUILDER_HIDDEN_SKUS, arsFromUsd, discountedArsFromUsd } from '../server/catalog.js'
import { labelDiscount } from '../server/services/checkout.js'
import { validateCheckoutItems } from '../server/validation.js'
import { ALLOWED_SECTIONS } from '../server/sections.js'

const token = process.env.MP_TEST_ACCESS_TOKEN
const publicKey = process.env.MP_TEST_PUBLIC_KEY
const payerEmail = process.env.MP_TEST_PAYER_EMAIL
if (!token || !publicKey || !payerEmail) {
  console.error(
    'Faltan MP_TEST_ACCESS_TOKEN, MP_TEST_PUBLIC_KEY y/o MP_TEST_PAYER_EMAIL (credenciales de PRUEBA).',
  )
  process.exit(2)
}

const DAY = 86_400_000
const created = []
const results = []

async function mp(method, pathname, body, { auth = true } = {}) {
  const res = await fetch(`https://api.mercadopago.com${pathname}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(auth ? { authorization: `Bearer ${token}` } : {}),
      ...(method !== 'GET' ? { 'x-idempotency-key': crypto.randomUUID() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, json: await res.json().catch(() => ({})) }
}

function check(name, ok, detail = '') {
  results.push(ok)
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

// Ms entre dos fechas; MP devuelve la hora en -04:00 y sin milisegundos.
const offBy = (a, b) => Math.abs(new Date(a) - new Date(b))
const sameMinute = (a, b) => offBy(a, b) < 60_000

function body({ ref, startDate, cycle = 'monthly' }) {
  return buildPreapprovalBody({
    reason: `ScrollLab LAB — pro (${cycle === 'yearly' ? 'anual' : 'mensual'}) [check sandbox]`,
    amount: cycle === 'yearly' ? 999000 : 99900,
    currencyId: 'ARS',
    ...billingFrequency(cycle),
    payerEmail,
    externalReference: ref,
    backUrl: 'https://www.scrolllab.com.ar/lab?suscripcion=volver',
    startDate,
  })
}

async function create(payload) {
  const r = await mp('POST', '/preapproval', payload)
  if (r.json?.id) created.push(r.json.id)
  return r
}

async function cardToken() {
  return mp(
    'POST',
    `/v1/card_tokens?public_key=${encodeURIComponent(publicKey)}`,
    {
      card_number: '5031755734530604',
      expiration_month: 11,
      expiration_year: new Date().getFullYear() + 4,
      security_code: '123',
      cardholder: { name: 'APRO', identification: { type: 'DNI', number: '12345678' } },
    },
    { auth: false },
  )
}

async function main() {
  // 0. Nunca contra una cuenta real.
  const me = await mp('GET', '/users/me')
  if (me.status !== 200 || !(me.json.tags || []).includes('test_user')) {
    throw new Error('El token no es de un usuario de TEST de MercadoPago. Aborto sin crear nada.')
  }
  console.log(`Vendedor de test ${me.json.id} (${me.json.site_id})\n`)

  // 1. Alta como la hace la app (pending + init_point) con 7 días de prueba.
  const trialStart = new Date(Date.now() + 7 * DAY)
  const pending = await create(body({ ref: 'check-trial', startDate: trialStart }))
  check('alta con prueba: MP la acepta', pending.status === 201, `HTTP ${pending.status}`)
  check(
    'alta con prueba: primer cobro a 7 días',
    sameMinute(pending.json.next_payment_date, trialStart),
    `next_payment_date ${pending.json.next_payment_date}`,
  )
  check('alta con prueba: hay checkout (init_point)', !!pending.json.init_point)

  // 2. Re-suscripción tras una baja: primer cobro al fin de lo ya pagado (lejano).
  const carry = new Date(Date.now() + 330 * DAY)
  const far = await create(body({ ref: 'check-carry', startDate: carry, cycle: 'yearly' }))
  check(
    'alta anual (12 meses) con primer cobro a 330 días (re-suscripción sin doble cobro)',
    far.status === 201 && sameMinute(far.json.next_payment_date, carry),
    `next_payment_date ${far.json.next_payment_date}`,
  )

  // 3. Autorizada con tarjeta de test: no se cobra nada antes del día 7.
  const tok = await cardToken()
  check('tarjeta de test tokenizada', tok.status === 201, `HTTP ${tok.status}`)
  if (tok.json.id) {
    const ref = `check-authorized-${Date.now()}`
    const authorized = await create({
      ...body({ ref, startDate: trialStart }),
      card_token_id: tok.json.id,
      status: 'authorized',
    })
    const pre = authorized.json
    check('alta autorizada con tarjeta', pre.status === 'authorized', `status ${pre.status}`)
    check(
      'autorizada: primer cobro a 7 días',
      sameMinute(pre.next_payment_date, trialStart),
      `next_payment_date ${pre.next_payment_date}`,
    )
    const aps = await mp('GET', `/authorized_payments/search?preapproval_id=${pre.id}`)
    const charged = (aps.json.results || []).filter((a) => a.payment?.status === 'approved')
    check('autorizada: no se cobró nada durante la prueba', charged.length === 0, `${charged.length} cobros`)

    // 4. Cambio de plan Pro → Studio con la función de la app: MP cambia el
    //    monto de ESA suscripción (no abre otra que cobre aparte el plan
    //    anterior), no cobra en el acto y el próximo cobro queda en su fecha.
    const studio = hostedPlanPrice('hosted_studio', 'monthly')
    await updatePreapprovalAmount(token, pre.id, {
      amount: studio,
      currencyId: 'ARS',
      reason: 'ScrollLab LAB — studio (mensual) [check sandbox]',
    })
    const changed = await fetchPreapproval(token, pre.id)
    check(
      'cambio de plan: MP cambia el monto de la misma suscripción',
      changed.status === 'authorized' && changed.auto_recurring?.transaction_amount === studio,
      `status ${changed.status}, monto ${changed.auto_recurring?.transaction_amount}`,
    )
    check(
      'cambio de plan: el próximo cobro sigue en su fecha (no cobra en el acto)',
      sameMinute(changed.next_payment_date, trialStart),
      `next_payment_date ${changed.next_payment_date}`,
    )
    // La búsqueda de MP ignora `external_reference` como filtro e indexa con
    // unos segundos de demora: se busca por texto (`q`), se filtra acá y se
    // reintenta hasta que aparezca la que acabamos de crear.
    let ids = []
    for (let i = 0; i < 15; i++) {
      const found = await mp('GET', `/preapproval/search?q=${encodeURIComponent(ref)}`)
      const rows = (found.json.results || []).filter((p) => p.external_reference === ref)
      if (rows.some((p) => p.id === pre.id)) {
        ids = rows.filter((p) => p.status === 'authorized').map((p) => p.id)
        break
      }
      await new Promise((r) => setTimeout(r, 2000))
    }
    check(
      'cambio de plan: queda UNA sola suscripción activa (la misma)',
      ids.length === 1 && ids[0] === pre.id,
      `${ids.length} activas`,
    )
    const apsAfter = await mp('GET', `/authorized_payments/search?preapproval_id=${pre.id}`)
    const chargedAfter = (apsAfter.json.results || []).filter((a) => a.payment?.status === 'approved')
    check('cambio de plan: no se cobró nada', chargedAfter.length === 0, `${chargedAfter.length} cobros`)

    // 4b. Pausa y reanudación (las hace el cliente desde MP; la app las lee del preapproval).
    const pause = await mp('PUT', `/preapproval/${pre.id}`, { status: 'paused' })
    const paused = await fetchPreapproval(token, pre.id)
    check('pausa: MP la deja en pausa (la app la lee como paused)', pause.status === 200 && paused.status === 'paused', `HTTP ${pause.status} · status ${paused.status}`)
    const resume = await mp('PUT', `/preapproval/${pre.id}`, { status: 'authorized' })
    const resumed = await fetchPreapproval(token, pre.id)
    check(
      'reanudación: vuelve a autorizada, con el monto nuevo y sin cobrar en el acto',
      resume.status === 200 && resumed.status === 'authorized' && Number(resumed.auto_recurring?.transaction_amount) === Number(changed.auto_recurring?.transaction_amount),
      `status ${resumed.status} · monto ${resumed.auto_recurring?.transaction_amount} · próximo cobro ${resumed.next_payment_date}`,
    )

    // 5. Baja con la función de la app, y una segunda baja (MP devuelve 400).
    await cancelPreapproval(token, pre.id)
    const after = await fetchPreapproval(token, pre.id)
    check('baja: MP la deja cancelada', after.status === 'cancelled', `status ${after.status}`)
    let secondOk = true
    try {
      await cancelPreapprovalConfirmed({ id: 'check', mpPreapprovalId: pre.id }, { mpSubs: { accessToken: token } })
    } catch {
      secondOk = false
    }
    check('baja repetida: la app la toma como hecha (sin error)', secondOk)
  }

  // 6. Diferencia al subir de plan: la preference que arma la app. El pago se
  //    hace en la web de Checkout Pro (con credenciales de un usuario de test,
  //    la API de pagos directos responde "Unauthorized use of live
  //    credentials"); los campos del pago que lee `applyUpgradePayment` son
  //    los mismos que ya valida el flujo de compras del market.
  const amount = 43549
  const reference = upgradeReference({
    subscriptionId: 'c'.repeat(24),
    plan: 'hosted_pro',
    amount,
    nonce: crypto.randomUUID().slice(0, 8),
  })
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const pref = await createUpgradePreference({
    accessToken: token,
    reference,
    title: 'ScrollLab LAB — pasar a pro (18 días) [check sandbox]',
    amount,
    expiresAt,
    clientUrl: 'https://www.scrolllab.com.ar',
    apiPublicUrl: 'https://api.scrolllab.com.ar',
  })
  check('diferencia: MP acepta la preference', !!pref.id && !!pref.init_point)
  const stored = await mp('GET', `/checkout/preferences/${pref.id}`)
  const excluded = (stored.json.payment_methods?.excluded_payment_types || []).map((t) => t.id)
  check(
    'diferencia: guarda referencia, monto, vencimiento, binary_mode y sin efectivo',
    stored.json.external_reference === reference &&
      stored.json.items?.[0]?.unit_price === amount &&
      stored.json.expires === true &&
      sameMinute(stored.json.expiration_date_to, expiresAt) &&
      stored.json.binary_mode === true &&
      excluded.includes('ticket') &&
      excluded.includes('atm') &&
      /\/api\/webhooks\/mercadopago\?source=lab$/.test(stored.json.notification_url || ''),
    `ref ${stored.json.external_reference === reference} · vence ${stored.json.expiration_date_to} · excluidos ${excluded.join(',')}`,
  )

  // 7. Compra de templates (Checkout Pro): dos ítems, con lo que pide el
  //    checklist de MP (comprador, descripción, categoría) y el vencimiento
  //    del ticket de efectivo antes de que venza la orden pendiente.
  const orderRef = 'd'.repeat(24)
  const order = await createCheckoutPreference({
    accessToken: token,
    items: [
      { sku: 'chapters', title: 'CHAPTERS — template [check sandbox]', description: 'Template scrollytelling (código fuente).', unit_price: 233000, currency_id: 'ARS' },
      { sku: 'nocturne', title: 'NOCTURNE — template [check sandbox]', description: 'Template scrollytelling (código fuente).', unit_price: 233000, currency_id: 'ARS' },
    ],
    orderId: orderRef,
    userId: 'check-sandbox',
    clientUrl: 'https://www.scrolllab.com.ar',
    apiPublicUrl: 'https://api.scrolllab.com.ar',
    payer: { email: payerEmail, name: 'Comprador Test Sandbox' },
  })
  check('compra: MP acepta la preference de dos templates', !!order.id && !!order.init_point)

  // 7b. Primera compra: el 10% ya descontado y nombrado en el ítem (lo que ve el comprador en MP).
  const rate = 1560
  const firstLine = labelDiscount(
    { sku: 'chapters', title: 'CHAPTERS — template [check sandbox]', unit_price_usd: 149, unit_price: discountedArsFromUsd(149, rate, 10), currency_id: 'ARS' },
    10,
    { paddle: false, rate },
  )
  const first = await createCheckoutPreference({
    accessToken: token,
    items: [firstLine],
    orderId: 'f'.repeat(24),
    userId: 'check-sandbox',
    clientUrl: 'https://www.scrolllab.com.ar',
    apiPublicUrl: 'https://api.scrolllab.com.ar',
    payer: { email: payerEmail, name: 'Comprador Test Sandbox' },
  })
  const firstStored = await mp('GET', `/checkout/preferences/${first.id}`)
  const fi = firstStored.json.items?.[0] || {}
  check(
    'primera compra: MP acepta el ítem con el 10% descontado y nombrado',
    !!first.id && Number(fi.unit_price) === discountedArsFromUsd(149, rate, 10) && /10% off primera compra/.test(fi.title || ''),
    `${fi.title} · $ ${fi.unit_price} (lista $ ${arsFromUsd(149, rate)})`,
  )
  const saved = (await mp('GET', `/checkout/preferences/${order.id}`)).json
  const ticketDays = (Date.parse(saved.date_of_expiration) - Date.now()) / DAY
  check(
    'compra: guarda comprador, categoría, descripción y vencimiento del efectivo (3 días)',
    saved.external_reference === orderRef &&
      saved.items?.length === 2 &&
      saved.items.every((i) => i.category_id === 'virtual_goods' && i.description) &&
      saved.payer?.email === payerEmail &&
      saved.payer?.name === 'Comprador' &&
      saved.payer?.surname === 'Test Sandbox' &&
      ticketDays > 2.9 &&
      ticketDays < 3.1,
    `payer ${saved.payer?.email}/${saved.payer?.name}/${saved.payer?.surname} · categorías ${saved.items?.map((i) => i.category_id).join(',')} · ticket ${ticketDays.toFixed(2)} días`,
  )

  // 8. Composición del builder con el tope de secciones: la línea sale de la
  //    misma validación que el checkout (precio por tramos, SKU `custom:…`
  //    con el id más largo que se genera) y MP la tiene que guardar entera.
  const sections = [...ALLOWED_SECTIONS]
    .filter((id) => !BUILDER_HIDDEN_SKUS.includes(id.split('/')[0]))
    .slice(0, 30)
  const [line] = validateCheckoutItems(
    [{ sku: 'custom', recipe: sections.map((id) => ({ id })) }],
    { maxCartItems: 5, maxRecipeSections: 30, rate: 1560 },
  )
  const composition = await createCheckoutPreference({
    accessToken: token,
    items: [{ ...line, title: `${line.title} [check sandbox]` }],
    orderId: 'e'.repeat(24),
    userId: 'check-sandbox',
    clientUrl: 'https://www.scrolllab.com.ar',
    apiPublicUrl: 'https://api.scrolllab.com.ar',
    payer: { email: payerEmail, name: 'Comprador Test Sandbox' },
  })
  const savedComposition = (await mp('GET', `/checkout/preferences/${composition.id}`)).json
  const item = savedComposition.items?.[0] || {}
  check(
    'builder: MP acepta la composición de 30 secciones con su SKU y precio',
    !!composition.init_point &&
      item.id === line.sku &&
      Number(item.unit_price) === line.unit_price &&
      item.category_id === 'virtual_goods',
    `id ${String(item.id).length} caracteres · ARS ${item.unit_price} (USD ${line.unit_price_usd})`,
  )
}

try {
  await main()
} catch (err) {
  check('verificación', false, err.message)
} finally {
  for (const id of created) {
    try {
      const pre = await fetchPreapproval(token, id)
      if (pre.status !== 'cancelled') await cancelPreapproval(token, id)
    } catch {
      /* ya cancelada o inexistente */
    }
  }
  if (created.length) console.log(`\nLimpieza: ${created.length} suscripciones de test canceladas.`)
}

const failed = results.filter((ok) => !ok).length
console.log(failed ? `\n${failed} verificación(es) fallaron.` : '\nTodo OK contra el sandbox de MercadoPago.')
process.exit(failed ? 1 : 0)
