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

Opcional: `HOSTED_FREE_QUOTA` (default `1` = el plan gratis incluye 1 sección
hosteada publicada; `0` = LAB 100% de pago). `HOSTED_TRIAL_DAYS` (default `7`)
— días de prueba gratis en la primera alta; viajan a MP como
`auto_recurring.start_date` (fecha del primer cobro). `HOSTED_GRACE_DAYS`
(default `7`) — tolerancia por cobro fallido, no confundir con la prueba: días
que el plan sigue cuando una renovación no se cobró. MP reintenta hasta 4 veces
en 10 días; si cobra pasada la tolerancia, el plan vuelve solo. El primer cobro
(fin de la prueba) tiene como mucho 1 día.

> **Por qué `start_date` y no `free_trial`:** MP documenta `free_trial` solo
> para `/preapproval_plan`; en `/preapproval` sin plan el campo documentado
> para diferir el primer cobro es `start_date`, y además sirve para fechas
> arbitrarias (los días ya pagados al re-suscribirse).
>
> **Verificado en sandbox (2026-09-25)**, vendedor y comprador de test:
> - `start_date` +7 días → `next_payment_date` +7 días; MP lo registra solo
>   como `free_trial: { frequency: 7, frequency_type: 'days' }`.
> - Autorizada con tarjeta de test → `authorized`, ninguna cuota creada ni
>   cobrada; primer cobro agendado a +7 días.
> - `start_date` +25 y +330 días → aceptados (re-suscripción sin doble cobro,
>   también en anual).
> - `free_trial` en `/preapproval` (lo que se mandaba antes) también lo acepta
>   (+7 días). Sin nada, `next_payment_date` = el momento del alta.
> - Cancelar dos veces → 400 `You can not modify a cancelled preapproval`:
>   `cancelPreapprovalConfirmed` lo toma como baja hecha.
> - **Anual:** MP solo acepta `frequency_type` `days` / `months`; con `years`
>   responde 400 y el alta anual fallaba siempre (bug corregido 2026-09-26).
>   El anual va como `frequency: 12, frequency_type: 'months'`
>   (`billingFrequency`).

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
`priceYearly` e `instanceQuota`. Cuotas fijas (5 / 15 / sin tope).

Precios vigentes (ARS/mes · año, fijados por el owner 2026-09):
- Starter 24.900 · 249.000
- Pro 99.900 · 999.000
- Studio 299.900 · 2.999.000

- ARS enteros, sin decimales, sin fx.
- `priceYearly` = `priceMonthly × 10` (2 meses gratis), siempre < `× 12` →
  esa diferencia es el "ahorro" que muestra el front.
- `instanceQuota`: secciones **publicadas** que permite el plan. `Infinity` =
  sin tope (se serializa a `null` en el wire → el front lo lee como "ilimitado").

Cambialos y redeploy. No hace falta tocar nada en MP (el monto viaja en el alta).

### Cuota gratis (`HOSTED_FREE_QUOTA`)

Env en Railway, **default `1`**: cuántas instancias hosteadas puede tener un
usuario **sin** suscripción.
- `1` (default) → el plan gratis incluye 1 sección hosteada publicada (sin
  tarjeta). Crear/publicar una 2da → `402`.
- `0` → **LAB 100% de pago**. Un usuario free ni crea borradores. Lo publicado
  antes deja de servir (freeze) y vuelve al re-suscribirse.

---

## 4. Probar un alta real — ✅ confirmado (2026-09)

`createPreapproval` con `auto_recurring` inline (monto por alta, sin plan
pre-creado en MP) **funciona** contra MP real.

Requisito: `MP_ACCESS_TOKEN` en prod (apaga el mock; `MP_SUBS_ACCESS_TOKEN`
solo si querés app separada). Se puede probar contra **localhost** sin túnel
usando el sync manual (paso 4).

> **MP para suscripciones NO tiene `auto_return`.** Tras autorizar, muestra la
> pantalla de éxito con el botón **"Volver al sitio del vendedor"** (va a
> `${CLIENT_URL}/lab?suscripcion=volver`). No redirige solo — es el
> comportamiento normal de PreApproval, no un bug. Al volver con ese parámetro,
> `/lab` sincroniza solo (mismo efecto que el botón de `/account`).

1. `/lab` logueado → **Planes** → **Probar 7 días gratis** / **Suscribirme**.
2. Redirige al `init_point` de MP → autorizás con una
   [tarjeta de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/your-integrations/test/cards)
   (usuario de test como pagador).
3. Volvés a `/lab`: se sincroniza sola y avisa si ya está activa.
4. **Bajar el estado real desde MP.** Dos caminos, el mismo efecto:
   - **Webhook** (prod): MP dispara `subscription_preapproval` →
     `POST /api/webhooks/mercadopago` → pasa a `authorized` y setea
     `currentPeriodEnd` (el primer cobro). Necesita que la URL sea pública.
   - **Sync manual** (sirve en localhost, sin túnel): automático al volver a
     `/lab`, o `/account` → **Sincronizar con Mercado Pago**, o
     `POST /api/subscriptions/sync` a mano. Consulta el preapproval por API y
     aplica el mismo cambio que haría el webhook.
