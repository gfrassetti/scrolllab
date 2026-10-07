# Paddle — cobro internacional en USD (market, builder y LAB)

Mercado Pago sigue siendo la pasarela de Argentina (ARS). Paddle cobra al resto
del mundo en USD y es **merchant of record**: factura, cobra y liquida el IVA /
sales tax de cada país. Por eso se eligió sobre Stripe (no abre cuentas a
vendedores argentinos sin LLC en EE.UU.) y Lemon Squeezy (en migración a Stripe
Managed Payments, más caro y con menos países).

## Cuándo se usa cada una

Un selector en el carrito y en los planes de LAB, no un modal ni un cambio
silencioso:

| Opción | Pasarela | Moneda | Precios que se ven |
|---|---|---|---|
| **Pago desde Argentina** | Mercado Pago | ARS (cotización del día) | ARS |
| **Pago internacional** | Paddle | USD | USD de lista |

- **Preselección**: `GET /api/checkout/methods` devuelve el país del request
  (`x-vercel-ip-country` / `cf-ipcountry`) y qué pasarelas están activas. Sin
  país, el cliente mira la zona horaria (`America/Argentina/*` → Argentina).
  Todo lo que no es Argentina (incluida Latinoamérica: el MP argentino no cobra
  con medios de Chile o México) preselecciona **internacional**.
- **El comprador decide**: un clic cambia la opción y queda guardada
  (`localStorage` `scrolllab-pay-region`). La detección solo elige el default.
- **Un solo botón de pago** cuyo texto dice adónde va.
- Sin Paddle configurado el selector no aparece y todo sigue como hoy.

## Flujo — compra del market y del builder

```
Carrito (región intl)
  └─ POST /api/checkout { items, couponCode, provider: 'paddle', locale }
       ├─ precios del servidor en USD (cupón descontado en centavos)
       ├─ Order { provider: 'paddle', currency_id: 'USD', total (USD) }
       └─ Paddle POST /transactions — ítems non-catalog (precio armado en el
          momento), custom_data { kind: 'order', orderId }
  ← { provider: 'paddle', orderId, transactionId, paddle: { environment, clientToken } }
Paddle.js overlay (Paddle.Checkout.open({ transactionId }))
  └─ checkout.completed → /checkout/success?provider=paddle&txn=…
       └─ POST /api/checkout/paddle/confirm { transactionId }   (no espera al webhook)
Webhook POST /api/webhooks/paddle (firma HMAC verificada sobre el body crudo)
  ├─ transaction.completed / .paid   → fulfillPaddleTransaction → ZIP + recibo + aviso
  ├─ transaction.payment_failed      → mail «pago rechazado» (una vez por orden)
  └─ adjustment.created / .updated   → reembolso / contracargo aprobado → refunded
```

Una transacción solo cumple **su** orden: `order.paddleTransactionId ===
transaction.id`, `custom_data.orderId === order.id`, moneda USD y suma de
`unit_price.amount × quantity` igual al total en centavos. Nunca se confía en
un monto del cliente.

## Flujo — LAB (suscripciones)

- Precios USD por plan en `HOSTED_PLANS` (`priceMonthlyUsd` / `priceYearlyUsd`).
- Alta: `POST /api/subscriptions { plan, cycle, provider: 'paddle' }` crea la
  fila `pending` y una transacción con un precio recurrente non-catalog
  (`billing_cycle` mes/año). La prueba gratis y los días ya pagos de una baja se
  mandan como `trial_period` (días hasta el primer cobro), igual que
  `start_date` en MP.
- Checkout en el overlay → `POST /api/subscriptions/sync` (no espera al
  webhook) → `subscription.*` webhooks sincronizan después.
- Estados Paddle → nuestro enum: `active` / `trialing` → `authorized`;
  `past_due` → `authorized` + `paymentFailedAt`; `paused` → `paused`;
  `canceled` → la misma regla que MP (con días pagos sigue hasta el fin).
- Cobro de cuota: `transaction.completed` con `subscription_id` y total > 0 →
  `lastPaidAt`, `paidPlan`, período extendido, mail «cobro realizado».
- Cobro fallido: `transaction.payment_failed` → `paymentFailedAt` + mail con el
  link para actualizar la tarjeta. La gracia (`HOSTED_GRACE_DAYS`) es la misma.
- Baja: `POST /subscriptions/{id}/cancel { effective_from: 'next_billing_period' }`.
  Se confirma igual que en MP: si Paddle no la hizo, 502 y no se marca nada.
- Cambio de plan: `PATCH /subscriptions/{id}` con el precio nuevo. Subir con días
  pagos → `prorated_immediately` (Paddle cobra la diferencia a la tarjeta
  guardada; si la rechaza, `prevent_change` y 402). Bajar o en prueba →
  `do_not_bill`. La cotización sale de `PATCH /subscriptions/{id}/preview`.
- Alta abandonada: la transacción `ready` se cancela (`PATCH status: canceled`)
  antes de abrir otra, así un checkout viejo no puede cobrar dos veces.

## Mails

| Evento | Market / builder | LAB |
|---|---|---|
| Pago aprobado | Recibo (es/en, ARS o USD) + aviso al dueño | Bienvenida (ya existía) |
| **Pago rechazado** | **Nuevo** — MP y Paddle, una vez por orden; el carrito sigue | **Nuevo** — alta rechazada (una vez) o cuota rechazada (una por cobro, con el link para cambiar la tarjeta y hasta cuándo dura la gracia) |
| **Cuota cobrada** | — | **Nuevo** — una por cobro (MP y Paddle). El primer cobro de un alta sin prueba no manda: ya lo cuenta la bienvenida |
| Baja / fin de prueba | — | Ya existían (ahora con el precio en la moneda de la suscripción) |

