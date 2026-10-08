/**
 * Reembolsos de Mercado Pago de punta a punta contra el SANDBOX REAL (sin plata),
 * con una compra de Checkout Pro como la hace un cliente: la app con las
 * credenciales del VENDEDOR de prueba arma la preference real, el script imprime
 * el link y vos lo pagás una vez en el navegador como el COMPRADOR de prueba con
 * la tarjeta de prueba. Desde ahí sigue solo:
 *
 *  1. Pagada y sin descargar: «Mis compras» la da por elegible; el Botón de
 *     arrepentimiento le avisa al dueño «ELEGIBLE».
 *  2. Reembolso parcial en MP: el pago sigue aprobado, la compra sigue paga y
 *     descargable, y al dueño le llega «REEMBOLSO PARCIAL».
 *  3. Se baja el ZIP: ya no es elegible por arrepentimiento.
 *  4. Reembolso del resto en MP: vuelve exactamente lo cobrado (parcial + resto),
 *     el pago queda reembolsado, la orden se corta y la descarga también.
 *  5. MP no deja devolver de más; repetir el webhook no cambia nada.
 *
 * (Las apps de Checkout Pro no aceptan crear el pago por API con tarjeta: por eso
 * el pago lo hacés vos en la pantalla de MP, como un cliente de verdad.)
 *
 * El webhook se firma como lo firma MP (el secreto es de esta corrida) con el id
 * del pago real, así se prueba el parseo contra lo que MP devuelve de verdad sin
 * exponer un túnel.
 *
 * Requiere credenciales del VENDEDOR de prueba (aborta si el token no es de un
 * usuario de test): MP_TEST_ACCESS_TOKEN, MP_TEST_PUBLIC_KEY, MP_TEST_PAYER_EMAIL
 * (el mail del COMPRADOR de prueba).
 *
 * Uso: npm run check:mp-refund-sandbox   (espera el pago hasta 15 minutos)
 */
import '../server/loadEnv.js'
import crypto from 'node:crypto'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(REPO)

const token = process.env.MP_TEST_ACCESS_TOKEN
const publicKey = process.env.MP_TEST_PUBLIC_KEY
const payerEmail = process.env.MP_TEST_PAYER_EMAIL
if (!token || !publicKey || !payerEmail) {
  console.error('Faltan MP_TEST_ACCESS_TOKEN, MP_TEST_PUBLIC_KEY y/o MP_TEST_PAYER_EMAIL (credenciales de PRUEBA).')
  process.exit(2)
}

const WEBHOOK_SECRET = `mp_refund_e2e_${crypto.randomBytes(8).toString('hex')}`
const SITE = 'https://www.scrolllab.com.ar'
const RUN = Date.now().toString(36)
const PAY_WAIT_MS = 15 * 60_000

