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

## Email de confirmación (Resend)

El mail **solo se envía cuando la orden pasa a `paid`**. Si quedó `pending`
(pago de prueba sin webhook / sin confirm), no hay correo.

En Railway:

1. Creá cuenta en [resend.com](https://resend.com) y una API key.
2. Verificá tu dominio (DNS) o, en modo prueba de Resend, solo podés enviar
   al email con el que te registraste.
3. Variables:
   ```
   EMAIL_ENABLED=true
   RESEND_API_KEY=re_...
   EMAIL_FROM=SCROLLLAB <compras@tu-dominio-verificado.com>
   EMAIL_REPLY_TO=hola@tu-dominio.com
   ```
4. Redeploy del API.

Después de confirmar el pago y generar el ZIP, el backend envía un detalle
de orden con CTA a `/account`. La orden guarda el estado del envío y Resend
recibe una `Idempotency-Key`, por lo que los reintentos no duplican el correo.

El email es un comprobante/detalle de compra, no una factura fiscal de ARCA.

## Notas

- Una sola réplica de API hasta tener storage compartido (S3/R2) — el volume de Railway no se comparte entre instancias.
- Precios siempre salen de `server/catalog.js`; el cliente nunca define precio.