5. **Re-verificar la prueba gratis** (ya verificada en sandbox, ver arriba;
   útil si MP cambia algo): con la suscripción autorizada, consultá el
   preapproval (`mpPreapprovalId` de la fila, o el panel de MP):

   ```bash
   curl -s https://api.mercadopago.com/preapproval/<ID> \
     -H "Authorization: Bearer $MP_ACCESS_TOKEN" \
     | jq '{status, next_payment_date, start: .auto_recurring.start_date}'
   ```

   `next_payment_date` tiene que caer ~7 días después del alta (y coincidir
   con `start_date`). Si algún día queda en el día del alta, MP dejó de
   diferir el cobro con `start_date` y hay que pasar a `/preapproval_plan`
   (con `free_trial` documentado).
6. `GET /api/subscriptions/me` muestra `plan` y `quota` del tier.
7. Publicá más secciones que el free tier → te deja.

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

## Estados y acceso

`resolveEntitlement` (`server/services/subscriptions.js`) es la fuente de
verdad; la UI (`usePlan`) solo lee `/api/subscriptions/me`.

| Situación | Acceso | UI |
|---|---|---|
| Prueba | plena hasta `trialEndsAt` (= primer cobro) | "Prueba gratis · primer cobro el …" |
| Activa | hasta `currentPeriodEnd` | "Activa · próximo cobro el …" |
| Cobro pendiente / rechazado | sigue en **gracia**: 1 día si nunca pagó, `HOSTED_GRACE_DAYS` si ya pagó (`pastDue`) | aviso con la fecha de suspensión |
| Suspendida (gracia vencida) | free; sigue abierta en MP y un reintento cobrado la revive (`lapsedPlan`) | aviso + cancelar (corta los reintentos) |
| Cancelada | hasta `currentPeriodEnd`, también si después llega el webhook `cancelled` | "Cancelada · acceso hasta …" + Reactivar |
| En pausa (MP) | hasta `currentPeriodEnd`, sin gracia | "En pausa en MP · acceso hasta …" |

- **Período:** solo lo extiende un cobro aprobado (`payment.status ===
  'approved'`; `processed` solo no alcanza: MP deja así la cuota cuando agota
  los reintentos con el pago rechazado). Queda en `debit_date + 1 ciclo`, un
  valor absoluto: webhooks duplicados o en otro orden no regalan días.
- **Cancelar:** si MP no confirma la baja → 502 y no se marca nada (una baja
  local que MP no hizo seguiría cobrando).
- **Re-suscribirse tras cancelar** (también mensual↔anual): el primer cobro de
  la nueva (`start_date`) es cuando termina lo ya pagado → no paga dos veces.
- **Re-suscribirse con una renovación caída:** primero se da de baja la vieja en
  MP; si MP no deja, 502 y no se abre otra.
- **Altas a medio hacer:** un nuevo intento cancela en MP el preapproval
  pendiente y abre otro (sin bloqueo de 30 min); si resulta que se había
  completado, se activa. Un alta abandonada no consume la prueba.

Logs greppables que piden revisión manual (reembolso / baja):
`subs cancel FALLÓ`, `subs alta FALLÓ`, `subs COBRO SOBRE BAJA`,
`subs COBRO SOBRE SUSCRIPCIÓN REEMPLAZADA`, `subs DOBLE SUSCRIPCIÓN`,
`subs MP AUTORIZADA SOBRE BAJA`, `subs change RECONCILE`.

## Tests

| Qué | Contra qué | Cuándo |
|---|---|---|
| `npm test` → `subscriptions*.test.js` | MP simulado en memoria (`__tests__/helpers/fakeMercadoPago.js`), webhooks firmados, mails interceptados | siempre, sin red ni credenciales |
| `subscriptionsJourney.test.js` | recorridos con el **reloj simulado**: alta → prueba → cobro del día 7 → renovación → baja → vencimiento; arrepentimiento en la prueba; tarjeta rechazada; upgrade; mensual → anual | dentro de `npm test` |
| `npm run check:mp-sandbox` | **sandbox real de MP** con las mismas funciones de la app: prueba de 7 días, anual, alta autorizada con tarjeta de test (no cobra antes), cambio de plan (cambia el monto de la misma suscripción, no abre otra ni cobra en el acto), bajas | cuando cambie algo de MP; necesita `MP_TEST_ACCESS_TOKEN`, `MP_TEST_PUBLIC_KEY`, `MP_TEST_PAYER_EMAIL` (credenciales de **prueba**; aborta si el token no es de un usuario de test) y salida a `api.mercadopago.com` |

Lo que ningún test cubre: la entrega de webhooks a producción (se ve en el
historial de notificaciones de la app en MP; sano al 2026-09-26: 100 % con
200), el cobro real del día 7 y los mails reales. Tras cada deploy que toque
suscripciones: una alta real con tarjeta propia, cancelada dentro de la
prueba → llegan los dos mails y no se cobra nada.

## Qué maneja el código y qué no

**Sí:** alta con prueba, sync por webhook, al volver del checkout o manual,
cuota al publicar, gracia por cobro pendiente/rechazado, pausa, suspensión
(las publicadas por encima del tope free dejan de servir y reviven al
re-suscribirse), cancelación confirmada contra MP, re-suscripción sin doble
cobro, mails de alta y de baja.

**Todavía no:** mail de pago rechazado, reconciliación automática del caso
`RECONCILE` del cambio de plan, proración al cambiar de plan, reembolsos
automáticos.
