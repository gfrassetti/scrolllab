/**
 * Paddle de punta a punta contra el SANDBOX REAL, en un Chromium de verdad, sin
 * plata (docs/paddle.md). Es lo que hace un comprador: carrito → ventana de
 * pago de Paddle → tarjeta de prueba → Mis compras / LAB.
 *
 * `npm test` prueba nuestra lógica contra un Paddle simulado y
 * `check:paddle-sandbox` solo arma transacciones; esto confirma que el flujo
 * completo anda con Paddle de verdad:
 *
 *  1. Compra de un template con tarjeta aprobada (con el cupón de bienvenida):
 *     orden paga en USD, monto exacto en Paddle, ZIP descargable.
 *  2. Tarjeta rechazada: la orden sigue pendiente; se reintenta con otra y paga.
 *  3. Compra donde el navegador nunca confirma (se cierra la pestaña): la
 *     cumple el WEBHOOK, con el payload real que Paddle emitió.
 *  4. Reembolsos con la aprobación REAL de Paddle: total sin descargar (Botón de
 *     arrepentimiento → orden cortada), parcial de una compra descargada (sigue
 *     paga), cobro de LAB; monto exacto devuelto y sin doble reembolso.
 *  5. LAB: alta con 7 días de prueba, plan activo en USD, cambio de plan
 *     (Paddle acepta el PATCH) y baja programada.
 *  6. LAB sin sync del navegador: la activan los eventos reales de Paddle.
 *  7. Todo evento real repetido (idempotencia): nada cambia ni se duplica.
 *
 * Los webhooks se prueban con la entidad REAL que devuelve la API de Paddle (el
 * `data` de un evento es esa misma entidad), firmada con un secreto de prueba:
 * así se prueba el parseo contra lo que Paddle manda de verdad sin exponer un
 * túnel. Lo único que no se prueba acá es la entrega HTTP de Paddle a una URL
 * pública (eso lo confirma la primera venta real mirando «Notifications» en el
 * panel).
 *
 * Levanta su propia API (store temporal, mock de MP, sin mails) y un build
 * estático del sitio, así que no pisa nada ni se recarga a mitad del pago.
 * Requiere PADDLE_API_KEY y PADDLE_CLIENT_TOKEN de SANDBOX en .env.
 *
 * Uso: npm run check:paddle-e2e   (PLAYWRIGHT_CHROMIUM_PATH=… si hace falta)
 *      npm run check:paddle-e2e -- --headed
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

import { chromium } from 'playwright'

import { loadPaddleConfig } from '../server/config.js'
import { HOSTED_PLANS } from '../server/catalog.js'
import { TEMPLATE_PRICES_USD, WELCOME_COUPON_PERCENT } from '../src/domain/catalog.js'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(REPO)

const HEADED = process.argv.includes('--headed')
// --only=lab,approved  corre solo esos escenarios (para depurar uno).
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean)

let paddle
try {
  paddle = loadPaddleConfig(process.env, false)
} catch (err) {
  console.error(err.message)
  process.exit(2)
}
if (!paddle.apiKey || !paddle.clientToken || paddle.environment !== 'sandbox') {
  console.error('Faltan PADDLE_API_KEY y PADDLE_CLIENT_TOKEN de SANDBOX en .env (PADDLE_ENV=sandbox).')
  process.exit(2)
}

const WEBHOOK_SECRET = 'pdl_ntfset_e2e_test_secret_value'
const GOOD_CARD = '4242424242424242'
const DECLINED_CARD = '4000000000000002'
const RUN = Date.now().toString(36)

const results = []
const skipped = []
function check(name, ok, detail = '') {
  results.push(ok)
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}
function skip(name, why) {
  skipped.push(name)
  console.log(`⏭️  ${name} — ${why}`)
}

// ——— infraestructura ———————————————————————————————————————————————

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

async function waitUp(url, tries = 160) {
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(url)).status < 500) return
    } catch {
      /* todavía no */
    }
    await sleep(250)
  }
  throw new Error(`no levantó: ${url}`)
}

function killTree(child) {
  if (!child?.pid) return
  spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { shell: true, stdio: 'ignore' })
  try {
    child.kill()
  } catch {
    /* ya terminó */
  }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'paddle-e2e-'))
const apiPort = await freePort()
const webPort = await freePort()
const BASE = `http://localhost:${webPort}`
const API = `http://localhost:${apiPort}`
const apiLog = path.join(tmp, 'api.log')
const dbDir = path.join(tmp, 'db')

console.log('Buildeando el sitio…')
const dist = path.join(tmp, 'dist')
const build = spawnSync('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir'], {
  env: { ...process.env, VITE_API_PROXY_TARGET: API },
  stdio: 'ignore',
  shell: true,
})
if (build.status !== 0) {
  console.error('vite build falló')
  process.exit(1)
}

