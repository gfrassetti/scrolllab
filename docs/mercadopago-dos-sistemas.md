# MercadoPago — dos sistemas en la misma app ("2 en 1")

**Sí, se suma al proyecto de Checkout Pro. No se crea una cuenta ni una app
nueva.** Checkout Pro (one-time) y Suscripciones (recurrente) son dos APIs de la
**misma** aplicación de MercadoPago, con las mismas credenciales y el mismo
webhook.

---

## 1. Es la misma app

- Mismo `MP_ACCESS_TOKEN`.
- Mismo `new MercadoPagoConfig({ accessToken })` (`createMpClient` en
  `server/services/mercadoPago.js`).
- Misma cuenta en el panel de MP.
- En el panel de MP no hay que crear nada nuevo obligatorio. Opcionalmente se
  crean "planes de suscripción" (ver punto 3, opción B).

## 2. Dos APIs del mismo SDK `mercadopago`

Hoy el código importa:

```js
import { MercadoPagoConfig, Preference, Payment, WebhookSignatureValidator } from 'mercadopago'
```

Se agrega:

```js
import { PreApproval } from 'mercadopago'
// y opcionalmente PreApprovalPlan
```

| Uso | Objeto | Ya está |
|---|---|---|
| Pago único (ZIP) | `new Preference(client)` | sí |
| Consultar un pago | `new Payment(client)` | sí |
| Alta de suscripción | `new PreApproval(client)` | **nuevo** |
| Planes reusables (3 tiers × mes/año) | `new PreApprovalPlan(client)` | **nuevo** |

## 3. Precios ARS fijos (las suscripciones no usan fx)

Los one-time siguen en USD→ARS con `arsFromUsd`. **Las suscripciones no.** Cada
tier tiene un monto ARS fijo mensual y otro anual, seteados a mano en
`catalog.js`. El anual va siempre por debajo de 12× el mensual — esa diferencia
es el "ahorro" que muestra el front ("Save 40%"). No hay recálculo por suscriptor
ni por cotización.

Como los precios son estables, conviene **planes reusables**:

### `PreApprovalPlan` + `PreApproval` (recomendado)

Se definen 6 planes una sola vez (3 tiers × mensual/anual), cada uno queda con su
`id`. Cada alta de usuario crea un `preapproval` asociado a un
`preapproval_plan_id`.

```js
// una sola vez, al setear precios (script de seed o panel de MP)
const plans = new PreApprovalPlan(client)
await plans.create({
  body: {
    reason: 'ScrollLab Hosted — Pro (mensual)',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',        // anual: frequency 1 + 'years'
      transaction_amount: 8000,        // ARS fijo
      currency_id: 'ARS',
    },
    back_url: `${CLIENT_URL}/account/hosted`,
  },
})
// -> guardar el id devuelto en catalog.js junto al tier

// en cada alta de usuario
const preapproval = new PreApproval(client)
await preapproval.create({
  body: {
    preapproval_plan_id: PLAN.mpPlanId,
    external_reference: subscriptionId,          // id local
    payer_email: user.email,
    back_url: `${CLIENT_URL}/account/hosted`,
    status: 'pending',
  },
})
// -> init_point: URL a la que se manda al usuario para autorizar
```

### Alternativa — `PreApproval` sin plan

`auto_recurring` inline en cada alta, con el monto fijo tomado de `catalog.js`.
Menos setup inicial, pero el precio queda repetido en cada suscripción creada y
cambiarlo a futuro cuesta más. Con precios estables no aporta — usar planes.

### Cambiar un precio

Se actualiza el `PreApprovalPlan` (API o panel de MP). Definir política para
suscriptores vigentes: lo habitual es respetarles el precio viejo hasta la
próxima renovación, o notificar el cambio. MP permite `PUT` sobre un preapproval
activo.

## 4. Un solo webhook, con branch

Hoy `notification_url` apunta a `/api/webhooks/mercadopago` y el handler asume
`type === 'payment'`. MP manda a la **misma URL** los eventos de suscripción con
otro `type`:

| `type` / `topic` | Qué es | Acción |
|---|---|---|
| `payment` | pago único (flujo actual) | fulfill orden → ZIP |
| `subscription_preapproval` | alta / cambio / baja de una suscripción | crear/actualizar `Subscription` local |
| `subscription_authorized_payment` | se cobró (o falló) una cuota recurrente | OK → extender `currentPeriodEnd`, reactivar instancias · falló → marcar grace/suspended |

```js
app.post('/api/webhooks/mercadopago', async (req, res) => {
  verifyMpWebhookSignature({ /* igual que hoy */ })

  const type = req.body?.type || req.query?.type
  switch (type) {
    case 'payment':
      return handlePaymentWebhook(req, res)                 // flujo actual, sin tocar
    case 'subscription_preapproval':
      return handlePreapprovalWebhook(req, res)             // nuevo
    case 'subscription_authorized_payment':
      return handleRecurringChargeWebhook(req, res)         // nuevo
    default:
      return res.sendStatus(200)
  }
})
```

- La validación de firma (`WebhookSignatureValidator`) es **la misma**.
- El endpoint del webhook de suscripciones se configura en el panel de MP, en la
  sección de Suscripciones — puede apuntar a la misma URL.

## 5. Modelos locales separados

- `Order` (existe) — one-time, dispara el ZIP. **Sin cambios.**
- `Subscription` (nuevo) —
  `{ userId, plan, status, currentPeriodEnd, mpPreapprovalId, external_reference }`.
- `HostedInstance` consulta `Subscription` para el enforcement de cuota al
  publicar.

## 6. Qué NO se comparte entre los dos sistemas

- **Fulfillment:** orden paga → ZIP. Cuota recurrente cobrada → extender período y
  reactivar instancias suspendidas. Nada de ZIP en el flujo de suscripción.
- **Back URLs / páginas de retorno:** distintas (`/checkout/success` vs
  `/account/hosted`).
- **Estados:** `Order.status` (`pending|paid`) vs `Subscription.status`
  (`pending|authorized|paused|cancelled`).

## 7. Checklist de implementación

- [ ] `PreApproval` + `PreApprovalPlan` importados en `mercadoPago.js`; funciones
      `createPreapproval()` y seed de planes.
- [ ] Planes `hosted_starter/pro/studio` en `catalog.js` con precio ARS fijo
      mensual + anual, cuota de instancias y el `mpPlanId` de cada variante.
- [ ] Script de seed: crear los 6 `PreApprovalPlan` (3 tiers × mes/año), guardar
      los ids en `catalog.js`.
- [ ] Modelo `Subscription` en `server/models.js` + métodos en `server/db.js` y
      `server/fileStore.js`.
- [ ] Webhook con branch por `type`; handlers nuevos, el de `payment` intacto.
- [ ] Endpoint de alta que devuelve el `init_point` de MP.
- [ ] Panel de MP: configurar webhook de Suscripciones a la misma URL.
- [ ] Tests: `server/__tests__/` — alta, cobro OK, cobro fallido, cancelación.
