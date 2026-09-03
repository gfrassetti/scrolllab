# Configurar MercadoPago Suscripciones (LAB)

De mock a cobros reales. El código ya está — no hay seed, ni planes en MP, ni
env de plan IDs.

Las suscripciones se crean con **PreApproval + monto inline** (el precio va en
cada alta, sacado de `HOSTED_PLANS` en `server/catalog.js`).

---

## 1. Access Token — **ya está**

Las suscripciones **reusan `MP_ACCESS_TOKEN`** (el mismo de Checkout Pro):

```
mpSubs.accessToken = MP_SUBS_ACCESS_TOKEN || MP_ACCESS_TOKEN
```

En producción `MP_ACCESS_TOKEN` es obligatorio y el mock está forzado en `false`
(`server/config.js`), así que **no hay que agregar nada en Railway**. Las
suscripciones quedan vivas apenas están marcados los topics del webhook (paso 2).

Solo tocás esto si querés una **app de MP separada** para suscripciones:
`MP_SUBS_ACCESS_TOKEN` (y `MP_SUBS_WEBHOOK_SECRET`) con las credenciales de esa
otra app. No es el caso hoy.

Opcional: `HOSTED_FREE_QUOTA` (default `0` = LAB 100% de pago, ni se crean
secciones sin plan/prueba; `1+` = free tier real). `HOSTED_TRIAL_DAYS`
(default `7`) — días de prueba gratis en la primera alta.

---

## 2. Webhook

App SCROLL LAB → **Webhooks / Notificaciones**:

- **URL de producción**: `https://TU-API/api/webhooks/mercadopago`
  (la misma de Checkout Pro — el server hace branch por `type`).
- **Topics**: además de `payment`, marcá:
  - `subscription_preapproval` (Planes y suscripciones)
  - `subscription_authorized_payment` (Planes y suscripciones)
- El **secreto de firma** que te da MP → `MP_SUBS_WEBHOOK_SECRET` (o dejá vacío
  si es el mismo que Checkout Pro).

> Esto se puede hacer por el MCP de MP con `save_webhook` — pasá la URL de la API.

---

## 3. Precios y cuotas

`server/catalog.js` → `HOSTED_PLANS`. Ahí viven los tres tiers
(`hosted_starter` / `hosted_pro` / `hosted_studio`) con `priceMonthly`,
`priceYearly` e `instanceQuota`. Los precios los ajusta quien maneje el
pricing; las cuotas (5 / 15 / sin tope) son fijas.

- ARS enteros, sin decimales, sin fx.
- `priceYearly` < `priceMonthly × 12` → esa diferencia es el "ahorro" que
  muestra el front.
- `instanceQuota`: secciones **publicadas** que permite el plan. `Infinity` =
  sin tope (se serializa a `null` en el wire → el front lo lee como "ilimitado").

Cambialos y redeploy. No hace falta tocar nada en MP (el monto viaja en el alta).

### Cuota gratis (`HOSTED_FREE_QUOTA`)

Env en Railway, **default `0`**: cuántas instancias hosteadas puede tener un
usuario **sin** suscripción.
- `0` (default) → **LAB 100% de pago**. Un usuario free ni crea borradores
  (`POST /api/hosted` → `402`). Lo publicado antes deja de servir (freeze) y
  vuelve al re-suscribirse. La prueba de 7 días (`HOSTED_TRIAL_DAYS`) es el
  "probá antes de pagar".
- `1+` → free tier real: N instancias sin pagar.

---

## 4. Probar un alta real — ✅ confirmado (2026-09)

`createPreapproval` con `auto_recurring` inline (monto por alta, sin plan
pre-creado en MP) **funciona** contra MP real.

Requisito: `MP_ACCESS_TOKEN` en prod (apaga el mock; `MP_SUBS_ACCESS_TOKEN`
solo si querés app separada). Se puede probar contra **localhost** sin túnel
usando el sync manual (paso 4).

> **MP para suscripciones NO tiene `auto_return`.** Tras autorizar, muestra la
> pantalla de éxito con el botón **"Volver al sitio del vendedor"** (va a
> `${CLIENT_URL}/lab`). No redirige solo — es el comportamiento normal de
> PreApproval, no un bug.

1. `/lab` logueado → **Planes** → **Suscribirme**.
2. Redirige al `init_point` de MP → autorizás con una
   [tarjeta de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/your-integrations/test/cards)
   (usuario de test como pagador).
3. Volvés a `/lab`. La suscripción arranca `pending`.
4. **Bajar el estado real desde MP.** Dos caminos, el mismo efecto:
   - **Webhook** (prod): MP dispara `subscription_preapproval` →
     `POST /api/webhooks/mercadopago` → pasa a `authorized` y setea
     `currentPeriodEnd`. Necesita que la URL sea pública.
   - **Sync manual** (sirve en localhost, sin túnel): `/account` →
     **Sincronizar con Mercado Pago** (botón visible cuando el mock está
     apagado), o `POST /api/subscriptions/sync` a mano. Consulta el preapproval
     por API y aplica el mismo cambio que haría el webhook.
5. `GET /api/subscriptions/me` muestra `plan` y `quota` del tier.
6. Publicá más secciones que el free tier → te deja.

`POST /api/subscriptions/sync` (auth, sin body): toma la suscripción más
reciente del usuario con `mpPreapprovalId`, hace `fetchPreapproval` y baja
`status` + `currentPeriodEnd`. Devuelve 403 si el mock está activo, 404 si no
hay nada que sincronizar. No reemplaza al webhook en prod (los cobros
recurrentes siguen llegando por `subscription_authorized_payment`), es para
cerrar el loop en pruebas.

Si el webhook no llega en prod: revisá URL/secreto en el panel y los logs del
server (`MP subs webhook …`). El historial también se ve por el MCP
(`notifications_history`).

---

## Qué maneja el código y qué no

**Sí:** alta, sync de estado por webhook **o sync manual**
(`/api/subscriptions/sync`), cuota al publicar, cancelación
(`/api/subscriptions/cancel`), pausa por impago (MP pausa → llega
`subscription_preapproval` con `paused` → deja de contar como activa).

**Todavía no:** días de gracia configurables, auto-suspender las instancias ya
publicadas cuando cae la suscripción (hoy: no podés publicar nuevas, las viejas
siguen hasta despublicarlas o suspenderlas con `x-admin-token`), proración al
cambiar de plan, emails de alta/impago/baja.
