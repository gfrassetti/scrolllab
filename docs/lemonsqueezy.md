# Lemon Squeezy — segunda pasarela internacional (USD, merchant of record)

Estado (2026-10-15): **es la pasarela internacional; Paddle se descartó** (no aprobó la cuenta, ver
`docs/paddle.md`). **Etapas 1, 2 y 3 conectadas** (compras de templates y builder, reembolsos, Botón de
arrepentimiento y LAB). Se prende solo cuando están las cuatro variables
`LEMONSQUEEZY_*` (ver abajo); sin ellas todo sigue por Mercado Pago.

Cómo está armado:

- `server/services/lemonsqueezy.js`: cliente de la API, firma de webhooks, checkout.
- `server/services/lemonPayments.js`: cumplir una orden (`order_created`), reembolso (`order_refunded`),
  contracargo (`dispute_created`, solo avisa) y la vuelta del comprador.
- **Es un solo carril «internacional» en USD.** `GET /api/checkout/methods` lo informa en
  `providers.paddle` (el nombre del contrato, de cuando era Paddle) con `gateway: 'lemonsqueezy'`; el
  front (`usePayRegion`) lo guarda y pide `provider: 'lemonsqueezy'` explícito. La pantalla
  `/checkout/success?provider=lemonsqueezy` espera al webhook (`POST /api/checkout/lemonsqueezy/confirm`
  solo lee la orden del usuario). `labIntlEnabled` es verdadero con Lemon Squeezy: LAB ofrece USD.
- La orden se valida contra lo que guardó el servidor: pasarela, moneda USD, **modo (prueba/real) igual
  al del servidor**, sin descuento hecho en Lemon Squeezy y **subtotal (antes de impuestos) igual al total
  de la orden**. Si algo no coincide no se entrega y le llega un mail al dueño.
- Tests: `server/__tests__/lemonsqueezy.test.js` (cliente) y `lemonCheckout.test.js` (flujo completo contra
  un Lemon Squeezy simulado, `helpers/fakeLemon.js`).

## Por qué

Paddle no aprobó el dominio (ver `docs/paddle.md`) y el dueño decidió dejarlo (2026-10-15). Lemon Squeezy es
otro merchant of record: cobra y liquida los impuestos de cada país, y paga a Argentina **en USD, a una
cuenta bancaria** (o por PayPal). Es un revendedor autorizado: el comprador le compra a Lemon Squeezy
(sus términos: lemonsqueezy.com/buyer-terms), y así lo dicen los legales, el recibo y el mail.

## Lo que cambia respecto de Paddle

| | Paddle | Lemon Squeezy |
|---|---|---|
| Precio de una orden | ítem *non-catalog* (efímero, por orden) | una variante genérica «ScrollLab order» y `custom_price` por checkout |
| Pago | overlay de Paddle.js en nuestra página | página de pago alojada (redirección) o `lemon.js`; vuelve a `/checkout/success` |
| Webhook | `Paddle-Signature: ts=…;h1=…` (con ventana de tiempo) | `X-Signature` = HMAC-SHA256 hex del cuerpo, **sin marca de tiempo**: la idempotencia la da el estado de la orden |
| Reembolso | `POST /adjustments` | `POST /orders/:id/refund` (verificar en test mode) |
| LAB (suscripciones) | precio recurrente non-catalog por plan | **variantes de catálogo** (3 planes × mensual/anual = 6) con prueba gratis de 7 días |
| Comisión (aprox.) | ~5 % + USD 0,50 | 5 % + USD 0,50 |

## Etapas

1. ✅ **Compras únicas** (templates y builder): crear checkout con `custom_price`, webhook `order_created`
   (marca pagada, arma el ZIP), `order_refunded` (corta la descarga, libro, mail). Cupón de primera compra:
   el servidor ya manda el total descontado, el descuento de Lemon Squeezy queda apagado.
