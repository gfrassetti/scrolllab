import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import request from 'supertest'

describe('Subscriptions + cuota (file store, mock MP)', () => {
  let app
  let storageDir

  before(async () => {
    process.env.NODE_ENV = 'development'
    process.env.STORE = 'file'
    process.env.AUTH_DEV_ENABLED = 'true'
    process.env.MP_MOCK_ENABLED = 'true'
    process.env.SESSION_SECRET = 'test-session-secret-min-24-chars'
    process.env.DOWNLOAD_SECRET = 'test-download-secret-min-24-chars'
    process.env.CLIENT_URL = 'http://localhost:5173'
    process.env.API_PUBLIC_URL = 'http://localhost:8787'
    process.env.FX_OFFLINE = 'true'
    process.env.FX_FALLBACK_RATE = '1560'
    process.env.HOSTED_FREE_QUOTA = '1'
    process.env.RATE_LIMIT_DISABLED = 'true'
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-subs-'))
    process.env.STORAGE_DIR = storageDir
    process.env.FILE_DB_DIR = path.join(storageDir, 'db')

    const { loadConfig } = await import('../config.js')
    const config = loadConfig()
    config.storageDir = storageDir
    config.store = 'file'
    config.authDev = true
    config.mpMock = true

    const { createApp } = await import('../app.js')
    app = await createApp(config)
  })

  after(() => {
    try {
      fs.rmSync(storageDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  async function loginAs(email) {
    const agent = request.agent(app)
    await agent.post('/api/auth/dev-login').send({ email })
    return agent
  }

  const DAY = 86_400_000
  const daysFromNow = (n) => new Date(Date.now() + n * DAY).toISOString()

  async function patchSub(id, patch) {
    const { fileDb } = await import('../fileStore.js')
    const s = await fileDb.findSubscriptionById(id)
    Object.assign(s, patch)
    await s.save()
    return s
  }

  async function subRow(id) {
    const { fileDb } = await import('../fileStore.js')
    return fileDb.findSubscriptionById(id)
  }

  // Vencida hace un mes: más allá de cualquier gracia (1 día sin cobros, 7
  // con cobros). Es el "se cayó el plan" de verdad.
  const expireForGood = (id) => patchSub(id, { currentPeriodEnd: daysFromNow(-30) })

  async function publish(agent, sectionId = 'chapters/FooterCTA') {
    const created = await agent.post('/api/hosted').send({ sectionId })
    // Crear ya puede fallar (402) si el usuario free llegó a su tope — se
    // devuelve esa respuesta para que el test la vea como el bloqueo.
    if (created.status !== 201) return created
    return agent
      .put(`/api/hosted/${created.body.instance.id}`)
      .send({ draftProps: { ctaWord: 'X' }, publish: true })
  }

  it('plans es público y trae los 3 tiers', async () => {
    const res = await request(app).get('/api/subscriptions/plans')
    assert.equal(res.status, 200)
    assert.equal(res.body.plans.length, 3)
    assert.equal(res.body.mock, true)
    assert.ok(res.body.plans.every((p) => p.priceYearly < p.priceMonthly * 12))
  })

  it('sin suscripción: tier free con cuota = HOSTED_FREE_QUOTA', async () => {
    const agent = await loginAs('free@test.com')
    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'free')
    assert.equal(me.body.quota, 1)
  })

  it('crear sección: free llega hasta HOSTED_FREE_QUOTA, después 402; con plan se destraba', async () => {
    const agent = await loginAs('createlock@test.com')

    // free, 0 instancias, quota 1 → puede crear una
    const first = await agent
      .post('/api/hosted')
      .send({ sectionId: 'chapters/FooterCTA' })
    assert.equal(first.status, 201)

    // free, ya tiene 1 → 402 al crear otra
    const blocked = await agent
      .post('/api/hosted')
      .send({ sectionId: 'chapters/FooterCTA' })
    assert.equal(blocked.status, 402)
    assert.match(blocked.body.error, /[Ss]uscrib|[Ll][ií]mite/)

    // con plan activo → vuelve a crear
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)
    const afterSub = await agent
      .post('/api/hosted')
      .send({ sectionId: 'chapters/FooterCTA' })
    assert.equal(afterSub.status, 201)
  })

  it('prueba gratis: primera suscripción arranca en trial; cancelar y volver NO reabre la prueba ni cobra antes de tiempo', async () => {
    const agent = await loginAs('trial@test.com')

    // Antes de suscribirse: la prueba está disponible.
    let me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.trialAvailable, true)
    assert.equal(me.body.trialDays, 7)

    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.ok(sub.body.trialEndsAt) // el server lo devuelve en el alta
    await agent.post(sub.body.activateUrl)

    me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro')
    assert.equal(me.body.quota, 15) // entitlement plena durante la prueba
    assert.equal(me.body.trialing, true)
    assert.equal(me.body.trialAvailable, false) // ya no
    assert.ok(me.body.trialEndsAt)
    // El "período" corre hasta el fin de la prueba (~7 días), no un mes.
    const days =
      (new Date(me.body.currentPeriodEnd) - Date.now()) / 86_400_000
    assert.ok(days > 6 && days < 8, `esperaba ~7 días, dio ${days}`)

    // Cancela y vuelve a suscribirse → sin prueba esta vez. Tampoco se cobra
    // antes: el primer cobro de la nueva es cuando terminaba la prueba.
    const trialEnd = me.body.currentPeriodEnd
    await agent.post('/api/subscriptions/cancel')
    const again = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    assert.equal(again.body.trialEndsAt, null)
    assert.equal(
      new Date(again.body.firstChargeAt).toISOString(),
      new Date(trialEnd).toISOString(),
    )
    await agent.post(again.body.activateUrl)

    me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_starter')
    assert.equal(me.body.trialing, false)
    assert.equal(me.body.canceledAt, null) // la nueva no hereda la baja
    assert.equal(
      new Date(me.body.currentPeriodEnd).toISOString(),
      new Date(trialEnd).toISOString(),
    )
  })

  it('prueba vencida: 1 día de margen para el primer cobro; sin cobro → free', async () => {
    const agent = await loginAs('trialexp@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)

    // Recién vencida: MP está haciendo el primer cobro (~1 h) y el webhook
    // todavía no llegó. No se corta. (Fin de prueba = primer cobro = período.)
    const justEnded = new Date(Date.now() - 60_000).toISOString()
    await patchSub(sub.body.subscriptionId, {
      trialEndsAt: justEnded,
      firstChargeAt: justEnded,
      currentPeriodEnd: justEnded,
    })
    let me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro')
    assert.equal(me.body.pastDue, true)
    assert.equal(me.body.trialing, false)

    // Pasó el margen sin cobro → free.
    await patchSub(sub.body.subscriptionId, { currentPeriodEnd: daysFromNow(-2) })
    me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'free')
    assert.equal(me.body.lapsedPlan, 'hosted_pro')
    assert.equal(me.body.trialAvailable, false) // la prueba ya se usó
  })

  it('renovación sin cobrar: sigue HOSTED_GRACE_DAYS con aviso; pasada la gracia, free', async () => {
    const agent = await loginAs('grace@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)
    // Ya pagó un ciclo y MP no pudo cobrar el siguiente (reintenta 10 días).
    await patchSub(sub.body.subscriptionId, {
      trialEndsAt: undefined,
      firstChargeAt: undefined,
      lastPaidAt: daysFromNow(-33),
      currentPeriodEnd: daysFromNow(-3),
      paymentFailedAt: daysFromNow(-3),
    })

    let me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro')
    assert.equal(me.body.pastDue, true)
    assert.equal(me.body.paymentFailed, true)
    const graceLeft = (new Date(me.body.graceEndsAt) - Date.now()) / DAY
    // Default HOSTED_GRACE_DAYS = 7: venció hace 3 días, le quedan 4.
    assert.ok(graceLeft > 3.5 && graceLeft < 4.5, `gracia restante ${graceLeft}`)
    // En gracia no se puede subir de plan (sería cuota nueva sin cobro).
    const change = await agent
      .post('/api/subscriptions/change')
      .send({ plan: 'hosted_studio' })
    assert.equal(change.status, 409)

    await patchSub(sub.body.subscriptionId, { currentPeriodEnd: daysFromNow(-11) })
    me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'free')
    assert.equal(me.body.lapsedPlan, 'hosted_pro')
    assert.equal(me.body.paymentFailed, true)
    // No se marca `cancelled`: sigue abierta en MP y un reintento la revive.
    assert.equal((await subRow(sub.body.subscriptionId)).status, 'authorized')
  })

  it('suscripción en pausa: conserva lo pagado y lo muestra; al vencer, free', async () => {
    const agent = await loginAs('paused@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)
    await patchSub(sub.body.subscriptionId, {
      status: 'paused',
      currentPeriodEnd: daysFromNow(5),
    })

    let me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro')
    assert.equal(me.body.subscriptionStatus, 'paused')

    // Una pausa no se cobra sola: sin gracia.
    await patchSub(sub.body.subscriptionId, {
      currentPeriodEnd: new Date(Date.now() - 60_000).toISOString(),
    })
    me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'free')
    assert.equal(me.body.lapsedPlan, 'hosted_pro')
  })

  it('la cuota frena el 2do publish y la suscripción lo destraba', async () => {
    const agent = await loginAs('quota@test.com')

    const first = await publish(agent)
    assert.equal(first.status, 200)

    const second = await publish(agent)
    assert.equal(second.status, 402)

    // suscribir (mock) + activar
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(sub.body.mock, true)
    const act = await agent.post(sub.body.activateUrl)
    assert.equal(act.body.status, 'authorized')

    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro')
    assert.equal(me.body.quota, 15)

    const third = await publish(agent)
    assert.equal(third.status, 200)
  })

  // ——— Cuotas exactas por plan (lo que el cliente paga) ———

  async function fillPlan(email, plan, n) {
    const agent = await loginAs(email)
    const sub = await agent.post('/api/subscriptions').send({ plan, cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)
    const published = []
    for (let i = 0; i < n; i++) {
      const r = await publish(agent)
      assert.equal(r.status, 200, `publicación ${i + 1} de ${n}: ${JSON.stringify(r.body)}`)
      published.push(r.body.instance)
    }
    return { agent, published, sub }
  }

  const embedStatus = (key) =>
    request(app)
      .get(`/api/embed/${key}/config`)
      .then((r) => r.status)

  for (const [plan, quota] of [
    ['hosted_starter', 5],
    ['hosted_pro', 15],
  ]) {
    it(`${plan}: publica exactamente ${quota}, las ${quota} se sirven y la ${quota + 1}ª da 402`, async () => {
      const { agent, published } = await fillPlan(`exact-${plan}@test.com`, plan, quota)

      let me = await agent.get('/api/subscriptions/me')
      assert.equal(me.body.quota, quota)
      assert.equal(me.body.used, quota)
      assert.equal(me.body.canPublish, false)
      for (const inst of published) assert.equal(await embedStatus(inst.key), 200)

      const extra = await publish(agent)
      assert.equal(extra.status, 402)
      assert.match(extra.body.error, /límite de tu plan/)

      // Editar y re-publicar una que ya estaba publicada no suma, aun en el tope.
      const edit = await agent
        .put(`/api/hosted/${published[0].id}`)
        .send({ draftProps: { ctaWord: 'Editada' }, publish: true })
      assert.equal(edit.status, 200)

      // Despublicar una libera el lugar para otra.
      await agent.put(`/api/hosted/${published[1].id}`).send({ unpublish: true })
      me = await agent.get('/api/subscriptions/me')
      assert.equal(me.body.used, quota - 1)
      assert.equal((await publish(agent)).status, 200)
      assert.equal((await publish(agent)).status, 402)
    })
  }

  it('hosted_studio: sin tope (20 publicadas, todas se sirven)', async () => {
    const { agent, published } = await fillPlan('exact-studio@test.com', 'hosted_studio', 20)
    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.quota, null)
    assert.equal(me.body.used, 20)
    assert.equal(me.body.canPublish, true)
    for (const inst of published) assert.equal(await embedStatus(inst.key), 200)
  })

  it('aunque se cuele una publicada de más (p. ej. dos publish simultáneos), solo se sirven las N del plan', async () => {
    const { agent, published } = await fillPlan('race@test.com', 'hosted_starter', 5)
    const draft = await agent.post('/api/hosted').send({ sectionId: 'chapters/FooterCTA' })
    const { fileDb } = await import('../fileStore.js')
    const sixth = await fileDb.findHostedInstanceById(draft.body.instance.id)
    Object.assign(sixth, { status: 'published', publishedProps: { ctaWord: 'X' } })
    await sixth.save()

    for (const inst of published) assert.equal(await embedStatus(inst.key), 200)
    assert.equal(await embedStatus(sixth.key), 402)
  })

  it('studio es ilimitado: quota llega null y nunca frena el publish', async () => {
    const agent = await loginAs('studio@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_studio', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)

    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_studio')
    // Infinity no es JSON válido — el borde HTTP lo manda como null, nunca
    // como el número silenciosamente distinto que produce JSON.stringify.
    assert.equal(me.body.quota, null)
    assert.equal(me.body.canPublish, true)

    const first = await publish(agent, 'chapters/FooterCTA')
    assert.equal(first.status, 200)
    const second = await publish(agent, 'chapters/FooterCTA')
    assert.equal(second.status, 200)
  })

  it('cancelar mantiene el plan hasta fin de período', async () => {
    const agent = await loginAs('cancel@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'yearly' })
    await agent.post(sub.body.activateUrl)

    let me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_starter')

    const cancel = await agent.post('/api/subscriptions/cancel')
    assert.equal(cancel.status, 200)
    assert.ok(cancel.body.endsAt)

    // sigue con acceso — canceló pero pagó el período
    me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_starter')
    assert.ok(me.body.canceledAt)
    const paidUntil = me.body.currentPeriodEnd

    // y puede volver a suscribirse (la nueva reemplaza) sin pagar dos veces:
    // el primer cobro de la nueva es cuando termina lo ya pagado.
    const again = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(again.status, 200)
    assert.equal(again.body.trialEndsAt, null)
    assert.equal(
      new Date(again.body.firstChargeAt).toISOString(),
      new Date(paidUntil).toISOString(),
    )

    // Mientras la nueva no se completa, la vieja sigue cubriendo.
    me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_starter')

    await agent.post(again.body.activateUrl)
    me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro')
    assert.equal(me.body.canceledAt, null)
    assert.equal(
      new Date(me.body.currentPeriodEnd).toISOString(),
      new Date(paidUntil).toISOString(),
    )
    // La vieja quedó cerrada (la cubre la nueva).
    assert.equal((await subRow(sub.body.subscriptionId)).status, 'cancelled')
  })

  it('cancelar una suscripción caída (vencida sin cobro) la cierra en el acto', async () => {
    const agent = await loginAs('cancel-lapsed@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)
    await expireForGood(sub.body.subscriptionId)

    // Pasada la gracia se ve free, pero sigue abierta: se puede dar de baja.
    const cancel = await agent.post('/api/subscriptions/cancel')
    assert.equal(cancel.status, 200)
    assert.equal(cancel.body.status, 'cancelled')
    assert.equal(cancel.body.endsAt, null)
    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'free')
    assert.equal(me.body.lapsedPlan, null)
  })

  it('cambiar de plan en el acto: sube la cuota, misma suscripción, sin dar de baja', async () => {
    const agent = await loginAs('change@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)

    const change = await agent
      .post('/api/subscriptions/change')
      .send({ plan: 'hosted_pro' })
    assert.equal(change.status, 200)
    assert.equal(change.body.plan, 'hosted_pro')
    assert.equal(change.body.previousPlan, 'hosted_starter')
    assert.equal(change.body.quota, 15)

    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro')
    assert.equal(me.body.quota, 15)
    assert.equal(me.body.subscriptionId, sub.body.subscriptionId) // no se dio de baja
    assert.equal(me.body.canceledAt, null)
  })

  it('bajar de plan se bloquea si ya publicaste más de lo que el nuevo permite', async () => {
    // Studio (sin tope) → publicamos 6 → intentar bajar a Starter (tope 5) → 402.
    const agent = await loginAs('downgrade@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_studio', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)
    for (let i = 0; i < 6; i++) {
      const p = await publish(agent)
      assert.equal(p.status, 200)
    }

    const bad = await agent
      .post('/api/subscriptions/change')
      .send({ plan: 'hosted_starter' })
    assert.equal(bad.status, 402)
    assert.match(bad.body.error, /[Dd]espublic/)

    // Sigue en Studio, intacto.
    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_studio')
  })

  it('change: rechaza mismo plan, plan inválido y sin suscripción', async () => {
    const noSub = await loginAs('nosub-change@test.com')
    assert.equal(
      (await noSub.post('/api/subscriptions/change').send({ plan: 'hosted_pro' }))
        .status,
      404,
    )

    const agent = await loginAs('samep@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)

    assert.equal(
      (await agent.post('/api/subscriptions/change').send({ plan: 'hosted_pro' }))
        .status,
      409,
    )
    assert.equal(
      (await agent.post('/api/subscriptions/change').send({ plan: 'nope' }))
        .status,
      400,
    )
  })

  it('subir con días pagos pide pagar la diferencia: hasta que se paga sigue igual; pagada, sube (mock)', async () => {
    const agent = await loginAs('upgrade-mock@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)
    // Ya pagó un ciclo y le quedan 15 días.
    await patchSub(sub.body.subscriptionId, {
      trialEndsAt: undefined,
      firstChargeAt: undefined,
      lastPaidAt: daysFromNow(-15),
      paidPlan: 'hosted_starter',
      paidCycle: 'monthly',
      currentPeriodEnd: daysFromNow(15),
    })

    const quote = await agent.get('/api/subscriptions/change/quote?plan=hosted_pro')
    assert.equal(quote.status, 200)
    assert.equal(quote.body.direction, 'upgrade')
    assert.equal(quote.body.trialing, false)
    // 75.000 × 15 días de un mes de 28 a 31.
    assert.ok(quote.body.amount > 36000 && quote.body.amount < 40500, String(quote.body.amount))

    const change = await agent.post('/api/subscriptions/change').send({ plan: 'hosted_pro' })
    assert.equal(change.status, 200)
    assert.equal(change.body.requiresPayment, true)
    assert.equal(change.body.mock, true)
    assert.equal(change.body.amount, quote.body.amount)
    assert.equal((await agent.get('/api/subscriptions/me')).body.plan, 'hosted_starter')

    const paid = await agent.post(change.body.payUrl)
    assert.equal(paid.status, 200)
    assert.equal(paid.body.plan, 'hosted_pro')
    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_pro')
    assert.equal(me.body.quota, 15)
    // Ya no queda checkout abierto.
    assert.equal((await agent.post('/api/subscriptions/upgrade/mock-pay')).status, 404)
    // La confirmación contra MP no existe en mock.
    assert.equal(
      (await agent.post('/api/subscriptions/upgrade/confirm').send({ paymentId: '1' })).status,
      400,
    )
  })

  it('GET /api/hosted marca `frozen` en las publicadas que el plan dejó de cubrir', async () => {
    const agent = await loginAs('frozenlist@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)

    await publish(agent)
    await new Promise((r) => setTimeout(r, 5)) // createdAt distinto
    await publish(agent)

    const asc = (list) =>
      [...list.body.instances].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      )

    let list = await agent.get('/api/hosted')
    assert.deepEqual(
      asc(list).map((i) => i.frozen),
      [false, false],
    )
    // Con plan activo pero free_quota=1: la 2da se apagaría si cae el plan.
    assert.deepEqual(
      asc(list).map((i) => i.stopsOnPlanEnd),
      [false, true],
    )

    // vence el período (y la gracia) → cuota vuelve a 1 (HOSTED_FREE_QUOTA)
    await expireForGood(sub.body.subscriptionId)

    list = await agent.get('/api/hosted')
    assert.deepEqual(
      asc(list).map((i) => i.frozen),
      [false, true], // la más vieja sigue, la nueva se congela
    )
    // Ya congelada: el aviso previo deja de tener sentido.
    assert.deepEqual(
      asc(list).map((i) => i.stopsOnPlanEnd),
      [false, false],
    )
    // No se tocó el status guardado: siguen "published", no borradas.
    assert.deepEqual(
      asc(list).map((i) => i.status),
      ['published', 'published'],
    )

    // re-suscribirse las descongela sin más
    const again = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    await agent.post(again.body.activateUrl)
    list = await agent.get('/api/hosted')
    assert.deepEqual(
      asc(list).map((i) => i.frozen),
      [false, false],
    )
  })

  it('período vencido → vuelve a free (barrido perezoso)', async () => {
    const agent = await loginAs('expired@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    const { subscriptionId } = sub.body
    await agent.post(sub.body.activateUrl)

    await expireForGood(subscriptionId)

    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'free')
  })

  it('cancelada y vencida: el barrido la cierra (sin gracia)', async () => {
    const agent = await loginAs('expired-canceled@test.com')
    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)
    await agent.post('/api/subscriptions/cancel')
    await patchSub(sub.body.subscriptionId, {
      currentPeriodEnd: new Date(Date.now() - 60_000).toISOString(),
    })

    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'free')
    assert.equal(me.body.lapsedPlan, null)
    assert.equal((await subRow(sub.body.subscriptionId)).status, 'cancelled')
  })

  it('rechaza un plan inválido', async () => {
    const agent = await loginAs('bad@test.com')
    const res = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_ultra', cycle: 'monthly' })
    assert.equal(res.status, 400)
  })

  it('no acumula altas: un 2do POST sin completar reemplaza al primero (sin bloquear ni quemar la prueba)', async () => {
    const agent = await loginAs('dedup@test.com')
    const a = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(a.status, 200)
    // Tarjeta rechazada en MP / checkout abandonado → vuelve a intentar ya.
    const b = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'yearly' })
    assert.equal(b.status, 200)
    assert.ok(b.body.trialEndsAt, 'un alta abandonada no consume la prueba')

    const first = await subRow(a.body.subscriptionId)
    assert.equal(first.status, 'pending')
    assert.ok(first.abandonedAt)
    const { fileDb } = await import('../fileStore.js')
    const live = (await fileDb.findSubscriptionsByUser(first.userId)).filter(
      (s) => s.status === 'pending' && !s.abandonedAt,
    )
    assert.equal(live.length, 1)

    // El link viejo ya no sirve para activar nada (en MP quedó cancelado).
    const stale = await agent.post(a.body.activateUrl)
    assert.equal(stale.status, 409)
    await agent.post(b.body.activateUrl)
    const me = await agent.get('/api/subscriptions/me')
    assert.equal(me.body.plan, 'hosted_starter')
  })

  it('con suscripción activa, otro POST → 409', async () => {
    const agent = await loginAs('active409@test.com')
    const a = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    await agent.post(a.body.activateUrl)
    const b = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    assert.equal(b.status, 409)
  })

  it('sync está deshabilitado en modo mock → 403', async () => {
    const agent = await loginAs('syncmock@test.com')
    const res = await agent.post('/api/subscriptions/sync')
    assert.equal(res.status, 403)
  })

  // Webhook: la URL es la misma que Checkout Pro, ramifica por `type`. Acá el
  // token de subs no está seteado → la rama de subs corta en 200 antes de la
  // firma. Lo que se verifica es el ROUTING: un topic de subs no cae en la
  // rama de `payment` ni tira 500.
  it('webhook: topic de suscripción no cae en la rama de pago (200)', async () => {
    for (const type of [
      'subscription_preapproval',
      'subscription_authorized_payment',
    ]) {
      const res = await request(app)
        .post(`/api/webhooks/mercadopago?type=${type}&data.id=abc123`)
        .send({})
      assert.equal(res.status, 200, type)
    }
  })

  it('webhook: sin data.id → 200 sin procesar', async () => {
    const res = await request(app)
      .post('/api/webhooks/mercadopago?type=subscription_preapproval')
      .send({})
    assert.equal(res.status, 200)
  })

  it('webhook: type=payment sigue respondiendo 200 (mock)', async () => {
    const res = await request(app)
      .post('/api/webhooks/mercadopago?type=payment&data.id=1')
      .send({})
    assert.equal(res.status, 200)
  })

  it('cuando cae el plan, las publicadas sobre el tope free dejan de servir', async () => {
    const agent = await loginAs('freeze@test.com')

    const sub = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_pro', cycle: 'monthly' })
    await agent.post(sub.body.activateUrl)

    const a = await publish(agent)
    const b = await publish(agent)
    assert.equal(a.status, 200)
    assert.equal(b.status, 200)
    const keyA = a.body.instance.key
    const keyB = b.body.instance.key

    // con plan activo, las dos sirven
    assert.equal((await request(app).get(`/api/embed/${keyA}/config`)).status, 200)
    assert.equal((await request(app).get(`/api/embed/${keyB}/config`)).status, 200)

    // vence el período, y la gracia → vuelve a free (quota = 1)
    await expireForGood(sub.body.subscriptionId)

    // la más vieja queda cubierta, la nueva se congela (402, como suspendida)
    assert.equal((await request(app).get(`/api/embed/${keyA}/config`)).status, 200)
    assert.equal((await request(app).get(`/api/embed/${keyB}/config`)).status, 402)

    // re-suscribirse las revive sin tocar nada más
    const again = await agent
      .post('/api/subscriptions')
      .send({ plan: 'hosted_starter', cycle: 'monthly' })
    await agent.post(again.body.activateUrl)
    assert.equal((await request(app).get(`/api/embed/${keyB}/config`)).status, 200)
  })
})
