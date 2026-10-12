import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Contrato de los repositorios: lo que `db` (server/db.js) tiene que hacer igual
 * con el almacén de archivos (desarrollo) y con Mongo (producción). Los mismos
 * casos corren contra los dos (repoContract.file.test.js / .mongo.test.js).
 *
 * Los valores esperados son los de Mongo: es lo que corre en producción. Si el
 * almacén de archivos se aparta, el test lo dice (y se arregla el de archivos).
 *
 * @param {{ db: any, setRaw: (entity: 'order' | 'subscription', id: string, patch: object) => Promise<void> }} ctx
 */
export function defineRepoContract(ctx) {
  const { db } = ctx
  let n = 0
  const uniq = (p = 'x') => `${p}-${Date.now().toString(36)}-${++n}`
  const id = (doc) => db.uid(doc) || doc?.id
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  async function newUser() {
    return db.createUser({ email: `${uniq('u')}@contract.test`, name: 'Contrato', googleId: uniq('g') })
  }

  async function newOrder(user, extra = {}) {
    return db.createOrder({
      userId: id(user),
      status: 'pending',
      items: [{ sku: 'chapters', title: 'CHAPTERS', unit_price: 149, currency_id: 'USD' }],
      total: 149,
      currency_id: 'USD',
      provider: 'mercadopago',
      ...extra,
    })
  }

  async function paidOrder(user, extra = {}) {
    const o = await newOrder(user, extra)
    const { order } = await db.markOrderPaidAtomic({ orderId: id(o), mpPaymentId: uniq('pay') })
    return order
  }

  async function newSub(user, extra = {}) {
    return db.createSubscription({
      userId: id(user),
      plan: 'hosted_pro',
      cycle: 'monthly',
      status: 'authorized',
      ...extra,
    })
  }

  // ——————————————————————————— Órdenes ———————————————————————————
  describe('órdenes', () => {
    it('crea, busca por id y lista las del usuario de la más nueva a la más vieja', async () => {
      const user = await newUser()
      const a = await newOrder(user, { total: 1 })
      await sleep(15)
      const b = await newOrder(user, { total: 2 })
      assert.equal((await db.findOrderById(id(a))).total, 1)
      const list = await db.findOrdersByUser(id(user))
      assert.deepEqual(list.map((o) => o.total), [2, 1])
      assert.equal(await db.findOrderById('f'.repeat(24)), null)
      void b
    })

    it('markOrderPaidAtomic (Mercado Pago): paga una vez, guarda el pago y saca el vencimiento', async () => {
      const user = await newUser()
      const o = await newOrder(user, { expiresAt: new Date(Date.now() + 3600_000) })
      const pay = uniq('mp')
      const first = await db.markOrderPaidAtomic({ orderId: id(o), mpPaymentId: pay })
      assert.equal(first.created, true)
      assert.equal(first.order.status, 'paid')
      assert.equal(first.order.mpPaymentId, pay)
      assert.ok(first.order.paidAt, 'paidAt')
      assert.equal(first.order.expiresAt ?? null, null, 'una orden paga no vence')

      const again = await db.markOrderPaidAtomic({ orderId: id(o), mpPaymentId: pay })
      assert.equal(again.created, false)
      assert.equal(again.order.status, 'paid')

      const none = await db.markOrderPaidAtomic({ orderId: 'f'.repeat(24), mpPaymentId: uniq('mp') })
      assert.equal(none.order, null)
      assert.equal(none.created, false)
    })

    it('un pago ya usado en otra orden no la paga: devuelve la que ese pago ya pagó', async () => {
      const user = await newUser()
      const first = await newOrder(user)
      const second = await newOrder(user)
      const pay = uniq('mp')
      await db.markOrderPaidAtomic({ orderId: id(first), mpPaymentId: pay })

      const out = await db.markOrderPaidAtomic({ orderId: id(second), mpPaymentId: pay })
      assert.equal(out.created, false)
      assert.equal(String(id(out.order)), String(id(first)))
      assert.equal((await db.findOrderById(id(second))).status, 'pending')
    })

    it('markOrderPaidAtomic (Paddle): solo la transacción que abrió el checkout paga la orden', async () => {
      const user = await newUser()
      const txn = uniq('txn')
      const o = await newOrder(user, { provider: 'paddle', paddleTransactionId: txn })

      const wrong = await db.markOrderPaidAtomic({ orderId: id(o), paddleTransactionId: uniq('txn') })
      assert.equal(wrong.created, false)
      assert.equal((await db.findOrderById(id(o))).status, 'pending')

      const right = await db.markOrderPaidAtomic({ orderId: id(o), paddleTransactionId: txn })
      assert.equal(right.created, true)
      assert.equal(right.order.status, 'paid')
      assert.equal(right.order.paddleTransactionId, txn)
      assert.equal(right.order.mpPaymentId ?? null, null)
      assert.ok(right.order.paidAt)

      assert.equal(String(id(await db.findOrderByPaddleTransaction(txn))), String(id(o)))
      assert.equal(await db.findOrderByPaddleTransaction(uniq('nada')), null)
    })

    it('dos órdenes no pueden compartir la misma transacción de Paddle ni el mismo pago de MP', async () => {
      const user = await newUser()
      const txn = uniq('txn')
      await newOrder(user, { provider: 'paddle', paddleTransactionId: txn })
      await assert.rejects(newOrder(user, { provider: 'paddle', paddleTransactionId: txn }))

      const pay = uniq('mp')
      const a = await newOrder(user, { mpPaymentId: pay })
      assert.ok(a)
      await assert.rejects(newOrder(user, { mpPaymentId: pay }))

      // Sin transacción / sin pago no chocan entre sí (índice sparse).
      await newOrder(user)
      await newOrder(user)
    })

    it('markOrderRefundedAtomic: solo da vuelta una orden paga, y solo por el pago que la pagó', async () => {
      const user = await newUser()
      const o = await newOrder(user)
      const pay = uniq('mp')
      assert.equal(await db.markOrderRefundedAtomic({ orderId: id(o), mpPaymentId: pay, reason: 'refunded' }), null)

      await db.markOrderPaidAtomic({ orderId: id(o), mpPaymentId: pay })
      assert.equal(
        await db.markOrderRefundedAtomic({ orderId: id(o), mpPaymentId: uniq('otro'), reason: 'refunded' }),
        null,
        'el reembolso de otro pago no toca la orden',
      )
      const done = await db.markOrderRefundedAtomic({ orderId: id(o), mpPaymentId: pay, reason: 'charged_back' })
      assert.equal(done.status, 'refunded')
      assert.equal(done.refundReason, 'charged_back')
      assert.ok(done.refundedAt)
      assert.equal(await db.markOrderRefundedAtomic({ orderId: id(o), mpPaymentId: pay, reason: 'refunded' }), null)
    })

    it('consumeDownloadAtomic: solo las pagas, con tope, y lleva el log', async () => {
      const user = await newUser()
      const pending = await newOrder(user)
      assert.equal(await db.consumeDownloadAtomic(id(pending), 5), null)

      const paid = await paidOrder(user)
      const one = await db.consumeDownloadAtomic(id(paid), 2, { ip: '1.2.3.4' })
      assert.equal(one.downloadCount, 1)
      assert.equal(one.downloads.length, 1)
      assert.equal(one.downloads[0].ip, '1.2.3.4')
      assert.equal((await db.consumeDownloadAtomic(id(paid), 2)).downloadCount, 2)
      assert.equal(await db.consumeDownloadAtomic(id(paid), 2), null, 'tope alcanzado')

      const open = await paidOrder(user)
      for (let i = 0; i < 3; i++) assert.ok(await db.consumeDownloadAtomic(id(open), 0), 'sin tope')
      assert.equal((await db.findOrderById(id(open))).downloadCount, 3)
    })

    it('recibo: claim → complete es una vez; release lo deja reclamable; un claim viejo se retoma', async () => {
      const user = await newUser()
      const pending = await newOrder(user)
      assert.equal(await db.claimReceiptEmail(id(pending)), null, 'pendiente: no hay recibo')

      const o = await paidOrder(user)
      const claimed = await db.claimReceiptEmail(id(o))
      assert.ok(claimed?.receiptEmailSendingAt)
      assert.equal(await db.claimReceiptEmail(id(o)), null, 'ya lo está mandando otro')

      await db.releaseReceiptEmail(id(o), 'Resend caído')
      const released = await db.findOrderById(id(o))
      assert.equal(released.receiptEmailError, 'Resend caído')
      assert.equal(released.receiptEmailSendingAt ?? null, null)

      assert.ok(await db.claimReceiptEmail(id(o)), 'después de soltarlo se puede reclamar')
      const done = await db.completeReceiptEmail(id(o), 'em_1')
      assert.ok(done.receiptEmailSentAt)
      assert.equal(done.receiptEmailId, 'em_1')
      assert.equal(await db.claimReceiptEmail(id(o)), null, 'ya salió')

      // Un claim de hace 11 minutos (el proceso murió) se retoma.
      const stale = await paidOrder(user)
      await db.claimReceiptEmail(id(stale))
      await ctx.setRaw('order', id(stale), { receiptEmailSendingAt: new Date(Date.now() - 11 * 60_000) })
      assert.ok(await db.claimReceiptEmail(id(stale)))
    })

    it('pago rechazado: se anota solo en pendientes, el aviso sale una vez y el barrido lo encuentra', async () => {
      const user = await newUser()
      const paid = await paidOrder(user)
      assert.equal(await db.markOrderPaymentFailed(id(paid)), null)

      const o = await newOrder(user)
      const marked = await db.markOrderPaymentFailed(id(o))
      assert.ok(marked.paymentFailedAt)

      const later = new Date(Date.now() + 60_000)
      const due = (await db.listFailedOrdersDue({ before: later })).map((x) => String(id(x)))
      assert.ok(due.includes(String(id(o))))
      assert.ok(!due.includes(String(id(paid))))
      assert.ok(
        !(await db.listFailedOrdersDue({ before: new Date(Date.now() - 60_000) })).some(
          (x) => String(id(x)) === String(id(o)),
        ),
        'todavía no pasó el rato',
      )

      assert.ok(await db.claimFailedEmail(id(o)))
      assert.equal(await db.claimFailedEmail(id(o)), null)
      await db.releaseFailedEmail(id(o), 'falló')
      assert.ok(await db.claimFailedEmail(id(o)))
      await db.completeFailedEmail(id(o), 'em_f')
      assert.equal(await db.claimFailedEmail(id(o)), null)
      const gone = (await db.listFailedOrdersDue({ before: later })).map((x) => String(id(x)))
      assert.ok(!gone.includes(String(id(o))), 'con el mail enviado ya no está')
    })

    it('listPaidOrdersWithoutReceipt: pagas en la ventana y sin recibo', async () => {
      const user = await newUser()
      const o = await paidOrder(user)
      const since = new Date(Date.now() - 60_000)
      const before = new Date(Date.now() + 60_000)
      const ids = async () =>
        (await db.listPaidOrdersWithoutReceipt({ since, before })).map((x) => String(id(x)))
      assert.ok((await ids()).includes(String(id(o))))
      await db.claimReceiptEmail(id(o))
      await db.completeReceiptEmail(id(o), 'em_ok')
      assert.ok(!(await ids()).includes(String(id(o))), 'con el recibo enviado ya no')
      const pending = await newOrder(user)
      assert.ok(!(await ids()).includes(String(id(pending))), 'una pendiente no es una paga')
    })

    it('deletePendingOrder: borra solo una que nunca se cobró', async () => {
      const user = await newUser()
      const p = await newOrder(user)
      assert.equal(await db.deletePendingOrder(id(p)), true)
      assert.equal(await db.findOrderById(id(p)), null)
      assert.equal(await db.deletePendingOrder(id(p)), false)

      const paid = await paidOrder(user)
      assert.equal(await db.deletePendingOrder(id(paid)), false)
      assert.ok(await db.findOrderById(id(paid)))
    })

    it('setOrderZipPath guarda la ruta, la versión y la fecha de licencia', async () => {
      const user = await newUser()
      const o = await paidOrder(user)
      const out = await db.setOrderZipPath(id(o), '/storage/o.zip', { zipVersion: 9, licenseDate: '2026-10-01' })
      assert.equal(out.zipPath, '/storage/o.zip')
      assert.equal(out.zipVersion, 9)
      assert.equal(out.licenseDate, '2026-10-01')
      assert.equal(await db.setOrderZipPath('f'.repeat(24), '/x.zip'), null)
    })
  })

  // ————————————————————— Suscripciones de LAB —————————————————————
  describe('suscripciones', () => {
    it('la vigente es la más nueva authorized/paused; las demás no cuentan', async () => {
      const user = await newUser()
      await newSub(user, { status: 'cancelled', plan: 'hosted_starter' })
      await sleep(15)
      const auth = await newSub(user, { status: 'authorized', plan: 'hosted_pro' })
      await sleep(15)
      await newSub(user, { status: 'pending', plan: 'hosted_studio' })
      assert.equal(String(id(await db.findActiveSubscriptionByUser(id(user)))), String(id(auth)))

      await sleep(15)
      const paused = await newSub(user, { status: 'paused', plan: 'hosted_starter' })
      assert.equal(String(id(await db.findActiveSubscriptionByUser(id(user)))), String(id(paused)))

      const all = await db.findSubscriptionsByUser(id(user))
      assert.equal(all.length, 4)
      assert.equal(all[0].status, 'paused', 'de la más nueva a la más vieja')
      assert.equal(await db.findActiveSubscriptionByUser(id(await newUser())), null)
    })

    it('se busca por preapproval de MP y por suscripción o transacción de Paddle', async () => {
      const user = await newUser()
      const pre = uniq('pre')
      const mp = await newSub(user, { mpPreapprovalId: pre })
      assert.equal(String(id(await db.findSubscriptionByPreapproval(pre))), String(id(mp)))
      assert.equal(await db.findSubscriptionByPreapproval(uniq('nada')), null)

      const psub = uniq('sub')
      const ptxn = uniq('txn')
      const pd = await newSub(user, { provider: 'paddle', paddleSubscriptionId: psub, paddleTransactionId: ptxn })
      assert.equal(String((id(await db.findSubscriptionByPaddle({ subscriptionId: psub })))), String(id(pd)))
      assert.equal(String((id(await db.findSubscriptionByPaddle({ transactionId: ptxn })))), String(id(pd)))
      assert.equal(
        String((id(await db.findSubscriptionByPaddle({ subscriptionId: uniq('x'), transactionId: ptxn })))),
        String(id(pd)),
        'sin la suscripción, cae a la transacción del alta',
      )
      assert.equal(await db.findSubscriptionByPaddle({ subscriptionId: null, transactionId: null }), null)
    })

    it('deleteSubscription borra una vez', async () => {
      const user = await newUser()
      const s = await newSub(user)
      assert.equal(await db.deleteSubscription(id(s)), true)
      assert.equal(await db.findSubscriptionById(id(s)), null)
      assert.equal(await db.deleteSubscription(id(s)), false)
    })

    it('mail de bienvenida: solo authorized, una vez, soltable', async () => {
      const user = await newUser()
      const pending = await newSub(user, { status: 'pending' })
      assert.equal(await db.claimSubscriptionEmail(id(pending), 'welcome'), null)

      const s = await newSub(user)
      assert.ok(await db.claimSubscriptionEmail(id(s), 'welcome'))
      assert.equal(await db.claimSubscriptionEmail(id(s), 'welcome'), null, 'en curso')
      await db.releaseSubscriptionEmail(id(s), 'welcome', 'falló')
      assert.ok(await db.claimSubscriptionEmail(id(s), 'welcome'))
      const done = await db.completeSubscriptionEmail(id(s), 'welcome', 'em_w')
      assert.ok(done.welcomeEmailSentAt)
      assert.equal(await db.claimSubscriptionEmail(id(s), 'welcome'), null, 'ya salió')
    })

    it('mail de baja: solo con canceledAt', async () => {
      const user = await newUser()
      const s = await newSub(user)
      assert.equal(await db.claimSubscriptionEmail(id(s), 'canceled'), null)
      await ctx.setRaw('subscription', id(s), { canceledAt: new Date() })
      assert.ok(await db.claimSubscriptionEmail(id(s), 'canceled'))
    })

    it('mails por cobro (charge / paymentFailed): uno por ref, y soltar permite reintentar el mismo', async () => {
      const user = await newUser()
      const s = await newSub(user)
      assert.equal(await db.claimSubscriptionEmail(id(s), 'charge'), null, 'sin ref no hay claim')
      assert.ok(await db.claimSubscriptionEmail(id(s), 'charge', { ref: 'c1' }))
      assert.equal(await db.claimSubscriptionEmail(id(s), 'charge', { ref: 'c1' }), null, 'mismo cobro')
      assert.equal(await db.claimSubscriptionEmail(id(s), 'charge', { ref: 'c2' }), null, 'c1 todavía en curso')
      await db.completeSubscriptionEmail(id(s), 'charge', 'em_c1')
      assert.equal(await db.claimSubscriptionEmail(id(s), 'charge', { ref: 'c1' }), null, 'c1 ya salió')
      assert.ok(await db.claimSubscriptionEmail(id(s), 'charge', { ref: 'c2' }), 'otro cobro sí')

      await db.releaseSubscriptionEmail(id(s), 'charge', 'falló')
      assert.ok(await db.claimSubscriptionEmail(id(s), 'charge', { ref: 'c2' }), 'el mismo cobro se reintenta')

      assert.ok(await db.claimSubscriptionEmail(id(s), 'paymentFailed', { ref: 'f1' }))
      assert.equal(await db.claimSubscriptionEmail(id(s), 'paymentFailed', { ref: 'f1' }), null)
    })

    it('aviso antes del primer cobro: dentro de la ventana, sin pago ni baja, y los candidatos coinciden', async () => {
      const user = await newUser()
      const now = new Date()
      const day = 86_400_000
      const mk = (extra) => newSub(user, { trialEndsAt: new Date(now.getTime() + 2 * day), ...extra })
      const due = await mk({})
      const paid = await mk({ lastPaidAt: new Date() })
      const canceled = await mk({ canceledAt: new Date() })
      const far = await mk({ trialEndsAt: new Date(now.getTime() + 10 * day) })

      assert.equal(await db.claimSubscriptionEmail(id(due), 'trialReminder'), null, 'sin ventana no hay claim')
      assert.equal(await db.claimSubscriptionEmail(id(paid), 'trialReminder', { withinMs: 3 * day, now }), null)
      assert.equal(await db.claimSubscriptionEmail(id(canceled), 'trialReminder', { withinMs: 3 * day, now }), null)
      assert.equal(await db.claimSubscriptionEmail(id(far), 'trialReminder', { withinMs: 3 * day, now }), null)

      const cands = (await db.listTrialReminderCandidates({ now, withinMs: 3 * day })).map((x) => String(id(x)))
      assert.ok(cands.includes(String(id(due))))
      for (const s of [paid, canceled, far]) assert.ok(!cands.includes(String(id(s))))

      assert.ok(await db.claimSubscriptionEmail(id(due), 'trialReminder', { withinMs: 3 * day, now }))
      await db.completeSubscriptionEmail(id(due), 'trialReminder', 'em_t')
      const after = (await db.listTrialReminderCandidates({ now, withinMs: 3 * day })).map((x) => String(id(x)))
      assert.ok(!after.includes(String(id(due))), 'avisada: ya no es candidata')
    })

    it('altas rechazadas pendientes de aviso (listCheckoutFailuresDue)', async () => {
      const user = await newUser()
      const before = new Date(Date.now() + 60_000)
      const failed = await newSub(user, { status: 'pending', paymentFailedAt: new Date() })
      const abandoned = await newSub(user, { status: 'pending', paymentFailedAt: new Date(), abandonedAt: new Date() })
      const ok = await newSub(user, { status: 'pending' })
      const ids = (await db.listCheckoutFailuresDue({ before })).map((x) => String(id(x)))
      assert.ok(ids.includes(String(id(failed))))
      assert.ok(!ids.includes(String(id(abandoned))))
      assert.ok(!ids.includes(String(id(ok))))
      assert.ok(await db.claimSubscriptionEmail(id(failed), 'paymentFailed', { ref: 'checkout-1' }))
    })
  })

  // ————————————————————— Widgets y packs de LAB —————————————————————
  describe('widgets y packs', () => {
    const inst = (user, extra = {}) => ({
      userId: id(user),
      key: `pub_${uniq('k').replace(/[^a-z0-9]/g, '')}`,
      sectionId: 'chapters/FooterCTA',
      status: 'published',
      domains: [],
      draftProps: {},
      ...extra,
    })

    it('crea, busca por id y por key, lista de la más nueva a la más vieja y cuenta vistas', async () => {
      const user = await newUser()
      const a = await db.createHostedInstance(inst(user, { createdAt: new Date('2026-01-01T00:00:00Z') }))
      const b = await db.createHostedInstance(inst(user, { createdAt: new Date('2026-02-01T00:00:00Z') }))
      assert.equal(String(id(await db.findHostedInstanceById(id(a)))), String(id(a)))
      assert.equal(String(id(await db.findHostedInstanceByKey(a.key))), String(id(a)))
      assert.equal(await db.findHostedInstanceByKey('pub_inexistente'), null)
      const list = await db.findHostedInstancesByUser(id(user))
      assert.deepEqual(list.map((x) => String(id(x))), [String(id(b)), String(id(a))])

      await db.incHostedViews(a.key)
      await db.incHostedViews(a.key)
      assert.equal((await db.findHostedInstanceById(id(a))).views, 2)
      await db.incHostedViews('pub_inexistente') // no tira
    })

    it('findHostedInstanceByEditTokenHash: por hash, null si no hay o si se quitó', async () => {
      const user = await newUser()
      const a = await db.createHostedInstance(inst(user))
      const b = await db.createHostedInstance(inst(user))
      assert.equal(await db.findHostedInstanceByEditTokenHash(''), null)
      assert.equal(await db.findHostedInstanceByEditTokenHash('a'.repeat(64)), null)

      const found = await db.findHostedInstanceById(id(a))
      found.editTokenHash = 'b'.repeat(64)
      await found.save()
      assert.equal(String(id(await db.findHostedInstanceByEditTokenHash('b'.repeat(64)))), String(id(a)))
      assert.equal(await db.findHostedInstanceByEditTokenHash('c'.repeat(64)), null)

      // quitar el link: el hash deja de encontrar la instancia
      const again = await db.findHostedInstanceByEditTokenHash('b'.repeat(64))
      again.editTokenHash = undefined
      again.markModified?.('editTokenHash')
      await again.save()
      assert.equal(await db.findHostedInstanceByEditTokenHash('b'.repeat(64)), null)
      assert.equal(String(id(await db.findHostedInstanceById(id(b)))), String(id(b)))
    })

    it('countPublishedHosted: solo publicadas, sin la excluida', async () => {
      const user = await newUser()
      const a = await db.createHostedInstance(inst(user))
      await db.createHostedInstance(inst(user))
      await db.createHostedInstance(inst(user, { status: 'draft' }))
      assert.equal(await db.countPublishedHosted(id(user), null), 2)
      assert.equal(await db.countPublishedHosted(id(user), id(a)), 1)
    })

    it('countPublishedHostedCreatedBefore: orden estable, con desempate por id cuando coincide el createdAt', async () => {
      const user = await newUser()
      const t = new Date('2026-03-01T00:00:00Z')
      const items = []
      for (let i = 0; i < 3; i++) items.push(await db.createHostedInstance(inst(user, { createdAt: t })))
      const later = await db.createHostedInstance(inst(user, { createdAt: new Date('2026-04-01T00:00:00Z') }))
      await db.createHostedInstance(inst(user, { createdAt: new Date('2026-02-01T00:00:00Z'), status: 'draft' }))

      // Con tiempos empatados las tres se ordenan por id: 0, 1 y 2 anteriores.
      const sorted = [...items].sort((x, y) => (String(id(x)) < String(id(y)) ? -1 : 1))
      for (let i = 0; i < 3; i++) {
        assert.equal(
          await db.countPublishedHostedCreatedBefore(id(user), t, id(sorted[i])),
          i,
          `la ${i}.ª del empate`,
        )
      }
      assert.equal(await db.countPublishedHostedCreatedBefore(id(user), later.createdAt, id(later)), 3)
    })

    it('deleteHostedInstance borra una vez y listHostedInstances trae solo lo que cuenta el embudo', async () => {
      const user = await newUser()
      const a = await db.createHostedInstance(inst(user, { draftProps: { title: 'x' } }))
      const all = await db.listHostedInstances()
      const row = all.find((x) => String(id(x) ?? x._id) === String(id(a)))
      assert.ok(row)
      assert.equal(row.sectionId, 'chapters/FooterCTA')
      assert.equal(row.status, 'published')
      assert.equal(await db.deleteHostedInstance(id(a)), true)
      assert.equal(await db.deleteHostedInstance(id(a)), false)
    })

    it('packs: se crean, se buscan, sacan una instancia borrada y se borran', async () => {
      const user = await newUser()
      const a = await db.createHostedInstance(inst(user))
      const b = await db.createHostedInstance(inst(user))
      const key = `pk_${uniq('k').replace(/[^a-z0-9]/g, '')}`
      const pack = await db.createHostedPack({
        userId: id(user),
        key,
        name: 'Mi pack',
        items: [String(id(a)), String(id(b))],
        domains: [],
      })
      assert.equal(String(id(await db.findHostedPackById(id(pack)))), String(id(pack)))
      assert.equal(String(id(await db.findHostedPackByKey(key))), String(id(pack)))
      assert.equal((await db.findHostedPacksByUser(id(user))).length, 1)

      await db.removeInstanceFromPacks(id(user), id(a))
      assert.deepEqual((await db.findHostedPackById(id(pack))).items.map(String), [String(id(b))])

      // Otro usuario no toca el pack.
      const other = await newUser()
      await db.removeInstanceFromPacks(id(other), id(b))
      assert.equal((await db.findHostedPackById(id(pack))).items.length, 1)

      assert.equal(await db.deleteHostedPack(id(pack)), true)
      assert.equal(await db.findHostedPackByKey(key), null)
      assert.equal(await db.deleteHostedPack(id(pack)), false)
    })
  })

  // ———————————— Reembolsos y botón de arrepentimiento ————————————
  describe('reembolsos y arrepentimiento', () => {
    const refundRow = (extra = {}) => ({
      externalId: uniq('re'),
      provider: 'mercadopago',
      kind: 'order',
      orderId: uniq('o'),
      email: 'comprador@contract.test',
      amount: 100,
      currency: 'ARS',
      refundedAt: new Date(),
      ...extra,
    })

    it('el libro de reembolsos no duplica por externalId: repetir actualiza la misma fila', async () => {
      const row = refundRow()
      const first = await db.recordRefund(row)
      assert.equal(first.externalId, row.externalId)
      await db.recordRefund({ ...row, amount: 150, partial: true })
      const found = await db.findRefund(row.externalId)
      assert.equal(found.amount, 150)
      assert.equal(found.partial, true)
      const all = (await db.listRefunds()).filter((r) => r.externalId === row.externalId)
      assert.equal(all.length, 1)
      assert.equal(await db.findRefund(uniq('nada')), null)
    })

    it('el libro lista de la devolución más reciente a la más vieja', async () => {
      const older = refundRow({ refundedAt: new Date('2026-01-01T00:00:00Z') })
      const newer = refundRow({ refundedAt: new Date('2026-06-01T00:00:00Z') })
      await db.recordRefund(older)
      await db.recordRefund(newer)
      const ids = (await db.listRefunds()).map((r) => r.externalId)
      assert.ok(ids.indexOf(newer.externalId) < ids.indexOf(older.externalId))
    })

    const withdrawal = (extra = {}) => ({
      code: uniq('ARR').toUpperCase(),
      email: `${uniq('w')}@contract.test`,
      name: 'Comprador',
      kind: 'order',
      orderId: uniq('ord'),
      ...extra,
    })

    it('arrepentimiento: crea, busca por código y no repite el código', async () => {
      const w = withdrawal()
      const created = await db.createWithdrawal(w)
      assert.equal(created.status, 'received')
      assert.equal(created.attempts ?? 0, 0)
      assert.equal((await db.findWithdrawalByCode(w.code)).email, w.email)
      assert.equal(await db.findWithdrawalByCode(uniq('NADA')), null)
      await assert.rejects(db.createWithdrawal(withdrawal({ code: w.code })))
      assert.ok((await db.listWithdrawals()).some((x) => x.code === w.code))
    })

    it('arrepentimiento: el claim pasa de un estado a otro una sola vez (doble click del link)', async () => {
      const w = withdrawal({ status: 'awaiting_confirmation' })
      await db.createWithdrawal(w)
      const won = await db.claimWithdrawal(w.code, 'awaiting_confirmation', 'executing')
      assert.equal(won.status, 'executing')
      assert.ok(won.confirmedAt)
      assert.equal(await db.claimWithdrawal(w.code, 'awaiting_confirmation', 'executing'), null)

      const updated = await db.updateWithdrawal(w.code, { status: 'refunded', note: 'devuelto' })
      assert.equal(updated.status, 'refunded')
      assert.equal(updated.note, 'devuelto')
      assert.equal((await db.findWithdrawalByCode(w.code)).status, 'refunded')
      assert.equal(await db.claimWithdrawal(uniq('NADA'), 'received', 'executing'), null)
    })

    it('arrepentimiento: el pedido reciente del mismo mail y compra no se duplica', async () => {
      const w = withdrawal()
      await db.createWithdrawal(w)
      const since = new Date(Date.now() - 60_000)
      const same = await db.findRecentWithdrawal({ email: w.email, orderId: w.orderId, since })
      assert.equal(same.code, w.code)
      assert.equal(await db.findRecentWithdrawal({ email: 'otro@contract.test', orderId: w.orderId, since }), null)
      assert.equal(await db.findRecentWithdrawal({ email: w.email, orderId: uniq('otra'), since }), null)
      assert.equal(
        await db.findRecentWithdrawal({ email: w.email, orderId: w.orderId, since: new Date(Date.now() + 60_000) }),
        null,
        'fuera de la ventana',
      )
    })

    it('listSubscriptions trae todas (para el panel de plata que no se toca)', async () => {
      const user = await newUser()
      const s = await newSub(user)
      assert.ok((await db.listSubscriptions()).some((x) => String(x.id ?? x._id) === String(id(s))))
    })
  })

  // ———————————————— Proyectos del builder ————————————————
  describe('proyectos del builder', () => {
    it('crea, busca, lista de la más reciente a la más vieja y borra', async () => {
      const user = await newUser()
      const a = await db.createBuilderProject({ userId: id(user), name: 'A', recipe: ['chapters/HeroKinetic'] })
      await sleep(15)
      const b = await db.createBuilderProject({ userId: id(user), name: 'B', recipe: [] })
      assert.deepEqual((await db.findBuilderProjectById(id(a))).recipe, ['chapters/HeroKinetic'])
      assert.deepEqual((await db.findBuilderProjectsByUser(id(user))).map((p) => p.name), ['B', 'A'])
      assert.equal((await db.findBuilderProjectsByUser(id(await newUser()))).length, 0)
      assert.equal(await db.deleteBuilderProject(id(b)), true)
      assert.equal(await db.deleteBuilderProject(id(b)), false)
      assert.equal(await db.findBuilderProjectById(id(b)), null)
    })
  })

  // ———————————————— Leads y cupón de bienvenida ————————————————
  describe('leads y cupón', () => {
    it('el alta es idempotente por email', async () => {
      const email = `${uniq('lead')}@contract.test`
      const first = await db.upsertLead({ email, source: 'home' })
      assert.equal(first.created, true)
      const again = await db.upsertLead({ email, source: 'otra' })
      assert.equal(again.created, false)
      assert.equal(String(id(again.lead)), String(id(first.lead)))
      const mixed = await db.upsertLead({ email: email.toUpperCase(), source: 'otra' })
      assert.equal(mixed.created, false, 'mayúsculas: es el mismo mail')
    })

    it('el canje del cupón es atómico: gana la primera orden y repetir con ella es ok', async () => {
      const code = uniq('SL').toUpperCase()
      await db.upsertLead({ email: `${uniq('c')}@contract.test`, couponCode: code, couponPercent: 10 })
      assert.ok(await db.findLeadByCoupon(code))
      assert.equal(await db.findLeadByCoupon(uniq('NADA')), null)

      assert.deepEqual(await db.redeemCoupon({ code, orderId: 'ord-1' }), { redeemed: true })
      assert.deepEqual(await db.redeemCoupon({ code, orderId: 'ord-1' }), { redeemed: true }, 'misma orden')
      assert.deepEqual(await db.redeemCoupon({ code, orderId: 'ord-2' }), { redeemed: false }, 'ya lo usó otra')
      assert.deepEqual(await db.redeemCoupon({ code: uniq('NADA'), orderId: 'ord-1' }), { redeemed: false })
    })

    it('dos leads no pueden quedarse con el mismo código de cupón: el guardado falla con 11000', async () => {
      // El camino real (ensureCoupon): el lead ya existe y se le asigna el código al guardar.
      const code = uniq('SL').toUpperCase()
      const { lead: a } = await db.upsertLead({ email: `${uniq('d')}@contract.test` })
      const { lead: b } = await db.upsertLead({ email: `${uniq('e')}@contract.test` })
      a.couponCode = code
      await a.save()
      b.couponCode = code
      await assert.rejects(b.save(), (err) => err?.code === 11000)
    })

    it('listLeads(unsyncedOnly) deja afuera los ya enviados al CRM', async () => {
      const email = `${uniq('crm')}@contract.test`
      const { lead } = await db.upsertLead({ email })
      const pending = (await db.listLeads({ unsyncedOnly: true })).map((l) => l.email)
      assert.ok(pending.includes(email))
      lead.crmSyncedAt = new Date()
      await lead.save()
      const after = (await db.listLeads({ unsyncedOnly: true })).map((l) => l.email)
      assert.ok(!after.includes(email))
      assert.ok((await db.listLeads()).some((l) => l.email === email))
    })
  })

  // ———————————————— Analítica y listados del panel ————————————————
  describe('eventos y listados', () => {
    it('guarda eventos y los lista desde una fecha, del más viejo al más nuevo', async () => {
      const vid = uniq('v')
      const day = 86_400_000
      const t0 = Date.now() - 10 * day
      await db.addEvents([
        { vid, type: 'view', path: '/a', createdAt: new Date(t0) },
        { vid, type: 'click', path: '/b', sku: 'chapters', createdAt: new Date(t0 + 5 * day) },
      ])
      await db.addEvents([])
      const all = (await db.listEvents()).filter((e) => e.vid === vid)
      assert.deepEqual(all.map((e) => e.path), ['/a', '/b'])
      const since = (await db.listEvents({ since: new Date(t0 + 2 * day) })).filter((e) => e.vid === vid)
      assert.deepEqual(since.map((e) => e.path), ['/b'])
    })

    it('listUsers y listOrders traen lo creado, lo más nuevo primero', async () => {
      const first = await newUser()
      await sleep(15)
      const second = await newUser()
      const users = (await db.listUsers()).map((u) => String(u.id ?? u._id))
      assert.ok(users.indexOf(String(id(second))) < users.indexOf(String(id(first))))

      const o1 = await newOrder(first)
      await sleep(15)
      const o2 = await newOrder(first)
      const orders = (await db.listOrders()).map((o) => String(o.id ?? o._id))
      assert.ok(orders.indexOf(String(id(o2))) < orders.indexOf(String(id(o1))))
    })

    it('usuarios: se crean, se buscan por mail o por Google y se actualizan', async () => {
      const email = `${uniq('usr')}@contract.test`
      const googleId = uniq('gid')
      const user = await db.createUser({ email, name: 'Ana', googleId })
      assert.equal(String(id(await db.findUser({ email }))), String(id(user)))
      assert.equal(String(id(await db.findUser({ googleId }))), String(id(user)))
      assert.equal((await db.findUserById(id(user))).email, email)
      assert.equal(await db.findUser({ email: 'nadie@contract.test' }), null)
      user.name = 'Ana María'
      await db.updateUser(user)
      assert.equal((await db.findUserById(id(user))).name, 'Ana María')
    })
  })


  // ———————————— Avisos de cambio de precio de LAB ————————————
  describe('avisos de cambio de precio', () => {
    const HOUR = 3_600_000
    const DAY = 24 * HOUR

    async function newNotice(sub, extra = {}) {
      const { notice } = await db.ensurePriceChangeNotice({
        subscriptionId: id(sub),
        changeId: uniq('chg'),
        plan: 'hosted_pro',
        cycle: 'monthly',
        currency: 'ARS',
        from: 15000,
        to: 18000,
        ...extra,
      })
      return notice
    }

    /** Un aviso ya mandado con fecha efectiva, listo para aplicar. */
    async function mailedNotice(sub, effectiveAt) {
      const n = await newNotice(sub)
      assert.ok(await db.claimPriceChangeEmail(id(n), { effectiveAt }))
      await db.completePriceChangeEmail(id(n), uniq('em'))
      return n
    }

    it('el alta es idempotente por (suscripción, cambio) y guarda lo anunciado', async () => {
      const sub = await newSub(await newUser())
      const changeId = uniq('chg')
      const first = await db.ensurePriceChangeNotice({
        subscriptionId: id(sub),
        changeId,
        plan: 'hosted_pro',
        cycle: 'monthly',
        currency: 'ARS',
        from: 15000,
        to: 18000,
      })
      assert.equal(first.created, true)
      assert.equal(first.notice.changeId, changeId)
      assert.equal(first.notice.from, 15000)
      assert.equal(first.notice.to, 18000)
      assert.equal(first.notice.currency, 'ARS')
      assert.equal(first.notice.emailSentAt ?? null, null)
      assert.equal(first.notice.appliedAt ?? null, null)

      const again = await db.ensurePriceChangeNotice({ subscriptionId: id(sub), changeId, from: 1, to: 2 })
      assert.equal(again.created, false)
      assert.equal(String(id(again.notice)), String(id(first.notice)))
      assert.equal(again.notice.from, 15000, 'repetir no pisa lo anunciado')

      // Otro cambio de la misma suscripción, y el mismo cambio en otra: filas distintas.
      const other = await db.ensurePriceChangeNotice({ subscriptionId: id(sub), changeId: uniq('chg') })
      assert.equal(other.created, true)
      const otherSub = await newSub(await newUser())
      const sameChange = await db.ensurePriceChangeNotice({ subscriptionId: id(otherSub), changeId })
      assert.equal(sameChange.created, true)
    })

    it('dos altas a la vez del mismo cambio: crea una sola fila', async () => {
      const sub = await newSub(await newUser())
      const changeId = uniq('chg')
      const results = await Promise.all(
        Array.from({ length: 4 }, () => db.ensurePriceChangeNotice({ subscriptionId: id(sub), changeId })),
      )
      assert.equal(results.filter((r) => r.created).length, 1)
      assert.equal(new Set(results.map((r) => String(id(r.notice)))).size, 1)
      assert.equal((await db.findPriceChangeNoticesBySubscription(id(sub))).length, 1)
    })

    it('se busca por id y por (suscripción, cambio); las de una suscripción salen de la más vieja a la más nueva', async () => {
      const sub = await newSub(await newUser())
      const a = await newNotice(sub)
      await sleep(15)
      const b = await newNotice(sub)
      assert.equal(String(id(await db.findPriceChangeNoticeById(id(a)))), String(id(a)))
      assert.equal(String(id(await db.findPriceChangeNotice(id(sub), a.changeId))), String(id(a)))
      assert.equal(await db.findPriceChangeNotice(id(sub), uniq('nada')), null)
      assert.equal(await db.findPriceChangeNoticeById('f'.repeat(24)), null)
      const all = await db.findPriceChangeNoticesBySubscription(id(sub))
      assert.deepEqual(all.map((n) => String(id(n))), [String(id(a)), String(id(b))])
    })

    it('el mail: claim una sola vez, fija la fecha, release la suelta y complete lo cierra', async () => {
      const sub = await newSub(await newUser())
      const n = await newNotice(sub)
      const eff = new Date(Date.now() + 30 * DAY)

      const claimed = await db.claimPriceChangeEmail(id(n), { effectiveAt: eff })
      assert.ok(claimed?.emailSendingAt)
      assert.equal(new Date(claimed.effectiveAt).getTime(), eff.getTime())
      assert.equal(await db.claimPriceChangeEmail(id(n), { effectiveAt: eff }), null, 'ya lo está mandando otro')

      await db.releasePriceChangeEmail(id(n), 'Resend caído')
      const released = await db.findPriceChangeNoticeById(id(n))
      assert.equal(released.emailError, 'Resend caído')
      assert.equal(released.emailSendingAt ?? null, null)
      assert.equal(released.effectiveAt ?? null, null, 'sin mail no hay fecha')

      const later = new Date(Date.now() + 33 * DAY)
      const again = await db.claimPriceChangeEmail(id(n), { effectiveAt: later })
      assert.ok(again, 'se puede reintentar')
      assert.equal(new Date(again.effectiveAt).getTime(), later.getTime(), 'la fecha se recalcula al reintentar')
      assert.equal(again.emailError ?? null, null)

      const done = await db.completePriceChangeEmail(id(n), 'em_1')
      assert.ok(done.emailSentAt)
      assert.equal(done.emailId, 'em_1')
      assert.equal(done.emailSendingAt ?? null, null)
      assert.equal(await db.claimPriceChangeEmail(id(n), { effectiveAt: later }), null, 'ya salió')
    })

    it('un claim de hace 11 minutos (el proceso murió) se retoma', async () => {
      const sub = await newSub(await newUser())
      const n = await newNotice(sub)
      assert.ok(await db.claimPriceChangeEmail(id(n)))
      await ctx.setRaw('priceChangeNotice', id(n), { emailSendingAt: new Date(Date.now() - 11 * 60_000) })
      assert.ok(await db.claimPriceChangeEmail(id(n)))
    })

    it('un aviso aplicado o descartado no se reclama', async () => {
      const sub = await newSub(await newUser())
      const skipped = await newNotice(sub)
      await db.skipPriceChangeNotice(id(skipped), 'ya paga el precio nuevo')
      assert.equal(await db.claimPriceChangeEmail(id(skipped)), null)

      const applied = await mailedNotice(sub, new Date(Date.now() + DAY))
      await db.markPriceChangeApplied(id(applied))
      assert.equal(await db.claimPriceChangeEmail(id(applied)), null)
    })

    it('«por avisar»: sin mail, sin descartar y sin nadie mandándolo', async () => {
      const sub = await newSub(await newUser())
      const pending = await newNotice(sub)
      const sending = await newNotice(sub)
      const sent = await mailedNotice(sub, new Date(Date.now() + DAY))
      const skipped = await newNotice(sub)
      await db.claimPriceChangeEmail(id(sending))
      await db.skipPriceChangeNotice(id(skipped), 'baja')
      const stale = await newNotice(sub)
      await db.claimPriceChangeEmail(id(stale))
      await ctx.setRaw('priceChangeNotice', id(stale), { emailSendingAt: new Date(Date.now() - 11 * 60_000) })

      const ids = (await db.listPriceChangeNoticesToAnnounce({ limit: 500 })).map((x) => String(id(x)))
      assert.ok(ids.includes(String(id(pending))))
      assert.ok(ids.includes(String(id(stale))), 'el claim vencido vuelve a la cola')
      for (const out of [sending, sent, skipped]) assert.ok(!ids.includes(String(id(out))))
    })

    it('«a aplicar»: avisados, con fecha dentro del margen, sin aplicar ni descartar, la más próxima primero', async () => {
      const sub = await newSub(await newUser())
      const now = Date.now()
      const soon = await mailedNotice(sub, new Date(now + 1 * DAY))
      const sooner = await mailedNotice(sub, new Date(now + 12 * HOUR))
      const far = await mailedNotice(sub, new Date(now + 20 * DAY))
      const notMailed = await newNotice(sub)
      // Reclamado (ya tiene fecha) pero el mail todavía no salió: no se aplica.
      const sending = await newNotice(sub)
      await db.claimPriceChangeEmail(id(sending), { effectiveAt: new Date(now + 12 * HOUR) })
      const applied = await mailedNotice(sub, new Date(now + DAY))
      await db.markPriceChangeApplied(id(applied))
      const skipped = await mailedNotice(sub, new Date(now + DAY))
      await db.skipPriceChangeNotice(id(skipped), 'cambió de plan')

      const due = await db.listPriceChangeNoticesDue({ before: new Date(now + 2 * DAY), limit: 500 })
      const ids = due.map((x) => String(id(x)))
      assert.ok(ids.indexOf(String(id(sooner))) !== -1 && ids.indexOf(String(id(soon))) !== -1)
      assert.ok(ids.indexOf(String(id(sooner))) < ids.indexOf(String(id(soon))), 'la fecha más próxima primero')
      for (const out of [far, notMailed, sending, applied, skipped]) {
        assert.ok(!ids.includes(String(id(out))))
      }
    })

    it('markApplied: una sola vez, y NUNCA sin que el mail haya salido', async () => {
      const sub = await newSub(await newUser())
      const unmailed = await newNotice(sub)
      assert.equal(await db.markPriceChangeApplied(id(unmailed)), null, 'sin mail no hay cobro nuevo')
      assert.equal((await db.findPriceChangeNoticeById(id(unmailed))).appliedAt ?? null, null)

      // Reclamado pero todavía no enviado tampoco cuenta.
      await db.claimPriceChangeEmail(id(unmailed), { effectiveAt: new Date(Date.now() + DAY) })
      assert.equal(await db.markPriceChangeApplied(id(unmailed)), null)

      const n = await mailedNotice(sub, new Date(Date.now() + DAY))
      const first = await db.markPriceChangeApplied(id(n))
      assert.ok(first?.appliedAt)
      assert.equal(await db.markPriceChangeApplied(id(n)), null, 'ya estaba aplicado')
      assert.equal(await db.markPriceChangeApplied('f'.repeat(24)), null)
    })

    it('markApplied a la vez: gana uno solo', async () => {
      const sub = await newSub(await newUser())
      const n = await mailedNotice(sub, new Date(Date.now() + DAY))
      const out = await Promise.all(Array.from({ length: 4 }, () => db.markPriceChangeApplied(id(n))))
      assert.equal(out.filter(Boolean).length, 1)
    })

    it('claim a la vez: gana uno solo (dos barridos no mandan el mismo mail)', async () => {
      const sub = await newSub(await newUser())
      const n = await newNotice(sub)
      const eff = new Date(Date.now() + 30 * DAY)
      const out = await Promise.all(
        Array.from({ length: 4 }, () => db.claimPriceChangeEmail(id(n), { effectiveAt: eff })),
      )
      assert.equal(out.filter(Boolean).length, 1)
    })

    it('descartar: una sola vez, con el motivo, y no si ya se aplicó', async () => {
      const sub = await newSub(await newUser())
      const n = await newNotice(sub)
      const first = await db.skipPriceChangeNotice(id(n), 'se dio de baja')
      assert.ok(first.skippedAt)
      assert.equal(first.skipReason, 'se dio de baja')
      assert.equal(await db.skipPriceChangeNotice(id(n), 'otra vez'), null)
      assert.equal(await db.markPriceChangeApplied(id(n)), null, 'un descartado no se aplica')

      const applied = await mailedNotice(sub, new Date(Date.now() + DAY))
      await db.markPriceChangeApplied(id(applied))
      assert.equal(await db.skipPriceChangeNotice(id(applied), 'tarde'), null)
    })
  })

}
