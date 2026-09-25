import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { installBrowserStorageMocks } from './storageMock.js'

installBrowserStorageMocks()
// gtm.js escribe en window.dataLayer: en Node se lo inventamos para ver qué se manda.
globalThis.window = globalThis.window || globalThis
globalThis.window.dataLayer = []

const { fetchWelcomeCoupon, useWelcomeCoupon } = await import('../welcomeCoupon.js')

const COUPON = { code: 'SL-ABC234', percent: 10, expiresAt: '2026-10-02T15:00:00Z', emailHint: 'a***@gmail.com' }
const respond = (data) => async () => data
const events = () => globalThis.window.dataLayer.filter((e) => e.event === 'generate_lead')

describe('fetchWelcomeCoupon', () => {
  it('manda el idioma y el canal de origen (utm), y se queda solo con lo que se muestra', async () => {
    let sent
    const out = await fetchWelcomeCoupon({
      locale: 'en',
      utm: { source: 'instagram' },
      post: async (body) => {
        sent = body
        return { ok: true, coupon: COUPON, created: true }
      },
    })
    assert.deepEqual(sent, { locale: 'en', utm: { source: 'instagram' } })
    assert.deepEqual(out, {
      coupon: { code: 'SL-ABC234', percent: 10, expiresAt: '2026-10-02T15:00:00Z' },
      created: true,
    })
  })

  it('cualquier idioma raro cae en español', async () => {
    let sent
    await fetchWelcomeCoupon({ locale: 'fr', utm: null, post: async (body) => ((sent = body), {}) })
    assert.equal(sent.locale, 'es')
  })

  it('sin cupón vigente (ya compró, lo usó o venció) devuelve null', async () => {
    for (const data of [{ coupon: null }, {}, null, { coupon: {} }]) {
      const out = await fetchWelcomeCoupon({ post: respond(data), utm: null })
      assert.equal(out.coupon, null, JSON.stringify(data))
      assert.equal(out.created, false)
    }
  })
})

describe('useWelcomeCoupon', () => {
  beforeEach(() => {
    useWelcomeCoupon.getState().clear()
    globalThis.window.dataLayer.length = 0
  })

  it('arranca vacío y sin pedir nada', () => {
    const s = useWelcomeCoupon.getState()
    assert.deepEqual([s.userId, s.status, s.coupon], [null, 'idle', null])
  })

  it('load guarda el cupón de la cuenta y pasa a "ready"', async () => {
    await useWelcomeCoupon.getState().load('u1', { post: respond({ coupon: COUPON, created: false }) })
    const s = useWelcomeCoupon.getState()
    assert.equal(s.status, 'ready')
    assert.equal(s.userId, 'u1')
    assert.equal(s.coupon.code, 'SL-ABC234')
    assert.equal(s.coupon.emailHint, undefined)
  })

  it('pide una sola vez por usuario aunque se llame de más (cambiar de idioma, varios componentes)', async () => {
    let calls = 0
    const post = async () => ((calls += 1), { coupon: COUPON })
    const { load } = useWelcomeCoupon.getState()
    await Promise.all([load('u1', { post }), load('u1', { post }), load('u1', { post })])
    await load('u1', { post })
    assert.equal(calls, 1)
  })

  it('avisa a GTM (generate_lead) solo cuando el servidor lo creó recién', async () => {
    await useWelcomeCoupon.getState().load('u1', { post: respond({ coupon: COUPON, created: true }) })
    assert.equal(events().length, 1)
    assert.equal(events()[0].lead_source, 'account')

    useWelcomeCoupon.getState().clear()
    await useWelcomeCoupon.getState().load('u1', { post: respond({ coupon: COUPON, created: false }) })
    assert.equal(events().length, 1)
  })

  it('si el servidor falla, sigue sin cupón y "ready": el carrito no se queda esperando', async () => {
    await useWelcomeCoupon.getState().load('u1', {
      post: async () => {
        throw new Error('500')
      },
    })
    const s = useWelcomeCoupon.getState()
    assert.deepEqual([s.status, s.coupon], ['ready', null])
  })

  it('si cambia de cuenta mientras espera, no mezcla el cupón de la anterior', async () => {
    let release
    const slow = () => new Promise((resolve) => (release = () => resolve({ coupon: COUPON })))
    const first = useWelcomeCoupon.getState().load('u1', { post: slow })
    // Entra con otra cuenta antes de que conteste la primera.
    useWelcomeCoupon.getState().clear()
    await useWelcomeCoupon.getState().load('u2', { post: respond({ coupon: null }) })
    release()
    await first
    const s = useWelcomeCoupon.getState()
    assert.equal(s.userId, 'u2')
    assert.equal(s.coupon, null)
  })

  it('sin usuario no hace nada; clear borra todo; drop saca solo el cupón', async () => {
    await useWelcomeCoupon.getState().load(null, { post: () => assert.fail('no debería pedir') })
    assert.equal(useWelcomeCoupon.getState().status, 'idle')

    await useWelcomeCoupon.getState().load('u1', { post: respond({ coupon: COUPON }) })
    useWelcomeCoupon.getState().drop()
    assert.deepEqual(
      [useWelcomeCoupon.getState().coupon, useWelcomeCoupon.getState().status],
      [null, 'ready'],
    )
    useWelcomeCoupon.getState().clear()
    assert.deepEqual(
      [useWelcomeCoupon.getState().userId, useWelcomeCoupon.getState().status],
      [null, 'idle'],
    )
  })
})
