# Polar — pasarela internacional (USD, merchant of record)

Estado (2026-10-19): **etapas 1 y 2 conectadas y probadas en vivo en el sandbox** (compras de templates, bundle y
builder, reembolsos, Botón de arrepentimiento y LAB: alta, primer cobro, subir y bajar de plan, devolución del
primer cobro con baja inmediata). Es la única pasarela internacional: Paddle se descartó el 2026-10-15 y Lemon
Squeezy el 2026-10-19 (no aprobaba la tienda y los reembolsos de suscripción fallaban en su modo prueba); el código
de las dos se borró. Las filas viejas de QA con `provider: 'lemonsqueezy'` quedan en la base y se ven a mano.

## Por qué Polar

- Merchant of record: cobra y liquida los impuestos de cada país.
- Paga a vendedores de Argentina (Stripe Connect Express, a una cuenta bancaria en pesos a nombre del titular).
- **Tiene un entorno de prueba aparte** (`sandbox.polar.sh`, otra cuenta y otro token): se prueba todo, incluidas las
  devoluciones, antes de que aprueben la cuenta real.

## Cómo está armado

- `server/services/polar.js`: cliente de la API, firma de los webhooks (Standard Webhooks) y checkout.
- `server/services/polarPayments.js`: cumplir una orden (`order.paid`), reembolso (`order.refunded` / `order.updated`),
  la vuelta del comprador y el webhook.
- `server/services/intlGateway.js`: si el carril internacional está y quién lo puede usar (en sandbox, solo QA).
  `GET /api/checkout/methods` lo informa en `intl`.
- Cada orden se cobra sobre un producto genérico **«ScrollLab order»** con un **precio ad hoc** (`prices` del checkout)
  que calcula el servidor. El producto se busca por nombre y, si no existe, se crea solo: no hace falta una variable.
- La orden viaja en `metadata` del checkout (`kind`, `orderId`, `userId`) y Polar la copia a la orden. Se valida:
  proveedor, USD, **subtotal (antes de impuestos) = total de la orden**, sin descuento de Polar. En el sandbox solo se
  cumplen órdenes de prueba (`qa`).
- Reembolso por API (`POST /v1/refunds/`): el monto es el precio sin impuestos; Polar devuelve el impuesto proporcional.
- Firma: `webhook-id`, `webhook-timestamp`, `webhook-signature` (`v1,<base64>`); HMAC-SHA256 de
  `${id}.${timestamp}.${body}`. Se aceptan las dos llaves que usó Polar (bytes del `whsec_…` o su parte base64
  decodificada). Ventana de 5 minutos.

## Variables (Railway)

```
POLAR_ACCESS_TOKEN=...        # Organization Access Token (del entorno que corresponda)
POLAR_WEBHOOK_SECRET=whsec_...
POLAR_ENV=sandbox             # «production» al salir a cobros reales; sandbox = solo cuentas de QA
```

En desarrollo el token puede ir como `POLAR_SANDBOX_TOKEN` en `.env`.

Webhook (en Polar: Settings → Webhooks): URL `https://scrolllab-production.up.railway.app/api/webhooks/polar`,
formato **Raw**, eventos `order.paid`, `order.updated`, `order.refunded` y (para LAB) todos los `subscription.*`.

## Devolver una compra (runbook)

1. El cliente usa el **Botón de arrepentimiento** (pie del home). Lo que cumple la política (compra sin descargar en 14
   días; LAB, el primer cobro dentro de los 14 días del alta) se devuelve solo por la API, después de que confirma por
   mail.
2. Lo demás llega al dueño (aviso por mail y `/admin` → «Arrepentimiento»). Si corresponde, en Polar: Sales → Orders →
   la orden → **Refund**.
3. Solo: el webhook (`order.refunded` / `order.updated`) corta la orden o da de baja LAB, lo anota en el libro (`/admin`
   → «Reembolsos») y manda «Te devolvimos el dinero».

## Probar

- `server/__tests__/polarCheckout.test.js` y `polarLab.test.js` contra un Polar simulado (`helpers/fakePolar.js`).
- En vivo, con la cuenta de QA: `/test` → «Template de prueba · Polar» → tarjeta 4242 → Mis compras → Botón de
  arrepentimiento.

## Etapas

1. ✅ Compras (templates, bundle, builder), reembolsos y arrepentimiento.
2. ✅ LAB (`server/services/subscriptions/polarSync.js`): un producto recurrente por plan y ciclo («ScrollLab LAB —
   Starter (monthly)», con el precio de lista; si no coincide, ese plan no se vende), la prueba gratis la pone el
   checkout (`trial_interval: day`), cobros = órdenes con `subscription_id` (`subscription_create` / `_cycle` /
   `_update`, la diferencia de plan va aparte), `past_due` → gracia + mail con el portal del cliente, baja al fin del
   período (`cancel_at_period_end`) o inmediata (`revoke`), cambio de plan (`invoice` al subir, `next_period` al
   bajar) y devolución del primer cobro por la API con baja inmediata.
3. ⏳ Salir a cobros reales: cuenta aprobada, token y webhook de producción, `POLAR_ENV=production`, legales y textos
   del sitio que nombran a Polar.
