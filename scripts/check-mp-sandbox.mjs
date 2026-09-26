/**
 * Verifica las suscripciones de LAB contra el sandbox REAL de MercadoPago, con
 * las mismas funciones que usa la app (body del alta, baja confirmada).
 *
 * `npm test` prueba nuestra lógica contra un MP simulado; esto confirma que MP
 * se comporta como ese simulador supone: que difiere el primer cobro con
 * `start_date` (prueba gratis y re-suscripción sin doble cobro), que una alta
 * autorizada con tarjeta no cobra antes de tiempo, que el cambio de plan
 * modifica esa misma suscripción (no abre otra) y que la baja funciona.
 * Todo lo que crea lo cancela al final.
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
} from '../server/services/mercadoPago.js'
import { cancelPreapprovalConfirmed } from '../server/services/subscriptions.js'
import { hostedPlanPrice } from '../server/catalog.js'

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
  const tok = await mp(
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
    const active = await mp('GET', `/preapproval/search?external_reference=${ref}&status=authorized`)
    const ids = (active.json.results || []).map((p) => p.id)
    check(
      'cambio de plan: queda UNA sola suscripción activa (la misma)',
      ids.length === 1 && ids[0] === pre.id,
      `${ids.length} activas`,
    )
    const apsAfter = await mp('GET', `/authorized_payments/search?preapproval_id=${pre.id}`)
    const chargedAfter = (apsAfter.json.results || []).filter((a) => a.payment?.status === 'approved')
    check('cambio de plan: no se cobró nada', chargedAfter.length === 0, `${chargedAfter.length} cobros`)

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