const results = []
function check(name, ok, detail = '') {
  results.push(ok)
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

// ——— Mercado Pago (API real de sandbox) ————————————————————————————————

async function mp(method, pathname, body) {
  const res = await fetch(`https://api.mercadopago.com${pathname}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-idempotency-key': crypto.randomUUID(),
      authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: res.status, json: await res.json().catch(() => ({})) }
}

/** El pago aprobado de una orden (el que hizo el comprador en Checkout Pro). */
async function waitForPayment(orderId) {
  const started = Date.now()
  let lastStatus = ''
  while (Date.now() - started < PAY_WAIT_MS) {
    const r = await mp('GET', `/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc`)
    const list = r.json.results || []
    const approved = list.find((p) => p.status === 'approved')
    if (approved) return approved
    const now = list.map((p) => `${p.status}/${p.status_detail}`).join(', ')
    if (now && now !== lastStatus) {
      console.log(`   MP: ${now} (si fue rechazado, probá de nuevo con la misma tarjeta)`)
      lastStatus = now
    }
    await sleep(5000)
  }
  throw new Error('no llegó el pago en 15 minutos')
}

// ——— la app (store temporal, credenciales de PRUEBA, sin mails) ———————————

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.on('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-refund-'))
const dbDir = path.join(tmp, 'db')
const apiLog = path.join(tmp, 'api.log')
const port = await freePort()
const API = `http://localhost:${port}`

const apiProc = spawn(process.execPath, ['server/index.js'], {
  env: {
    ...process.env,
    PORT: String(port),
    STORE: 'file',
    FILE_DB_DIR: dbDir,
    STORAGE_DIR: path.join(tmp, 'orders'),
    AUTH_DEV_ENABLED: 'true',
    MP_MOCK_ENABLED: 'false',
    MP_ACCESS_TOKEN: token,
    MP_WEBHOOK_SECRET: WEBHOOK_SECRET,
    MP_SUBS_ACCESS_TOKEN: '',
    MP_SUBS_WEBHOOK_SECRET: '',
    PADDLE_API_KEY: '',
    EMAIL_ENABLED: 'false',
    RATE_LIMIT_DISABLED: 'true',
    // MP pide URLs públicas en la preference. Al pagar, MP vuelve al sitio real:
    // esa página no conoce este pago y no importa (se cierra).
    CLIENT_URL: SITE,
    API_PUBLIC_URL: SITE,
  },
  stdio: ['ignore', fs.openSync(apiLog, 'a'), fs.openSync(apiLog, 'a')],
})

function killTree(child) {
  if (!child?.pid) return
  spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { shell: true, stdio: 'ignore' })
  try {
    child.kill()
  } catch {
    /* ya terminó */
  }
}

/** Un comprador con sesión (cookie) que habla con la API como el navegador. */
async function buyer(label) {
  const email = payerEmail.toLowerCase()
  let cookie = ''
  const call = async (method, pathname, body) => {
    const res = await fetch(`${API}${pathname}`, {
      method,
      redirect: 'manual',
      headers: { Origin: SITE, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const set = res.headers.getSetCookie?.() || []
    if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ')
    const type = res.headers.get('content-type') || ''
    return { status: res.status, body: type.includes('json') ? await res.json() : await res.arrayBuffer() }
  }
  await call('POST', '/api/auth/dev-login', { email, name: `MP Buyer ${label}` })
  return { email, call }
}

function webhook(paymentId) {
  const ts = String(Date.now())
  const requestId = crypto.randomUUID()
  const v1 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`id:${paymentId};request-id:${requestId};ts:${ts};`).digest('hex')
  return fetch(`${API}/api/webhooks/mercadopago?type=payment&data.id=${paymentId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId },
    body: JSON.stringify({ type: 'payment', data: { id: String(paymentId) } }),
  }).then((r) => r.status)
}

const ownerAlerts = (needle) => fs.readFileSync(apiLog, 'utf8').split('\n').filter((l) => l.includes(needle))
const orderRow = (id) => JSON.parse(fs.readFileSync(path.join(dbDir, 'orders.json'), 'utf8')).find((o) => o.id === id)
const myOrder = async (b, id) => (await b.call('GET', '/api/orders')).body.orders.find((o) => o.id === id)

async function downloadZip(b, orderId) {
  const link = await b.call('GET', `/api/orders/${orderId}/download`)
  if (link.status !== 200) return link.status
  return (await b.call('GET', link.body.url)).status
}

async function main() {
  const me = await mp('GET', '/users/me')
  if (me.status !== 200 || !(me.json.tags || []).includes('test_user')) {
    throw new Error('El token no es de un usuario de TEST de Mercado Pago. Aborto sin crear nada.')
  }
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`${API}/api/health`)).ok) break
    } catch {
      /* todavía no */
    }
    await sleep(250)
  }
  console.log(`Vendedor de test ${me.json.id} (${me.json.site_id}) · API ${API}\n`)

  // ——— la compra real en Checkout Pro ———
  const b = await buyer(RUN)
  const co = await b.call('POST', '/api/checkout', { items: [{ sku: 'chapters' }] })
  if (co.status !== 200 || !co.body.init_point) {
    throw new Error(`checkout: HTTP ${co.status} ${JSON.stringify(co.body).slice(0, 200)}`)
  }
  const order = orderRow(co.body.orderId)
  console.log('══════════════════════════════════════════════════════════════════')
  console.log(' PAGÁ ESTA COMPRA (ventana de incógnito, logueado como el COMPRADOR de prueba):')
  console.log(`   ${co.body.init_point}`)
  console.log(`   Monto: ${order.total} ${order.currency_id} (plata de mentira)`)
  console.log('   Tarjeta de prueba: Mastercard 5031 7557 3453 0604 · venc. 11/30 · CVV 123')
  console.log('   Titular: APRO · DNI 12345678')
  console.log('   Al terminar, MP te lleva a scrolllab.com.ar: ignorá esa página y cerrala.')
  console.log('══════════════════════════════════════════════════════════════════')
  const payment = await waitForPayment(order.id)
  console.log('')

  const code = await webhook(payment.id)
  const paid = await myOrder(b, order.id)
  check(
    'pago real de Checkout Pro aprobado por el total → la orden queda paga',
    code === 200 && paid.status === 'paid' && Number(payment.transaction_amount) === Number(order.total),
    `${payment.status} · ${payment.transaction_amount} ${payment.currency_id} · ${payment.payment_method_id} · orden ${paid.status}`,
  )

  // 1. Sin descargar: elegible.
  check('sin descargar, «Mis compras» la da por elegible', paid.refund?.eligible === true, `${paid.refund?.reason} · hasta ${paid.refund?.deadline?.slice(0, 10)}`)
  const w = await b.call('POST', '/api/withdrawals', { name: 'MP Buyer', email: b.email, order: order.id.slice(-8) })
  await sleep(300)
  check('Botón de arrepentimiento → al dueño le llega «ELEGIBLE»', w.status === 201 && ownerAlerts(w.body.code).some((l) => /ELEGIBLE — reembolsar/.test(l)), w.body.code)

  // 2. Reembolso parcial.
  const total = Number(payment.transaction_amount)
  const partial = Math.min(1000, Math.floor(total / 2))
  const part = await mp('POST', `/v1/payments/${payment.id}/refunds`, { amount: partial })
  check('MP acepta un reembolso parcial', part.status === 201 && Number(part.json.amount) === partial, `HTTP ${part.status} · ${part.json.amount ?? part.json.message}`)
  const afterPart = (await mp('GET', `/v1/payments/${payment.id}`)).json
  check(
    'el pago sigue aprobado en MP con el parcial adentro',
    afterPart.status === 'approved' && Number(afterPart.transaction_amount_refunded) === partial,
    `${afterPart.status} / ${afterPart.status_detail} · devuelto ${afterPart.transaction_amount_refunded}`,
  )
  await webhook(payment.id)
  await sleep(300)
  const stillPaid = await myOrder(b, order.id)
  check(
    'la compra sigue paga y descargable, y al dueño le llega «REEMBOLSO PARCIAL»',
    stillPaid.status === 'paid' && ownerAlerts('REEMBOLSO PARCIAL').some((l) => l.includes(String(payment.id))),
    stillPaid.status,
  )

  // 3. Se baja el ZIP.
  const dl = await downloadZip(b, order.id)
  const downloaded = await myOrder(b, order.id)
  check('tras bajar el ZIP ya no es elegible por arrepentimiento', dl === 200 && downloaded.refund?.reason === 'downloaded', `archivo HTTP ${dl} · ${downloaded.refund?.reason}`)

  // 4. Reembolso del resto.
  const rest = await mp('POST', `/v1/payments/${payment.id}/refunds`, {})
  check('MP acepta el reembolso del resto', rest.status === 201 && rest.json.status === 'approved', `HTTP ${rest.status} · ${rest.json.status || rest.json.message || ''} · ${rest.json.amount ?? '-'}`)
  const refunded = (await mp('GET', `/v1/payments/${payment.id}`)).json
  check(
    'el pago queda reembolsado en MP por exactamente lo cobrado',
    refunded.status === 'refunded' && Number(refunded.transaction_amount_refunded) === total,
    `${refunded.status} / ${refunded.status_detail} · devuelto ${refunded.transaction_amount_refunded} de ${total}`,
  )
  await webhook(payment.id)
  const cut = await myOrder(b, order.id)
  const dlCut = await b.call('GET', `/api/orders/${order.id}/download`)
  check('la orden queda reembolsada y la descarga cortada', cut.status === 'refunded' && dlCut.status === 403, `${cut.status} · descarga HTTP ${dlCut.status}`)
  check('al dueño le llega «ORDEN REEMBOLSADA»', ownerAlerts('ORDEN REEMBOLSADA').some((l) => l.includes(order.id)))

  // 5. No se devuelve de más; el webhook repetido es inocuo.
  const more = await mp('POST', `/v1/payments/${payment.id}/refunds`, {})
  check('MP rechaza devolver de más', more.status >= 400, `HTTP ${more.status} ${more.json.message || ''}`)
  await webhook(payment.id)
  check('repetir el webhook es inocuo', (await myOrder(b, order.id)).status === 'refunded')
}

try {
  await main()
} catch (err) {
  check('corrida', false, err.message)
} finally {
  killTree(apiProc)
}

const failed = results.filter((ok) => !ok).length
if (failed) {
  console.log(`\nLog de la API: ${apiLog}`)
  for (const l of fs.readFileSync(apiLog, 'utf8').split('\n').filter((x) => /error|Error|skipped|FALLÓ/.test(x)).slice(-10)) console.log('  ', l)
}
console.log(`\n${results.length - failed}/${results.length} OK`)
process.exit(failed ? 1 : 0)