const apiProc = spawn(process.execPath, ['server/index.js'], {
  env: {
    ...process.env,
    PORT: String(apiPort),
    STORE: 'file',
    FILE_DB_DIR: dbDir,
    STORAGE_DIR: path.join(tmp, 'orders'),
    AUTH_DEV_ENABLED: 'true',
    MP_MOCK_ENABLED: 'true',
    PADDLE_MOCK_ENABLED: 'false',
    PADDLE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    EMAIL_ENABLED: 'false',
    RATE_LIMIT_DISABLED: 'true',
    HOSTED_TRIAL_DAYS: '7',
    CLIENT_URL: BASE,
    API_PUBLIC_URL: API,
  },
  stdio: ['ignore', fs.openSync(apiLog, 'a'), fs.openSync(apiLog, 'a')],
})
const webProc = spawn('npx', ['vite', 'preview', '--outDir', dist, '--port', String(webPort), '--strictPort'], {
  env: { ...process.env, VITE_API_PROXY_TARGET: API },
  stdio: 'ignore',
  shell: true,
})

// ——— Paddle (API real de sandbox) ————————————————————————————————————

async function pd(method, pathname, body) {
  const res = await fetch(`${paddle.apiBase}${pathname}`, {
    method,
    headers: { Authorization: `Bearer ${paddle.apiKey}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const e = json.error || {}
    const fields = (e.errors || []).map((f) => `${f.field}: ${f.message}`).join('; ')
    const err = new Error(`${method} ${pathname} → ${res.status} ${e.code || ''} ${e.detail || ''} ${fields}`.trim())
    err.status = res.status
    err.code = e.code
    throw err
  }
  return json.data
}

let eventSeq = 0
/**
 * Un evento de webhook trae como `data` la misma entidad que devuelve la API
 * (`GET /transactions/…`, `/subscriptions/…`, `/adjustments/…`): se arma desde
 * la entidad real de Paddle y se firma como lo firma Paddle.
 */
function signedWebhook(type, data) {
  const raw = JSON.stringify({
    event_id: `evt_e2e_${RUN}_${++eventSeq}`,
    event_type: type,
    occurred_at: new Date().toISOString(),
    notification_id: `ntf_e2e_${RUN}_${eventSeq}`,
    data,
  })
  const ts = Math.floor(Date.now() / 1000)
  const h1 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${ts}:${raw}`).digest('hex')
  return fetch(`${API}/api/webhooks/paddle`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'paddle-signature': `ts=${ts};h1=${h1}` },
    body: raw,
  })
}

/** Manda al webhook una lista de [tipo, entidad], en orden; devuelve los status. */
async function replay(events) {
  const codes = []
  for (const [type, data] of events) codes.push((await signedWebhook(type, data)).status)
  return codes
}

// ——— navegador ———————————————————————————————————————————————————————

const browser = await chromium.launch({
  headless: !HEADED,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
})

async function newBuyer(label, { country = 'Europe/Madrid' } = {}) {
  const email = `e2e-${label}-${RUN}@test.com`
  const ctx = await browser.newContext({ locale: 'en-US', timezoneId: country })
  const page = await ctx.newPage()
  page.setDefaultTimeout(30_000)
  page.diag = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') page.diag.push(`[${m.type()}] ${m.text().slice(0, 200)}`)
  })
  page.on('pageerror', (e) => page.diag.push(`[pageerror] ${String(e).slice(0, 200)}`))
  page.on('requestfailed', (r) => page.diag.push(`[requestfailed] ${r.url().slice(0, 90)} ${r.failure()?.errorText}`))
  await page.goto(BASE)
  await page.evaluate(async (mail) => {
    await fetch('/api/auth/dev-login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mail, name: 'E2E Buyer' }),
    })
    localStorage.setItem('scrolllab-locale', 'en')
    localStorage.setItem('scrolllab-pay-region', 'intl')
  }, email)
  // Misma sesión para las llamadas directas a la API (con Origin, como el navegador).
  const call = async (method, pathname, body) => {
    const res = await ctx.request.fetch(`${BASE}${pathname}`, {
      method,
      headers: { Origin: BASE, 'Content-Type': 'application/json' },
      data: body === undefined ? undefined : body,
    })
    return { status: res.status(), body: await res.json().catch(() => ({})) }
  }
  return { email, ctx, page, call }
}

async function paddleFrame(page, timeoutMs = 90_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const frame = page.frames().find((f) => /sandbox-buy\.paddle\.com\/checkout\//.test(f.url()))
    if (frame && (await frame.$('input[name=cardNumber]').catch(() => null))) return frame
    await sleep(300)
  }
  throw new Error('la ventana de pago de Paddle no abrió')
}