2. ✅ **Reembolsos y Botón de arrepentimiento**: `autoRefund` por la API de Lemon Squeezy.
3. ✅ **LAB** (`server/services/subscriptions/lemonSync.js`, tests en `lemonLab.test.js`). Cada plan y ciclo
   es una variante de catálogo del producto **«ScrollLab LAB»** (precio de lista y 7 días de prueba); el
   servidor las encuentra por nombre en la tienda (sin variables) y no vende una variante cuyo precio no sea
   el de lista. Sin prueba el checkout la saltea (`skip_trial`); los días ya pagos de una baja van como
   `trial_ends_at`. Cambiar de plan es cambiar de variante: subir cobra el prorrateo de Lemon Squeezy en el
   acto (`invoice_immediately`), bajar no cobra (`disable_prorations`). El primer cobro se devuelve por la API
   (`/subscription-invoices/:id/refund`) y da de baja. Webhooks `subscription_*` y `subscription_payment_*`.
   Legales actualizados. **Pendiente:** el circuito de cambio de precio (`docs/lab-price-changes.md`) sigue
   solo con Mercado Pago: acá el precio vive en la variante.
4. ✅ **UI**: el selector «Medio de pago» y la moneda siguen al carril internacional (Lemon Squeezy); logo y legales dicen Lemon Squeezy.

## Probarlo de punta a punta (modo prueba, solo para nosotros)

La página `/test` (404 para cualquiera que no esté en `QA_BUYER_EMAILS`) suma, cuando Lemon Squeezy
está prendido, el botón «Comprar por US$ 1» del template de prueba por Lemon Squeezy. El servidor
vuelve a chequear la cuenta en cada compra (para el resto, `SKU inválido`). Es el mismo circuito
que Mercado Pago: orden marcada `qa`, fuera de las métricas, ZIP real, recibo en USD, reembolso.

- Con `LEMONSQUEEZY_TEST_MODE=true` **no cobra**: tarjeta `4242 4242 4242 4242`, fecha futura y CVC cualquiera.
- Sin esa variable (modo real) cobra US$ 1 de verdad y se devuelve igual desde Mis compras.
- Pasos: comprar → vuelve a `/checkout/success` (espera el webhook) → Mis compras «Paga» → mail →
  «Pedir reembolso» (sin descargar) → «Te devolvimos el dinero». Variante: reembolsar a mano desde el
  panel de Lemon Squeezy y ver que el webhook corta la orden.
- El builder de prueba (`/builder-test`) sigue cobrando por Mercado Pago.

## Qué hace falta de tu lado (cuenta y credenciales)

1. Crear la cuenta en lemonsqueezy.com y la **tienda** (nombre «Scroll Lab - Web Studio», dominio
   `scrolllab.com.ar`). Completar la verificación de identidad y de pagos.
2. En **Settings → Payouts**: cobro por **banco en USD** (Argentina figura en la lista) o PayPal.
3. Crear **un producto «ScrollLab order»** (compra única, precio de ejemplo cualquiera, p. ej. USD 1) y
   anotar su **variant id**. Sus textos reales los pisa cada checkout.
4. En **Settings → API**: crear una API key (en **test mode** primero).
5. En **Settings → Webhooks**: crear uno apuntando a `https://<api>/api/webhooks/lemonsqueezy` con el
   secreto que elijas y los eventos `order_created`, `order_refunded`, `dispute_created` y, para LAB, todos
   los `subscription_*` y `subscription_payment_*`.
7. Para LAB: un producto de suscripción **«ScrollLab LAB»** con seis variantes, cada una con **7 días de prueba**
   y categoría SaaS: `Starter (monthly)` US$19 / mes, `Starter (yearly)` US$190 / año, `Pro (monthly)` US$79,
   `Pro (yearly)` US$790, `Studio (monthly)` US$229, `Studio (yearly)` US$2290 (los precios de `HOSTED_PLANS`).
   El nombre empieza con el plan; si el precio no coincide con la lista, ese plan no se vende.
6. Cargar en Railway (no en el chat, ni en el repo):

```
LEMONSQUEEZY_API_KEY=…
LEMONSQUEEZY_STORE_ID=…
LEMONSQUEEZY_ORDER_VARIANT_ID=…
LEMONSQUEEZY_WEBHOOK_SECRET=…
LEMONSQUEEZY_TEST_MODE=true      # sacarlo al salir a producción
```

## A verificar en test mode antes de apoyarse en ello

- Que `custom_price` se respete en el checkout y en el total de la orden (también con una variante de
  suscripción, para LAB).
- El contrato exacto de `POST /orders/:id/refund` (reembolso parcial y total) y el evento que dispara.
- Que `meta.custom_data` vuelva en `order_created` con `orderId`/`userId`.
- Que el pago internacional no cambie el flujo de «descargué: sin reembolso» (política en
  `src/domain/policy.js`).
- Plazo y condiciones del cobro a banco argentino (documentación que pide el banco para recibir USD).
