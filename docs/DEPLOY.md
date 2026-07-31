# Deploy en Railway (API)

Este repo es un monorepo: Vite (front) + Express (API).

## Servicios recomendados

1. **API** — root del repo, start command: `npm run start`
2. **MongoDB Atlas** (o plugin Mongo de Railway) → `MONGODB_URI`
3. **Volume** montado en `/data` → `STORAGE_DIR=/data/orders`
4. **Front estático** (otro servicio o CDN) apuntando a la API con proxy `/api` o `VITE_API_URL`

## Variables obligatorias en producción

```
NODE_ENV=production
STORE=mongo
MONGODB_URI=...
SESSION_SECRET=...          # ≥24 chars, único
DOWNLOAD_SECRET=...
MP_ACCESS_TOKEN=...
MP_WEBHOOK_SECRET=...       # Tus Integraciones → Webhooks
EMAIL_ENABLED=true
RESEND_API_KEY=re_...
EMAIL_FROM=SCROLLLAB <compras@tu-dominio.com>
EMAIL_REPLY_TO=hola@tu-dominio.com
EMAIL_LOGO_URL=https://tu-front/logo.svg
CLIENT_URL=https://tu-front
API_PUBLIC_URL=https://tu-api
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://tu-api/api/auth/google/callback
STORAGE_DIR=/data/orders
DOWNLOAD_TTL_SECONDS=2592000
AUTH_DEV_ENABLED=false
MP_MOCK_ENABLED=false
COOKIE_SAME_SITE=none       # si front y API son orígenes distintos
```

El boot **falla** si faltan secretos, si Mongo no conecta, o si mock/dev quedan activos.

## Google OAuth (equivalente a “app registration”)

Creá **dos** OAuth clients en Google Cloud Console (APIs y servicios → Credenciales), tipo **Aplicación web**:

1. **Local** — redirect: `http://localhost:8787/api/auth/google/callback`  
   Orígenes JS: `http://localhost:5173`
2. **Producción** — redirect **exacto** (sin barra final):  
   `https://TU-API/api/auth/google/callback`  
   Orígenes JS: `https://TU-FRONT` (Vercel)

En Railway, `GOOGLE_CALLBACK_URL` debe coincidir **carácter por carácter** con el redirect de prod y con `API_PUBLIC_URL` + `/api/auth/google/callback`. El boot corta si no.

No mezcles localhost y prod en el mismo client. Rotá `GOOGLE_CLIENT_SECRET` si se filtró. Nunca lo subas al repo.

## Healthchecks

- Liveness: `GET /api/health`
- Readiness: `GET /api/ready` (Mongo + storage escribible)

## Webhook Mercado Pago

`notification_url` = `${API_PUBLIC_URL}/api/webhooks/mercadopago`

Validamos `x-signature` con `MP_WEBHOOK_SECRET` (SDK oficial).

**Importante (doc oficial):** los pagos creados con **credenciales de prueba no envían webhooks**. Por eso el front, al volver a `/checkout/success`, llama a `POST /api/checkout/confirm` con el `payment_id` de la query y marca la orden como paga. En producción el webhook sigue siendo la fuente principal; el confirm actúa de respaldo.

## Mercado Pago — pasar a producción