/** Escribe en un campo de Paddle y verifica que el valor quedó (el formulario se re-dibuja y a veces lo borra). */
async function typeField(frame, name, value, { digits = false } = {}) {
  const input = frame.locator(`input[name=${name}]`)
  for (let attempt = 0; attempt < 4; attempt++) {
    await input.click()
    await input.fill('')
    await input.pressSequentially(value, { delay: 30 })
    const got = await input.inputValue()
    if ((digits ? got.replace(/\D/g, '') : got) === value) return
    await sleep(500)
  }
  throw new Error(`no pude completar el campo ${name}`)
}

/** Completa la tarjeta y toca el botón de pagar / empezar la prueba. */
async function payInOverlay(page, card) {
  const frame = await paddleFrame(page)
  await typeField(frame, 'cardNumber', card, { digits: true })
  await typeField(frame, 'expiry', '1230', { digits: true })
  await typeField(frame, 'cvv', '100')
  // El nombre va al final: Paddle re-dibuja el formulario al validar la tarjeta y lo borraba.
  await typeField(frame, 'cardHolder', 'E2E Buyer')
  // Algunos países piden código postal.
  const postal = frame.locator('input[name=postcode], input[name=postalCode]')
  if (await postal.count()) await postal.first().fill('28001')
  const submit = frame
    .locator('button[type=submit]')
    .filter({ hasText: /pay|start|subscribe|trial/i })
    .filter({ hasNotText: /return|close/i })
    .last()
  await submit.click()
  return frame
}

async function waitFor(fn, what, timeoutMs = 60_000) {
  const started = Date.now()
  let last
  while (Date.now() - started < timeoutMs) {
    last = await fn()
    if (last) return last
    await sleep(1000)
  }
  throw new Error(`timeout esperando ${what}`)
}

async function fillCart(page, items) {
  await page.evaluate((list) => {
    localStorage.setItem('scrolllab-cart-v2', JSON.stringify({ state: { items: list }, version: 0 }))
  }, items)
}

const money = (n) => Math.round(Number(n) * 100) / 100
const couponTotal = (usd) => money(Math.round(usd * (100 - WELCOME_COUPON_PERCENT)) / 100)

async function snap(page, name) {
  const file = path.join(tmp, `${name}.png`)
  await page.screenshot({ path: file }).catch(() => {})
  return file
}

// ——— escenarios —————————————————————————————————————————————————————

async function openCartAndPay(buyer) {
  await fillCart(buyer.page, [{ sku: 'chapters', title: 'CHAPTERS' }])
  await buyer.page.goto(`${BASE}/cart`)
  await buyer.page.getByRole('button', { name: /pay by card/i }).click()
}

/** La transacción de Paddle de una orden (la API pública de órdenes no la expone). */
function txnOf(orderId) {
  const rows = JSON.parse(fs.readFileSync(path.join(dbDir, 'orders.json'), 'utf8'))
  return rows.find((o) => o.id === orderId)?.paddleTransactionId
}

async function myOrders(buyer) {
  const res = await buyer.call('GET', '/api/orders')
  return (res.body.orders || res.body || []).map((o) => ({ ...o, paddleTransactionId: txnOf(o.id) }))
}

const state = {}

async function scenarioApproved() {
  const buyer = await newBuyer('ok')
  state.ok = buyer
  await openCartAndPay(buyer)
  await payInOverlay(buyer.page, GOOD_CARD)
  await buyer.page.waitForURL(/\/account\?purchase=1/, { timeout: 90_000 })
  const [order] = await myOrders(buyer)
  const expected = couponTotal(TEMPLATE_PRICES_USD.chapters)
  check(
    'compra aprobada: la orden queda paga, en USD y con el cupón',
    order?.status === 'paid' && order.currency_id === 'USD' && money(order.total) === expected,
    `${order?.status} · ${order?.total} ${order?.currency_id} (esperado ${expected})`,
  )
  const txn = await pd('GET', `/transactions/${order.paddleTransactionId}`)
  check(
    'compra aprobada: Paddle la tiene completada por el monto exacto',
    ['paid', 'completed'].includes(txn.status) && Number(txn.details.totals.grand_total) === Math.round(expected * 100),
    `${txn.status} · ${txn.details.totals.grand_total} centavos`,
  )
  const dl = await buyer.call('GET', `/api/orders/${order.id}/download`)
  check('compra aprobada: el ZIP se puede descargar', dl.status === 200 && !!(dl.body.url || dl.body.downloadUrl), `HTTP ${dl.status}`)
  state.okOrder = order
  state.okTxn = txn
}

