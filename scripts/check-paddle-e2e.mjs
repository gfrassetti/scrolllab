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
 *  4. Reembolso total desde Paddle: llega `adjustment.*` y la orden se corta.
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

async function scenarioRefund() {
  const order = state.okOrder
  if (!order) return skip('reembolso', 'no hubo compra aprobada')
  // Paddle solo reembolsa transacciones ya completadas (pasan de «paid» a «completed» al rato).
  const txn = await waitFor(async () => {
    const t = await pd('GET', `/transactions/${state.okTxn.id}`)
    return t.status === 'completed' ? t : null
  }, 'que Paddle complete la transacción', 240_000).catch(() => null)
  if (!txn) return skip('reembolso', 'Paddle tardó en pasar la transacción a «completed»')
  let adj
  try {
    adj = await pd('POST', '/adjustments', {
      action: 'refund',
      type: 'full',
      reason: 'error',
      transaction_id: txn.id,
    })
  } catch (err) {
    return skip('reembolso', `Paddle no dejó crearlo desde la API: ${err.message}`)
  }
  // Paddle aprueba los reembolsos aparte (a mano): en sandbox suele quedar «pending_approval».
  const settled = await waitFor(async () => {
    const list = await pd('GET', `/adjustments?id=${adj.id}`)
    const a = list[0]
    return a && a.status !== 'pending_approval' ? a : null
  }, 'que Paddle apruebe el reembolso', 45_000).catch(() => null)
  const real = settled || (await pd('GET', `/adjustments?id=${adj.id}`))[0] || adj
  const approvedByPaddle = real.status === 'approved'

  // 1) Con el ajuste REAL todavía pendiente, la orden no se corta antes de tiempo.
  if (!approvedByPaddle) {
    const pendingCodes = await replay([['adjustment.created', real]])
    const [stillPaid] = await myOrders(state.ok)
    const dl0 = await state.ok.call('GET', `/api/orders/${stillPaid.id}/download`)
    check(
      'reembolso: pendiente de aprobación, la orden sigue paga y se descarga',
      pendingCodes[0] === 200 && stillPaid.status === 'paid' && dl0.status === 200,
      `${real.status} → orden ${stillPaid.status}, descarga HTTP ${dl0.status}`,
    )
  }
  // 2) Aprobado (el de Paddle, o su payload real con la aprobación simulada).
  const approved = approvedByPaddle ? real : { ...real, status: 'approved' }
  const codes = await replay([['adjustment.updated', approved]])
  check(
    `reembolso: adjustment.updated aprobado responde 200${approvedByPaddle ? '' : ' (aprobación simulada sobre el payload real)'}`,
    codes[0] === 200,
    `${real.action} ${real.type} → ${codes.join(',')}`,
  )
  const [refunded] = await myOrders(state.ok)
  check('reembolso: la orden pasa a refunded', refunded.status === 'refunded', refunded.status)
  const dl = await state.ok.call('GET', `/api/orders/${refunded.id}/download`)
  check('reembolso: la descarga queda cortada', dl.status >= 400, `HTTP ${dl.status}`)
  // Los eventos repetidos no reabren nada.
  await replay([['adjustment.updated', approved]])
  const [again] = await myOrders(state.ok)
  check('reembolso: repetir el evento es inocuo', again.status === 'refunded', again.status)
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
  await run('reembolso', scenarioRefund)
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