En [Mercado Pago Developers](https://www.mercadopago.com.ar/developers):

1. Abrí tu aplicación → pestaña **Producción** (no Prueba).
2. Copiá el **Access Token** de producción → `MP_ACCESS_TOKEN` en Railway.
3. Webhooks → agregá URL:  
   `https://TU-API/api/webhooks/mercadopago`  
   (eventos de **pagos** / `payment`).
4. Copiá el **secret** de firma del webhook → `MP_WEBHOOK_SECRET`.
5. En Railway / prod:
   ```
   MP_MOCK_ENABLED=false
   AUTH_DEV_ENABLED=false
   NODE_ENV=production
   CLIENT_URL=https://www.scrolllab.com.ar
   API_PUBLIC_URL=https://TU-API   # HTTPS obligatorio
   ```

   `CLIENT_URL` tiene que ser **exactamente** el host que sirve el sitio
   (hoy `www`, porque el apex hace 308 a `www` en Vercel). El CORS y la
   defensa CSRF comparan el `Origin` exacto: si acá va el apex, todos los
   POST desde `www` responden 403 «Origen no permitido».
6. Redeploy API. Probá un pago real chico o el flujo de sandbox **solo** con credenciales de prueba; prod usa plata real.

Sin `MP_WEBHOOK_SECRET` + token de prod, el boot en producción **falla** a propósito.

## Precios en USD, cobro en pesos

Mercado Pago Argentina **siempre procesa en moneda local**. Mandar
`currency_id: "USD"` no sirve: la propia doc de MP aclara que convierte el
monto a pesos al crear la preferencia, con una cotización que no controlamos.
Por eso la conversión es nuestra.

- Los precios de lista están en dólares: `server/catalog.js` (`unit_price_usd`)
  y `src/lib/pricing.js`. **Los dos archivos tienen que coincidir.**
- `server/fx.js` trae el dólar blue (venta) de `dolarapi.com`, lo cachea
  15 minutos, le aplica `FX_SPREAD_PCT` y cae a `FX_FALLBACK_RATE` si la API
  falla: una caída de la API externa no puede tumbar el checkout.
- El pesos final se redondea al millar de arriba y se calcula **al crear la
  orden**. Cada orden guarda `totalUsd` y `fxRate`, así el cobro queda auditable
  aunque la cotización se mueva después.
- El front muestra pesos usando la cotización que expone `GET /api/catalog`,
  pero el precio que se cobra lo fija el servidor.

Variables: `FX_RATE_URL`, `FX_SPREAD_PCT`, `FX_FALLBACK_RATE`,
`FX_CACHE_TTL_SECONDS`, `FX_OFFLINE`. Ninguna es obligatoria; sin nada
configurado usa blue de dolarapi con spread 0. Actualizá `FX_FALLBACK_RATE`
cada tanto para que el respaldo no quede viejo.

Para cobrar de verdad en dólares (comprador del exterior, tarjeta
internacional) hace falta un merchant of record aparte — Lemon Squeezy o
Paddle, ~5% + USD 0,50. No está integrado.

## Email de confirmación (Resend) — scrolllab.com.ar

El mail **solo se envía cuando la orden pasa a `paid`**. Si quedó `pending`
(pago de prueba sin webhook / sin confirm), no hay correo.

1. Cuenta en [resend.com](https://resend.com) → API key → `RESEND_API_KEY`.
2. **Domains → Add** → `scrolllab.com.ar`.
3. Resend te da registros DNS (TXT/MX/CNAME). Como el DNS está en **Vercel**
   (`ns1/ns2.vercel-dns.com`):
   - Vercel → Project o cuenta → **Domains** → DNS del dominio (o
     [vercel.com/domains](https://vercel.com/domains)) → **Add record** por cada
     uno que pida Resend.
   - Si más adelante pasás DNS a Cloudflare, mové esos mismos records ahí.
4. Esperá que Resend marque el dominio **Verified**.
5. Variables en Railway:
   ```
   EMAIL_ENABLED=true
   RESEND_API_KEY=re_...
   EMAIL_FROM=SCROLLLAB <compras@scrolllab.com.ar>
   EMAIL_REPLY_TO=hola@scrolllab.com.ar
   EMAIL_LOGO_URL=https://www.scrolllab.com.ar/logo.svg
   ```
6. Redeploy del API. Comprá un ítem de prueba (o mock en staging) y verificá
   que llegue el mail a Mis compras / inbox.

Después de confirmar el pago y generar el ZIP, el backend envía un detalle
de orden con CTA a `/account`. La orden guarda el estado del envío y Resend
recibe una `Idempotency-Key`, por lo que los reintentos no duplican el correo.

El email es un comprobante/detalle de compra, no una factura fiscal de ARCA.

## Notas

- Una sola réplica de API hasta tener storage compartido (S3/R2) — el volume de Railway no se comparte entre instancias.
- Precios siempre salen de `server/catalog.js`; el cliente nunca define precio.