- **Rechazo en el checkout = mail diferido.** En el checkout el comprador suele
  reintentar con otra tarjeta al toque: el webhook solo anota `paymentFailedAt`
  y el barrido (`server/services/paymentFailedSweep.js`, cada 5 min) manda el
  mail si pasaron 10 minutos y la orden / el alta sigue sin pagarse. Quien
  reintenta y paga recibe solo el recibo. Una cuota rechazada de una
  suscripción viva avisa en el momento.
- Los mails salen en el idioma del sitio al comprar (`locale` de la orden / de
  la suscripción; los en inglés viven en `emailTemplatesBilling.js`).
- Paddle además manda su propia factura (es el vendedor legal): el recibo
  nuestro lo aclara y no se presenta como factura.
- Idempotencia: claim en la base + `Idempotency-Key` de Resend, como los
  mails que ya existían. Los de LAB por cobro guardan el cobro (`…EmailRef`).

## Endpoints

| Ruta | Para qué |
|---|---|
| `GET /api/checkout/methods` | país del request, pasarela sugerida, client token público de Paddle |
| `POST /api/checkout` `{ provider: 'paddle', locale }` | orden en USD + transacción de Paddle |
| `POST /api/checkout/paddle/confirm` | al cerrar el overlay: trae la transacción y cumple la orden (409 mientras Paddle procesa) |
| `POST /api/webhooks/paddle` | webhook firmado (una URL para órdenes y LAB) |
| `POST /api/subscriptions` `{ provider: 'paddle' }` | alta de LAB en USD |
| `GET /api/subscriptions/payment-method` | link firmado de Paddle para cambiar la tarjeta |
| `/checkout/pay?_ptxn=…` (front) | default payment link: abre el checkout de un link de Paddle |

## Precios de LAB en USD

`HOSTED_PLANS` (`server/catalog.js`), fijados por el owner (2026-10-06):
Starter 19, Pro 79, Studio 229 por mes (la misma escalera ~4× / ~12× que en
pesos), anual = 10×. Cambiarlos es editar `priceMonthlyUsd` /
`priceYearlyUsd`; las transacciones se arman con esos valores (non-catalog), no
hay que tocar nada en el panel de Paddle.

## Configuración

| Env | Para qué |
|---|---|
| `PADDLE_ENV` | `sandbox` (default) o `production` |
| `PADDLE_API_KEY` | API key (`pdl_sdbx_apikey_…` / `pdl_live_apikey_…`). Sin ella Paddle está apagado |
| `PADDLE_CLIENT_TOKEN` | client-side token público para Paddle.js (`test_…` / `live_…`) |
| `PADDLE_WEBHOOK_SECRET` | secreto del notification destination |
| `PADDLE_MOCK_ENABLED` | dev sin cuenta: el checkout internacional va al pago mock |
| `PADDLE_TAX_CATEGORY_TEMPLATE` / `PADDLE_TAX_CATEGORY_LAB` | default `standard` / `saas` |

En producción, con `PADDLE_API_KEY` puesta: exige client token y secreto,
`PADDLE_ENV=production`, y que los prefijos de la key y del token coincidan con
el entorno (una key de sandbox en producción no arranca).

### En el panel de Paddle (sandbox primero)

1. **Developer tools → Authentication**: API key con permisos de lectura y
   escritura sobre transactions, subscriptions, customers y adjustments; y un
   client-side token.
2. **Developer tools → Notifications**: destination
   `https://<api>/api/webhooks/paddle` con los eventos `transaction.completed`,
   `transaction.paid`, `transaction.payment_failed`, `subscription.created`,
   `subscription.updated`, `subscription.activated`, `subscription.trialing`,
   `subscription.past_due`, `subscription.paused`, `subscription.resumed`,
   `subscription.canceled`, `adjustment.created`, `adjustment.updated`.
   Copiar el secreto a `PADDLE_WEBHOOK_SECRET`.
3. **Checkout → Checkout settings**: default payment link
   `https://<front>/checkout/pay` (la página que abre los links `?_ptxn=` que
   Paddle manda por mail, p. ej. «pagar ahora» de una cuota vencida).
4. **Checkout → Website approval** (solo producción): aprobar el dominio. Pide
   términos, política de reembolsos y precios visibles.

## Tests

- `npm test` corre todo contra un **Paddle simulado** en memoria
  (`server/__tests__/helpers/fakePaddle.js`): transacciones, checkout pagado o
  rechazado, suscripciones con prueba, renovación, cobro fallido, baja, cambio de
  plan con prorrateo, reembolsos y webhooks firmados como los firma Paddle.
- `npm run check:paddle-sandbox` habla con el **sandbox real** (solo con
  `PADDLE_API_KEY` de sandbox): arma una transacción de template, una de builder
  y una recurrente de LAB como lo hace la app, verifica montos, moneda,
  `custom_data` y prueba, y las cancela. Imprime los pasos para el pago manual
  con las tarjetas de prueba de Paddle (`4242 4242 4242 4242` aprobada; la de
  rechazo y la de 3-D Secure están en la tabla «Test cards» de sus docs).

## Go-live

1. Cuenta de producción aprobada (dominio, términos, reembolsos, precios).
2. Variables de producción en Railway (`PADDLE_ENV=production`, key, token,
   secreto) y destination de producción con los mismos eventos.
3. Una compra real chica y su reembolso desde el panel: tiene que llegar el
   recibo y, al reembolsar, cortarse la descarga.
