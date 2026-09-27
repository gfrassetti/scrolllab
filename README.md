# SCROLLLAB

Marketplace de templates scrollytelling. Cada modelo es una demo completa; el builder arma composiciones; la compra entrega un ZIP con código fuente + `LICENSE.txt`.

## Stack

- Vite + React 19 + Tailwind CSS v4
- GSAP 3 + Lenis + three
- Express API (`server/`) + MongoDB + Passport Google OAuth
- Mercado Pago Checkout Pro (pagos únicos)

## Setup local

```bash
cp .env.example .env
npm install
npm run pack:templates
npm run dev
```

- Front: http://localhost:5173  
- API: http://localhost:8787  

Sin `MP_ACCESS_TOKEN`, el checkout usa mock pay. Sin credenciales de Google, usá “Login de desarrollo”.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Vite + API |
| `npm run dev:web` | Solo Vite |
| `npm run dev:api` | Solo Express |
| `npm run build` | Build del front |
| `npm start` | API en producción |
| `npm test` | Tests de API |
| `npm run pack:templates` | Prearma ZIPs del catálogo |

## Suscripciones LAB (Mercado Pago)

Sistema de PreApproval de Mercado Pago detrás de LAB (planes hosteados). Estado:
**en producción, testeado contra MP real**. Detalle técnico completo (estados,
logs greppables, cómo correr `check:mp-sandbox`) en
[`docs/mercadopago-suscripciones-setup.md`](docs/mercadopago-suscripciones-setup.md).

### Auditoría y fixes

- **Prueba gratis (7 días):** confirmado en sandbox real que `auto_recurring.start_date` difiere el primer cobro sin cobrar nada; cancelar durante la prueba no cobra un peso.
- **Cancelación:** conserva el acceso hasta `currentPeriodEnd` (antes cortaba en el acto aunque quedaran días pagos). La baja se confirma contra MP antes de marcarla local — si MP no confirma, 502, nunca una baja que MP no hizo.
- **Cobro rechazado / renovación caída:** gracia de 7 días (`HOSTED_GRACE_DAYS`) antes de caer a free; si un reintento de MP cobra después (reintenta hasta 4 veces en 10 días), el plan vuelve solo. El primer cobro (fin de la prueba) tiene 1 día de margen, no 7.
- **Pausa en Mercado Pago** (la puede activar el vendedor desde el panel de MP): conserva el acceso pagado en vez de cortarlo en el acto; visible en la cuenta ("En pausa en MP").
- **UI:** confirmación antes de cancelar, botón de reactivar, "Tu plan está activo hasta …", avisos de pago pendiente/rechazado/pausado, sincroniza sola al volver del checkout de MP.
- **Cambio de plan sin dar de baja** (mismo ciclo): la cuota nueva rige en el acto; bajar de plan se bloquea si ya publicaste más secciones de las que el plan nuevo permite.
- **Emails:** bienvenida (distingue si hay prueba en curso) y cancelación (distingue si fue durante la prueba, donde no se cobró nada).

### Lo último que se sumó

- **Cobro de la diferencia al subir de plan.** MP no prorratea: antes, subir de plan con días ya pagados regalaba la diferencia hasta la próxima renovación (en un plan anual, hasta un año entero). Ahora, si quedan días pagos, la UI muestra el monto exacto y abre un Checkout Pro por esa diferencia; el plan nuevo rige recién cuando el pago se aprueba (webhook o al volver de MP). Bajar de plan, cambiar durante la prueba, o una diferencia menor a ARS 1.000, sigue sin cargo. Cancelado con días pagos no te podés re-suscribir de una a un plan más caro sin pagar la diferencia — primero reactivás.
- **Recordatorio de fin de prueba por email** (`server/services/trialReminders.js`): corre cada hora dentro del proceso de la API, avisa `HOSTED_TRIAL_REMINDER_DAYS` días antes del primer cobro, idempotente (no manda dos veces aunque el server se reinicie en el medio).

### Testeado

- `npm test` — 607/607: recorridos con reloj simulado (prueba → cobro del día 7 → renovación → gracia → pausa → cambio de plan → subida pagando la diferencia → mensual↔anual).
- `npm run check:mp-sandbox` — contra el sandbox **real** de Mercado Pago (16/16): no un simulador, la API de MP de verdad con credenciales de prueba.
- Mutation testing manual sobre la cotización/pago de la diferencia al subir de plan: 5 fallos inyectados a propósito (cotización en cero, sin validar monto, sin bloquear re-suscripción más cara, sin idempotencia, aplica sobre una baja), los 5 detectados por los tests.

## Checkout de templates (Mercado Pago)

Compra única con Checkout Pro: carrito → `POST /api/checkout` (precios del
servidor, en pesos con la cotización del día) → pago en MP → webhook o
confirmación al volver → orden paga → ZIP con licencia marcada → Mis compras.

- **Varios ítems en una compra:** el ZIP trae todos, uno por carpeta (cada una
  es un proyecto que se instala solo) con una licencia en la raíz, igual que el
  bundle. Con un solo ítem el ZIP es el de siempre. El servidor rechaza pagar
  dos veces lo mismo (template repetido, o un modelo que el bundle ya trae) y
  el carrito lo evita.
- **Avisos al dueño** (mail a `EMAIL_NOTIFY_TO` + log greppable), uno por pago:
  - `COMPRA PAGADA DOS VECES` — MP deja pagar el mismo link más de una vez; la
    orden queda paga con el primero y el segundo hay que reembolsarlo.
  - `PAGO SIN ORDEN` — llegó un pago cuya orden ya no existe (venció): entregar
    o reembolsar. Los cobros de LAB que llegan como `payment` no avisan.
  - `ORDEN REEMBOLSADA` / `CONTRACARGO` — la orden pasa a *Reembolsada* y deja
    de descargarse. Reembolsar un pago duplicado no toca la orden.
- **Efectivo** (Rapipago, Pago Fácil): el ticket vence a los 3 días, antes que
  la orden pendiente (7), así no se puede pagar una orden ya borrada.
- **Datos para MP** (su checklist de calidad, pesan en el antifraude): mail,
  nombre y apellido del comprador, y descripción y categoría (`virtual_goods`)
  de cada ítem.
- El mail de compra es un detalle de la compra, **no una factura fiscal**.

Testeado: `checkoutPayments.test.js` (doble pago, pago sin orden, reembolso,
contracargo, dos templates juntos contra el MP simulado), tests del ZIP con
varios ítems y `npm run check:mp-sandbox` contra MP real.

## Deploy

Ver [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Licencia

Código del marketplace: privado. Los ZIPs vendidos incluyen `LICENSE.txt` con watermark de orden/email.