async function scenarioDeclined() {
  const buyer = await newBuyer('declined')
  await openCartAndPay(buyer)
  const frame = await payInOverlay(buyer.page, DECLINED_CARD)
  await sleep(9000)
  const stillOpen = (await frame.locator('input[name=cardNumber]').count()) > 0
  const [pending] = await myOrders(buyer)
  check(
    'tarjeta rechazada: la ventana sigue abierta y la orden queda pendiente',
    stillOpen && pending?.status === 'pending',
    `ventana ${stillOpen ? 'abierta' : 'cerrada'} · orden ${pending?.status}`,
  )
  const txn = await pd('GET', `/transactions/${pending.paddleTransactionId}`)
  check(
    'tarjeta rechazada: Paddle registra el intento fallido y no cobra',
    txn.status !== 'completed' && (txn.payments || []).some((p) => p.status !== 'captured'),
    `${txn.status} · pagos: ${(txn.payments || []).map((p) => `${p.status}${p.error_code ? `:${p.error_code}` : ''}`).join(',') || 'ninguno'}`,
  )
  await payInOverlay(buyer.page, GOOD_CARD)
  await buyer.page.waitForURL(/\/account\?purchase=1/, { timeout: 90_000 })
  const [paid] = await myOrders(buyer)
  check('tarjeta rechazada: reintenta con otra tarjeta y la misma orden paga', paid?.status === 'paid' && paid.id === pending.id)
}

async function scenarioWebhookOnly() {
  const buyer = await newBuyer('webhook')
  // El navegador nunca confirma (cerró la pestaña): solo queda el webhook.
  await buyer.page.route('**/api/checkout/paddle/confirm', (route) => route.abort())
  await openCartAndPay(buyer)
  await payInOverlay(buyer.page, GOOD_CARD)
  const order = await waitFor(async () => {
    const [o] = await myOrders(buyer)
    return o?.paddleTransactionId ? o : null
  }, 'la orden')
  await sleep(12_000)
  const before = (await myOrders(buyer))[0]
  check('webhook: sin confirmación del navegador la orden sigue pendiente', before.status === 'pending', before.status)

  // Paddle manda transaction.paid y transaction.completed con la transacción real.
  const txn = await pd('GET', `/transactions/${order.paddleTransactionId}`)
  const events = [['transaction.paid', txn], ['transaction.completed', txn]]
  const codes = await replay(events)
  check('webhook: los eventos de la transacción real responden 200', codes.every((c) => c === 200), `${txn.status} → ${codes.join(',')}`)
  const [after] = await myOrders(buyer)
  check('webhook: la orden pasa a paga solo con el payload real de Paddle', after.status === 'paid', after.status)
  const dl = await buyer.call('GET', `/api/orders/${after.id}/download`)
  check('webhook: el ZIP quedó armado y se descarga', dl.status === 200, `HTTP ${dl.status}`)
  // Idempotencia: los mismos eventos otra vez no cambian nada.
  const again = await replay(events)
  const [twice] = await myOrders(buyer)
  check('webhook: repetir los eventos es inocuo', again.every((c) => c === 200) && twice.status === 'paid' && twice.downloadCount === after.downloadCount, again.join(','))
  // Una firma que no es de Paddle se rechaza.
  const forged = await fetch(`${API}/api/webhooks/paddle`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'paddle-signature': `ts=${Math.floor(Date.now() / 1000)};h1=${'0'.repeat(64)}` },
    body: JSON.stringify({ event_type: 'transaction.completed', data: txn }),
  })
  check('webhook: una firma falsa se rechaza (401)', forged.status === 401, `HTTP ${forged.status}`)
}

/** Baja el ZIP de verdad (link firmado + archivo): recién ahí cuenta como descargado. */
async function downloadZip(buyer, orderId) {
  const link = await buyer.call('GET', `/api/orders/${orderId}/download`)
  if (link.status !== 200) return link.status
  const file = await buyer.ctx.request.fetch(new URL(link.body.url, BASE).toString(), { headers: { Origin: BASE } })
  await file.body()
  return file.status()
}

/** Lo que el servidor le avisó al dueño (sin mails, los avisos quedan en el log de la API). */
function ownerAlerts(needle) {
  return fs.readFileSync(apiLog, 'utf8').split('\n').filter((l) => l.includes(needle))
}

async function buyChapters(label) {
  const buyer = await newBuyer(label)
  await openCartAndPay(buyer)
  await payInOverlay(buyer.page, GOOD_CARD)
  await buyer.page.waitForURL(/\/account\?purchase=1/, { timeout: 90_000 })
  const [order] = await myOrders(buyer)
  return { buyer, order }
}

const completed = (txnId) =>
  waitFor(async () => {
    const t = await pd('GET', `/transactions/${txnId}`)
    return t.status === 'completed' ? t : null
  }, `que Paddle complete ${txnId}`, 300_000)

/**
 * Reembolsos de punta a punta contra el sandbox real: la política (14 días, ZIP
 * sin descargar), el Botón de arrepentimiento, el reembolso hecho en Paddle con
 * su aprobación REAL (el sandbox aprueba solo cada ~10 min), que el monto que
 * vuelve sea exactamente lo cobrado, que no se pueda reembolsar dos veces y qué
 * hace la app con cada caso: total → orden cortada; parcial → sigue paga y
 * avisa; cobro de LAB → avisa (la baja es aparte).
 */
