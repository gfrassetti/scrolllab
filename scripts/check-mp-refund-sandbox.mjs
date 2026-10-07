/**
 * Reembolsos de Mercado Pago de punta a punta contra el SANDBOX REAL (sin plata):
 * la app con el token de PRUEBA, pagos reales de test y los reembolsos que hace
 * MP, para confirmar que la política y la app hacen lo que dicen:
 *
 *  A. Compra sin descargar: elegible, Botón de arrepentimiento → «ELEGIBLE»,
 *     reembolso total en MP → vuelve exactamente lo cobrado, la orden se corta
 *     (sin descarga) y MP no deja devolverla dos veces.
 *  B. Compra descargada: ya no es elegible y el aviso lo dice; un reembolso
 *     parcial (gesto comercial) deja la compra paga y avisa al dueño.
 *
 * Los pagos se crean con la API de pagos de MP (tarjeta de test «APRO») con la
 * orden como referencia, igual que los que llegan desde Checkout Pro; el webhook
 * se firma como lo firma MP (el secreto es de esta corrida), así se prueba el
 * parseo contra lo que MP devuelve de verdad sin exponer un túnel.
 *
 * Requiere credenciales de PRUEBA (aborta si el token no es de un usuario de
 * test): MP_TEST_ACCESS_TOKEN, MP_TEST_PUBLIC_KEY, MP_TEST_PAYER_EMAIL.
 *
 * Uso: npm run check:mp-refund-sandbox
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

const results = []
function check(name, ok, detail = '') {
  results.push(ok)
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

// ——— Mercado Pago (API real de sandbox) ————————————————————————————————

async function mp(method, pathname, body, { auth = true } = {}) {
  const res = await fetch(`https://api.mercadopago.com${pathname}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-idempotency-key': crypto.randomUUID(),
      ...(auth ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: res.status, json: await res.json().catch(() => ({})) }
}

async function payOrder(orderId, amount) {
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
  if (tok.status !== 201) throw new Error(`tarjeta de test: HTTP ${tok.status} ${JSON.stringify(tok.json).slice(0, 200)}`)
  const pay = await mp('POST', '/v1/payments', {
    transaction_amount: amount,
    token: tok.json.id,
    description: `SCROLLLAB e2e ${RUN}`,
    installments: 1,
    payment_method_id: 'master',
    payer: { email: payerEmail },
    external_reference: orderId,
  })
  if (pay.status !== 201) throw new Error(`pago de test: HTTP ${pay.status} ${JSON.stringify(pay.json).slice(0, 300)}`)
  return pay.json
}

// ——— la app (store temporal, token de PRUEBA, sin mails) ——————————————————

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
    // MP pide URLs públicas en la preference; los pagos de esta corrida no la usan.
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
  const email = `mp-refund-${label}-${RUN}@test.com`
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
  await call('POST', '/api/auth/dev-login', { email, name: 'MP Buyer' })
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

/** Carrito → preference REAL de MP → pago de test con la orden como referencia → webhook. */
async function paidOrder(label) {
  const b = await buyer(label)
  const co = await b.call('POST', '/api/checkout', { items: [{ sku: 'chapters' }] })
  if (co.status !== 200) throw new Error(`checkout: HTTP ${co.status} ${JSON.stringify(co.body).slice(0, 200)}`)
  const order = orderRow(co.body.orderId)
  const payment = await payOrder(order.id, Number(order.total))
  const code = await webhook(payment.id)
  return { b, order, payment, code }
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

  // ——— A: sin descargar → reembolso total ———
  const A = await paidOrder('a')
  const paidA = await myOrder(A.b, A.order.id)
  check(
    'A: pago de test aprobado por el total en ARS → la orden queda paga',
    A.payment.status === 'approved' && A.code === 200 && paidA.status === 'paid' && A.payment.transaction_amount === Number(A.order.total),
    `${A.payment.status} · ${A.payment.transaction_amount} ${A.payment.currency_id} · orden ${paidA.status}`,
  )
  check('A: sin descargar, es elegible', paidA.refund?.eligible === true, `${paidA.refund?.reason} · hasta ${paidA.refund?.deadline?.slice(0, 10)}`)
  const wA = await A.b.call('POST', '/api/withdrawals', { name: 'MP Buyer', email: A.b.email, order: A.order.id.slice(-8) })
  await sleep(300)
  check('A: Botón de arrepentimiento → al dueño le llega «ELEGIBLE»', wA.status === 201 && ownerAlerts(wA.body.code).some((l) => /ELEGIBLE — reembolsar/.test(l)), wA.body.code)

  const refA = await mp('POST', `/v1/payments/${A.payment.id}/refunds`, {})
  check(
    'A: MP acepta el reembolso total y devuelve exactamente lo cobrado',
    refA.status === 201 && refA.json.status === 'approved' && Number(refA.json.amount) === A.payment.transaction_amount,
    `HTTP ${refA.status} · ${refA.json.status || refA.json.message || ''} · ${refA.json.amount ?? '-'} de ${A.payment.transaction_amount}`,
  )
  const afterA = (await mp('GET', `/v1/payments/${A.payment.id}`)).json
  check(
    'A: el pago figura reembolsado en MP por el total',
    afterA.status === 'refunded' && Number(afterA.transaction_amount_refunded) === A.payment.transaction_amount,
    `${afterA.status} / ${afterA.status_detail} · devuelto ${afterA.transaction_amount_refunded}`,
  )
  await webhook(A.payment.id)
  const cutA = await myOrder(A.b, A.order.id)
  const dlA = await A.b.call('GET', `/api/orders/${A.order.id}/download`)
  check('A: la orden queda reembolsada y la descarga cortada', cutA.status === 'refunded' && dlA.status === 403, `${cutA.status} · descarga HTTP ${dlA.status}`)
  check('A: al dueño le llega «ORDEN REEMBOLSADA»', ownerAlerts('ORDEN REEMBOLSADA').some((l) => l.includes(A.order.id)))
  const twice = await mp('POST', `/v1/payments/${A.payment.id}/refunds`, {})
  check('A: MP rechaza un segundo reembolso del mismo pago', twice.status >= 400, `HTTP ${twice.status} ${twice.json.message || ''}`)
  await webhook(A.payment.id)
  check('A: repetir el webhook es inocuo', (await myOrder(A.b, A.order.id)).status === 'refunded')

  // ——— B: descargada → no elegible; parcial → sigue paga ———
  const B = await paidOrder('b')
  const dl = await downloadZip(B.b, B.order.id)
  const paidB = await myOrder(B.b, B.order.id)
  check('B: tras bajar el ZIP ya no es elegible', dl === 200 && paidB.refund?.reason === 'downloaded', `archivo HTTP ${dl} · ${paidB.refund?.reason}`)
  const wB = await B.b.call('POST', '/api/withdrawals', { name: 'MP Buyer', email: B.b.email, order: B.order.id })
  await sleep(300)
  check('B: el aviso al dueño dice NO elegible', ownerAlerts(wB.body.code).some((l) => /NO elegible por arrepentimiento/.test(l)), wB.body.code)

  const partial = Math.min(1000, Math.floor(B.payment.transaction_amount / 2))
  const refB = await mp('POST', `/v1/payments/${B.payment.id}/refunds`, { amount: partial })
  check('B: MP acepta un reembolso parcial', refB.status === 201 && Number(refB.json.amount) === partial, `HTTP ${refB.status} · ${refB.json.amount ?? refB.json.message}`)
  const afterB = (await mp('GET', `/v1/payments/${B.payment.id}`)).json
  check(
    'B: el pago sigue aprobado en MP con el parcial adentro',
    afterB.status === 'approved' && Number(afterB.transaction_amount_refunded) === partial,
    `${afterB.status} / ${afterB.status_detail} · devuelto ${afterB.transaction_amount_refunded}`,
  )
  await webhook(B.payment.id)
  await sleep(300)
  const stillB = await myOrder(B.b, B.order.id)
  check(
    'B: la compra sigue paga y descargable, y al dueño le llega «REEMBOLSO PARCIAL»',
    stillB.status === 'paid' && (await downloadZip(B.b, B.order.id)) === 200 && ownerAlerts('REEMBOLSO PARCIAL').some((l) => l.includes(String(B.payment.id))),
    stillB.status,
  )
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
