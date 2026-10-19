# Polar — pasarela internacional (USD, merchant of record)

Estado (2026-10-19): **etapas 1 y 2 conectadas** (compras de templates, bundle y builder, reembolsos, Botón de
arrepentimiento y LAB). Compras probadas en vivo en el sandbox (compra, devolución por el botón y devolución desde
el panel). Se abrió como plan B de Lemon Squeezy, que lleva días sin aprobar
la tienda (`docs/lemonsqueezy.md`). La que apruebe primero queda como carril internacional; las dos pueden estar
conectadas a la vez.

## Por qué Polar

- Merchant of record: cobra y liquida los impuestos de cada país, como Lemon Squeezy.
- Paga a vendedores de Argentina (Stripe Connect Express, a una cuenta bancaria en pesos a nombre del titular).
- **Tiene un entorno de prueba aparte** (`sandbox.polar.sh`, otra cuenta y otro token): se prueba todo, incluidas las
  devoluciones, antes de que aprueben la cuenta real. Con Lemon eso no se pudo.

## Cómo está armado

- `server/services/polar.js`: cliente de la API, firma de los webhooks (Standard Webhooks) y checkout.
- `server/services/polarPayments.js`: cumplir una orden (`order.paid`), reembolso (`order.refunded` / `order.updated`),
  la vuelta del comprador y el webhook.
- `server/services/intlGateway.js`: qué pasarela cobra el carril internacional. Con Polar y Lemon Squeezy usables, manda
  `INTL_GATEWAY` (`polar` | `lemonsqueezy`); sin él, Polar. `GET /api/checkout/methods` lo informa en `intl`.
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
# INTL_GATEWAY=polar          # opcional, si están Polar y Lemon Squeezy a la vez
```

En desarrollo el token puede ir como `POLAR_SANDBOX_TOKEN` en `.env`.

Webhook (en Polar: Settings → Webhooks): URL `https://scrolllab-production.up.railway.app/api/webhooks/polar`,
formato **Raw**, eventos `order.paid`, `order.updated`, `order.refunded` y (para LAB) todos los `subscription.*`.

## Probar

- `server/__tests__/polarCheckout.test.js` contra un Polar simulado (`helpers/fakePolar.js`).
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