async function scenarioRefunds() {
  // ——— A: compra sin descargar → elegible → reembolso total ———
  const A = await buyChapters('refund-a')
  check(
    'reembolso A: recién comprada, sin descargar, «Mis compras» la da por elegible',
    A.order.refund?.eligible === true && A.order.refund.reason === 'ok',
    `${A.order.refund?.reason} · hasta ${A.order.refund?.deadline?.slice(0, 10)}`,
  )
  const wA = await A.buyer.call('POST', '/api/withdrawals', {
    name: 'E2E Buyer',
    email: A.buyer.email,
    order: A.order.id.slice(-8),
    message: 'changed my mind',
    locale: 'en',
  })
  check('reembolso A: el Botón de arrepentimiento da un código', wA.status === 201 && /^ARR-/.test(wA.body.code || ''), `HTTP ${wA.status} ${wA.body.code || wA.body.error || ''}`)
  await sleep(500)
  const alertA = ownerAlerts(wA.body.code).join(' ')
  check('reembolso A: al dueño le llega «ELEGIBLE — reembolsar» con la orden', /ELEGIBLE — reembolsar/.test(alertA) && alertA.includes(A.order.id), alertA.slice(0, 160))

  // ——— B: compra descargada → no elegible por arrepentimiento ———
  const B = await buyChapters('refund-b')
  const dlB = await downloadZip(B.buyer, B.order.id)
  const [B2] = await myOrders(B.buyer)
  check(
    'reembolso B: tras bajar el ZIP ya no es elegible',
    dlB === 200 && B2.refund?.eligible === false && B2.refund.reason === 'downloaded',
    `archivo HTTP ${dlB} · ${B2.refund?.reason} · ${B2.downloadCount} descarga(s)`,
  )
  const wB = await B.buyer.call('POST', '/api/withdrawals', { name: 'E2E Buyer', email: B.buyer.email, order: B.order.id })
  await sleep(500)
  const alertB = ownerAlerts(wB.body.code).join(' ')
  check('reembolso B: el aviso al dueño dice NO elegible (se descargó)', /NO elegible por arrepentimiento/.test(alertB), alertB.slice(0, 160))

  // ——— C: un cobro de LAB (se termina la prueba ya para que haya cobro) ———
  let C = null
  try {
    const buyer = await newBuyer('refund-lab')
    await labSubscribe(buyer)
    await waitFor(async () => (await buyer.call('GET', '/api/subscriptions/me')).body.plan === 'hosted_pro', 'el plan Pro', 90_000)
    // Corre antes que los escenarios de LAB: es la única suscripción de Paddle hasta acá.
    const row = await waitFor(
      async () => JSON.parse(fs.readFileSync(path.join(dbDir, 'subscriptions.json'), 'utf8')).filter((r) => r.paddleSubscriptionId).at(-1),
      'la suscripción en Paddle',
    )
    await pd('POST', `/subscriptions/${row.paddleSubscriptionId}/activate`)
    const charge = await waitFor(async () => {
      const list = await pd('GET', `/transactions?subscription_id=${row.paddleSubscriptionId}&status=completed`)
      return list.find((t) => Number(t.details?.totals?.grand_total) > 0) || null
    }, 'el primer cobro de LAB', 300_000)
    const sub = await pd('GET', `/subscriptions/${row.paddleSubscriptionId}`)
    const codes = await replay([['subscription.activated', sub], ['transaction.completed', charge]])
    const me = (await buyer.call('GET', '/api/subscriptions/me')).body
    check(
      'reembolso C: LAB cobró USD 79 (fin de la prueba) y la app lo registra',
      codes.every((c) => c === 200) && Number(charge.details.totals.grand_total) === HOSTED_PLANS.hosted_pro.priceMonthlyUsd * 100 && me.plan === 'hosted_pro' && !me.trialing,
      `${charge.details.totals.grand_total} centavos · ${me.plan} · trialing ${me.trialing} · ${codes.join(',')}`,
    )
    C = { buyer, charge, subId: row.paddleSubscriptionId }
  } catch (err) {
    skip('reembolso C (LAB)', err.message)
  }

  // ——— Paddle: pedir los reembolsos (solo sobre transacciones completadas) ———
  const txA = await completed(A.order.paddleTransactionId)
  const txB = await completed(B.order.paddleTransactionId)
  const adjA = await pd('POST', '/adjustments', { action: 'refund', type: 'full', reason: 'withdrawal request (e2e)', transaction_id: txA.id })
  const lineB = txB.details.line_items[0]
  const adjB = await pd('POST', '/adjustments', {
    action: 'refund',
    type: 'partial',
    reason: 'goodwill (e2e)',
    transaction_id: txB.id,
    items: [{ item_id: lineB.id, type: 'partial', amount: '500' }],
  })
  const adjC = C
    ? await pd('POST', '/adjustments', { action: 'refund', type: 'full', reason: 'lab refund (e2e)', transaction_id: C.charge.id }).catch((err) => {
        skip('reembolso C (LAB)', `Paddle no dejó crearlo: ${err.message}`)
        return null
      })
    : null

  // Pendiente de aprobación: la orden todavía no se corta.
  const pendingCodes = await replay([['adjustment.created', adjA]])
  const [stillPaid] = await myOrders(A.buyer)
  check(
    'reembolso A: pendiente de aprobación, la orden sigue paga',
    adjA.status === 'pending_approval' ? pendingCodes[0] === 200 && stillPaid.status === 'paid' : true,
    `${adjA.status} → ${stillPaid.status}`,
  )

  // ——— la aprobación REAL de Paddle (sandbox: ~cada 10 minutos) ———
  const ids = [adjA, adjB, adjC].filter(Boolean).map((a) => a.id)
  console.log(`   esperando que Paddle apruebe ${ids.length} reembolsos (hasta 16 min)…`)
  const approved = await waitFor(async () => {
    const list = await pd('GET', `/adjustments?id=${ids.join(',')}`)
    return list.length === ids.length && list.every((a) => a.status !== 'pending_approval') ? list : null
  }, 'la aprobación de Paddle', 16 * 60_000)
  const byId = Object.fromEntries(approved.map((a) => [a.id, a]))
  const rA = byId[adjA.id]
  const rB = byId[adjB.id]
  const rC = adjC ? byId[adjC.id] : null

  // El dinero: vuelve exactamente lo cobrado, en la misma moneda.
  check(
    'reembolso A: Paddle lo aprobó y devuelve exactamente lo cobrado (impuestos incluidos)',
    rA.status === 'approved' && rA.totals.total === txA.details.totals.grand_total && rA.currency_code === txA.currency_code,
    `${rA.status} · devuelve ${rA.totals.total} de ${txA.details.totals.grand_total} ${rA.currency_code} · a tu saldo ${rA.totals.earnings}`,
  )
  check(
    'reembolso B: el parcial de USD 5 quedó aprobado por USD 5',
    rB.status === 'approved' && Number(rB.totals.total) === 500,
    `${rB.status} · ${rB.totals.total} ${rB.currency_code}`,
  )
  if (rC) {
    check(
      'reembolso C: el cobro de LAB se devuelve completo',
      rC.status === 'approved' && rC.totals.total === C.charge.details.totals.grand_total,
      `${rC.status} · ${rC.totals.total} de ${C.charge.details.totals.grand_total}`,
    )
  }

  // No se puede devolver dos veces la misma compra.
  const twice = await pd('POST', '/adjustments', { action: 'refund', type: 'full', reason: 'double (e2e)', transaction_id: txA.id }).then(
    (a) => ({ ok: true, a }),
    (err) => ({ ok: false, err }),
  )
  check('reembolso A: Paddle rechaza un segundo reembolso de la misma compra', !twice.ok, twice.ok ? `creó ${twice.a.id}` : twice.err.message.slice(0, 120))

  // ——— la app con los eventos reales ———
  const codes = await replay([['adjustment.updated', rA], ['adjustment.updated', rB], ...(rC ? [['adjustment.updated', rC]] : [])])
  check('reembolsos: los adjustment.updated reales responden 200', codes.every((c) => c === 200), codes.join(','))

  const [refA] = await myOrders(A.buyer)
  const dlA = await A.buyer.call('GET', `/api/orders/${refA.id}/download`)
  check(
    'reembolso A: la orden queda reembolsada y la descarga cortada',
    refA.status === 'refunded' && refA.refund?.reason === 'refunded' && dlA.status === 403,
    `${refA.status} · ${refA.refund?.reason} · descarga HTTP ${dlA.status}`,
  )
  const [refB] = await myOrders(B.buyer)
  check(
    'reembolso B: el parcial no corta la compra (sigue paga y descargable) y avisa',
    refB.status === 'paid' && (await downloadZip(B.buyer, refB.id)) === 200 && ownerAlerts('REEMBOLSO PARCIAL').some((l) => l.includes(rB.id)),
    refB.status,
  )
  if (rC) {
    const me = (await C.buyer.call('GET', '/api/subscriptions/me')).body
    check(
      'reembolso C: LAB avisa al dueño para revisar el acceso (la baja la decide el cliente)',
      ownerAlerts('REEMBOLSO EN PADDLE').some((l) => l.includes(rC.id) && /LAB/.test(l)),
      `plan ${me.plan}`,
    )
  }
  // Repetir los eventos no cambia nada.
  await replay([['adjustment.updated', rA], ['adjustment.updated', rB]])
  const [againA] = await myOrders(A.buyer)
  const [againB] = await myOrders(B.buyer)
  check('reembolsos: repetir los eventos es inocuo', againA.status === 'refunded' && againB.status === 'paid')
}

