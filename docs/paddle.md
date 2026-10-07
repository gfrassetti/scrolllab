# Paddle — cobro internacional en USD (market, builder y LAB)

Mercado Pago sigue siendo la pasarela de Argentina (ARS). Paddle cobra al resto
del mundo en USD y es **merchant of record**: factura, cobra y liquida el IVA /
sales tax de cada país. Por eso se eligió sobre Stripe (no abre cuentas a
vendedores argentinos sin LLC en EE.UU.) y Lemon Squeezy (en migración a Stripe
Managed Payments, más caro y con menos países).

## Cuándo se usa cada una

**Viene marcada sola por ubicación, pero el comprador siempre puede elegir.**
Un argentino en el exterior, alguien con VPN o un extranjero que quiere pagar
con Mercado Pago tienen que poder hacerlo.

| Ubicación detectada | Marcado por defecto | Moneda | Precios que se ven |
|---|---|---|---|
| Argentina | Mercado Pago | ARS (cotización del día) | ARS |
| Cualquier otro país (Latinoamérica incluida: el MP argentino no cobra con medios de Chile o México) | Tarjeta (Paddle) | USD | USD de lista |

- **Detección**: `GET /api/checkout/methods` devuelve el país del request
  (`x-vercel-ip-country` / `cf-ipcountry`); sin país, la zona horaria del
  navegador (`America/Argentina/*` → Argentina).
- **Selector «Medio de pago»** (`PaymentMethodPicker`, carrito y planes de LAB):
  dos opciones compactas, «Mercado Pago · en pesos argentinos» y «Tarjeta · en
  dólares · vía Paddle». Al cambiar, los precios cambian de moneda. La elección
  queda guardada (`localStorage` `scrolllab-pay-region`).
- **Un solo botón de pago**, que dice adónde va («Pagar con Mercado Pago →» /
  «Pagar con tarjeta (USD) →»). Sin modal.
- **«Comprar» rápido** (ficha del template, home, builder: saltan el carrito y
  no tienen selector) hereda el medio vigente: el detectado o el que se eligió
  antes (`startCheckout`). Para cambiarlo, se elige en el carrito.
- **Selector de moneda ARS | USD en el header**, al lado del de idioma
  (`CurrencySelector`). Es la **misma elección** que el «Medio de pago»: USD →
  tarjeta con Paddle, ARS → Mercado Pago. Cambia la moneda de todos los precios
  del sitio (home, catálogo, fichas, builder, carrito y planes de LAB).
- **La moneda sigue al medio de pago, no al idioma** (`resolveCurrency`,
  `src/lib/payRegion.js`; hook `useCurrency`): un español que lee en español
  puede ver y pagar en dólares; un argentino con el sitio en inglés ve pesos.
  Solo hay dos monedas porque son las dos en que se cobra (Paddle podría cobrar
  en EUR u otras, pero no hay precios cargados).
- Sin Paddle configurado no aparece nada y todo sigue como antes: Mercado Pago,
  con el idioma decidiendo si el precio de referencia va en USD (EN) o pesos (ES).

## Flujo — compra del market y del builder

```
Carrito (ubicación fuera de Argentina)
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

## Reembolsos (lo que exige Paddle para aprobar el dominio)

Paddle pide, publicadas en el sitio, Términos, Privacidad y una **Política de
reembolsos con un plazo de entre 14 y 90 días** (sin «todas las ventas son
finales»). Está en `/legal/refunds` (es/en), enlazada desde el pie del home, el
carrito, LAB y los Términos. El plazo es una sola constante: `REFUND_DAYS` en
`src/lib/site.js` (14, el mínimo); los textos usan `{{days}}`. Alcance: templates,
bundle, builder y **cada cobro** de LAB, con Mercado Pago o con Paddle; el
Estudio queda afuera (cotización aparte). Cómo se opera:
- Paddle: el comprador lo pide en paddle.net o a nosotros; se reembolsa desde el
  panel de Paddle. Una orden reembolsada se corta sola (webhook `adjustment.*`).
- Mercado Pago: se reembolsa desde el panel de MP; el webhook corta la orden.
- LAB: el webhook solo te **avisa** por mail del reembolso; dar de baja la
  suscripción y bajar el plan es un paso manual hasta que se automatice.
- Cambiar el plazo: `REFUND_DAYS` + revisar con tu abogado / contador.

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
- **Avisos al dueño** (`alertAdmin`, mail a `EMAIL_NOTIFY_TO`, uno por evento):
  pago sin orden, pago duplicado, reembolso / contracargo y, desde el punto 8,
  **un pago que no coincide con su orden** (monto, moneda o referencia: el
  cliente pagó y no se le entrega; antes solo quedaba en el log y el webhook
  respondía 200), en Mercado Pago y en Paddle. En LAB, un **cobro de Paddle sin
  suscripción local** o **sobre una baja / una suscripción reemplazada**.
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
el entorno. Si algo no cumple (p. ej. una key de sandbox en producción), **Paddle
queda apagado pero la API arranca igual** — un error de configuración de una
integración opcional no puede tumbar los pagos por Mercado Pago—: el motivo sale
en el log (`PADDLE DESACTIVADO (configuración inválida): …`) y `/api/ready`
responde `paddle: "misconfigured"`. En desarrollo el mismo error sí tira.

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

Tres redes, de la más rápida a la más real:

- `npm test` corre todo contra un **Paddle simulado** en memoria
  (`server/__tests__/helpers/fakePaddle.js`): compras, LAB con reloj simulado
  (renovación, cuota rechazada, gracia, prorrateo al subir), firmas, rechazos y
  reembolsos.
- `npm run check:paddle-sandbox` arma transacciones contra el **sandbox real**
  (template, cupón con centavos, composición de 30 secciones, alta de LAB con
  prueba) y verifica montos, moneda, `custom_data` y cancelación.
- `npm run check:paddle-e2e` es el recorrido completo en un **Chromium real**
  contra el sandbox real, con la ventana de pago de Paddle y la tarjeta de
  prueba (`4242 4242 4242 4242`): compra aprobada, tarjeta rechazada
  (`4000 0000 0000 0002`) y reintento, compra cumplida solo por webhook, firma
  falsa, reembolso, alta de LAB con 7 días de prueba, cambio de plan en las dos
  direcciones, link de tarjeta, baja programada, baja hecha desde Paddle, y los
  eventos repetidos (idempotencia). Los webhooks se prueban con la entidad
  real que devuelve la API de Paddle (el `data` de un evento es esa misma
  entidad) firmada con un secreto de prueba. `--only=lab,webhook` corre solo
  algunos escenarios; `--headed` muestra el navegador.

No se puede probar en sandbox (se confirma con la primera venta real):
- la entrega HTTP de Paddle a una URL pública (mirar «Notifications» en el panel);
- una renovación real o una cuota rechazada real (el sandbox no adelanta el
  reloj); eso lo cubre la suite con el Paddle simulado;
- que Paddle apruebe un reembolso: en sandbox queda `pending_approval` (lo
  aprueba Paddle aparte), así que el chequeo usa ese payload real con la
  aprobación simulada.

## Go-live

1. Cuenta de producción aprobada (dominio, términos, reembolsos, precios).
2. Variables de producción en Railway (`PADDLE_ENV=production`, key, token,
   secreto) y destination de producción con los mismos eventos.
3. Una compra real chica y su reembolso desde el panel: tiene que llegar el
   recibo y, al reembolsar, cortarse la descarga.