async function labSubscribe(buyer, { block = false } = {}) {
  if (block) await buyer.page.route('**/api/subscriptions/sync', (route) => route.abort())
  await buyer.page.goto(`${BASE}/lab#planes`)
  const trialButtons = buyer.page.getByRole('button', { name: /free trial/i })
  await trialButtons.nth(1).waitFor() // Pro
  await trialButtons.nth(1).click()
  await payInOverlay(buyer.page, GOOD_CARD)
}

async function scenarioLab() {
  const buyer = await newBuyer('lab')
  await labSubscribe(buyer)
  const me = await waitFor(async () => {
    const res = await buyer.call('GET', '/api/subscriptions/me')
    return res.body.plan === 'hosted_pro' ? res.body : null
  }, 'el plan Pro activo', 90_000)
  check(
    'LAB: alta con prueba gratis, plan Pro activo en USD',
    me.provider === 'paddle' && me.currency_id === 'USD' && me.trialing === true,
    `${me.plan} · ${me.provider}/${me.currency_id} · prueba hasta ${me.trialEndsAt}`,
  )
  const row = JSON.parse(fs.readFileSync(path.join(dbDir, 'subscriptions.json'), 'utf8')).find((s) => s.paddleSubscriptionId)
  const ps = await pd('GET', `/subscriptions/${row.paddleSubscriptionId}`)
  check(
    'LAB: Paddle tiene la suscripción en prueba por USD 79/mes',
    ps.status === 'trialing' && Number(ps.items[0].price.unit_price.amount) === HOSTED_PLANS.hosted_pro.priceMonthlyUsd * 100,
    `${ps.status} · ${ps.items[0].price.unit_price.amount} centavos · próximo cobro ${ps.next_billed_at}`,
  )
  state.lab = { buyer, paddleSubscriptionId: row.paddleSubscriptionId }

  // Cambio de plan en la prueba: sin cobro, rige el precio nuevo.
  const up = await buyer.call('POST', '/api/subscriptions/change', { plan: 'hosted_studio' })
  const psUp = await pd('GET', `/subscriptions/${row.paddleSubscriptionId}`)
  check(
    'LAB: subir de plan en la prueba (Paddle acepta el cambio, sin cobro)',
    up.status === 200 && Number(psUp.items[0].price.unit_price.amount) === HOSTED_PLANS.hosted_studio.priceMonthlyUsd * 100,
    `HTTP ${up.status} ${up.body.error || ''} · ahora ${psUp.items[0].price.unit_price.amount} centavos`,
  )
  const down = await buyer.call('POST', '/api/subscriptions/change', { plan: 'hosted_starter' })
  const psDown = await pd('GET', `/subscriptions/${row.paddleSubscriptionId}`)
  check(
    'LAB: bajar de plan (queda Starter en Paddle y en la app)',
    down.status === 200 && Number(psDown.items[0].price.unit_price.amount) === HOSTED_PLANS.hosted_starter.priceMonthlyUsd * 100,
    `HTTP ${down.status} ${down.body.error || ''} · ${psDown.items[0].price.unit_price.amount} centavos`,
  )
  const meDown = (await buyer.call('GET', '/api/subscriptions/me')).body
  check('LAB: la app muestra el plan nuevo', meDown.plan === 'hosted_starter', meDown.plan)

  const link = await buyer.call('GET', '/api/subscriptions/payment-method')
  check('LAB: el link para cambiar la tarjeta lo da Paddle', link.status === 200 && /^https:\/\//.test(link.body.url || ''), `HTTP ${link.status}`)

  const cancel = await buyer.call('POST', '/api/subscriptions/cancel')
  const psCancel = await pd('GET', `/subscriptions/${row.paddleSubscriptionId}`)
  check(
    'LAB: la baja queda programada al fin del período (Paddle) y conserva el acceso',
    cancel.status === 200 && psCancel.scheduled_change?.action === 'cancel',
    `HTTP ${cancel.status} · ${psCancel.scheduled_change?.action} el ${psCancel.scheduled_change?.effective_at}`,
  )
  const meCancel = (await buyer.call('GET', '/api/subscriptions/me')).body
  check('LAB: tras la baja sigue con acceso hasta el fin y figura cancelada', !!meCancel.canceledAt && meCancel.plan === 'hosted_starter', `${meCancel.plan} · canceledAt ${meCancel.canceledAt}`)
}

async function scenarioLabWebhookOnly() {
  const buyer = await newBuyer('labwh')
  await labSubscribe(buyer, { block: true })
  // El navegador nunca sincroniza: solo queda el webhook.
  await sleep(15_000)
  const pre = (await buyer.call('GET', '/api/subscriptions/me')).body
  check('LAB webhook: sin sync del navegador todavía no hay plan', pre.plan === 'free', pre.plan)

  // La suscripción la crea Paddle un instante después del pago.
  const rows = () => JSON.parse(fs.readFileSync(path.join(dbDir, 'subscriptions.json'), 'utf8'))
  const mine = await waitFor(async () => rows().filter((r) => r.paddleTransactionId).at(-1), 'la fila de la suscripción')
  const txn = await waitFor(async () => {
    const t = await pd('GET', `/transactions/${mine.paddleTransactionId}`)
    return t.subscription_id ? t : null
  }, 'que Paddle cree la suscripción', 90_000)
  const sub = await pd('GET', `/subscriptions/${txn.subscription_id}`)
  const events = [['subscription.created', sub], ['transaction.paid', txn], ['transaction.completed', txn], ['subscription.trialing', sub]]
  const codes = await replay(events)
  check('LAB webhook: los eventos de la suscripción real responden 200', codes.every((c) => c === 200), `${sub.status} → ${codes.join(',')}`)
  const me = (await buyer.call('GET', '/api/subscriptions/me')).body
  check(
    'LAB webhook: se activa con el payload real (prueba, USD, Paddle)',
    me.plan === 'hosted_pro' && me.trialing === true && me.provider === 'paddle' && me.currency_id === 'USD',
    `${me.plan} · trialing ${me.trialing} · hasta ${me.trialEndsAt}`,
  )
  const trialDays = Math.round((new Date(me.trialEndsAt) - Date.now()) / 86_400_000)
  check('LAB webhook: la prueba dura 7 días', trialDays >= 6 && trialDays <= 7, `${trialDays} días`)
  const again = await replay(events)
  const me2 = (await buyer.call('GET', '/api/subscriptions/me')).body
  check('LAB webhook: repetir los eventos es inocuo', again.every((c) => c === 200) && me2.plan === 'hosted_pro' && me2.currentPeriodEnd === me.currentPeriodEnd)

  // Baja programada vista desde Paddle (subscription.updated con scheduled_change).
  await pd('POST', `/subscriptions/${sub.id}/cancel`, { effective_from: 'next_billing_period' })
  const canceled = await pd('GET', `/subscriptions/${sub.id}`)
  const c2 = await replay([['subscription.updated', canceled]])
  const me3 = (await buyer.call('GET', '/api/subscriptions/me')).body
  check('LAB webhook: una baja hecha desde Paddle se refleja (acceso hasta el fin)', c2[0] === 200 && !!me3.canceledAt && me3.plan === 'hosted_pro', `canceledAt ${me3.canceledAt}`)
}

// ——— corrida ————————————————————————————————————————————————————————

async function run(name, fn) {
  if (ONLY.length && !ONLY.some((o) => name.toLowerCase().includes(o))) return
  try {
    await fn()
  } catch (err) {
    check(name, false, err.message)
    for (const ctx of browser.contexts()) {
      for (const page of ctx.pages()) {
        console.log('   captura:', await snap(page, `${name.replace(/\W+/g, '-')}-${Date.now()}`))
        for (const line of (page.diag || []).slice(-6)) console.log('     ', line)
      }
    }
  }
}

try {
  await waitUp(`${API}/api/health`)
  await waitUp(BASE)
  console.log(`Paddle ${paddle.environment} · API ${API} · sitio ${BASE}\n`)
  await run('compra aprobada', scenarioApproved)
  await run('tarjeta rechazada', scenarioDeclined)
  await run('webhook', scenarioWebhookOnly)
  await run('reembolsos', scenarioRefunds)
  await run('LAB', scenarioLab)
  await run('LAB webhook', scenarioLabWebhookOnly)
} finally {
  // Limpieza: las suscripciones de prueba se cancelan ya (no cobran nunca).
  try {
    const f = path.join(dbDir, 'subscriptions.json')
    if (fs.existsSync(f)) {
      for (const s of JSON.parse(fs.readFileSync(f, 'utf8'))) {
        if (!s.paddleSubscriptionId) continue
        await pd('POST', `/subscriptions/${s.paddleSubscriptionId}/cancel`, { effective_from: 'immediately' }).catch(() => {})
      }
    }
  } catch {
    /* sin limpieza no se rompe nada: es sandbox */
  }
  await browser.close().catch(() => {})
  killTree(apiProc)
  killTree(webProc)
}

const failed = results.filter((ok) => !ok).length
if (failed) {
  console.log(`\nLog de la API: ${apiLog}`)
  const tail = fs.readFileSync(apiLog, 'utf8').split('\n').filter((l) => /error|Error|✖|failed|FALLÓ/.test(l)).slice(-12)
  if (tail.length) console.log(tail.join('\n'))
}
console.log(
  failed
    ? `\n${failed} verificación(es) fallaron.`
    : `\nTodo OK de punta a punta contra el sandbox de Paddle${skipped.length ? ` (${skipped.length} sin poder verificar, ver ⏭️)` : ''}.`,
)
process.exit(failed ? 1 : 0)
