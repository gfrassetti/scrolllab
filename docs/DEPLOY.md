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
DOWNLOAD_TTL_SECONDS=900
AUTH_DEV_ENABLED=false
MP_MOCK_ENABLED=false
COOKIE_SAME_SITE=none       # si front y API son orígenes distintos
```

El boot **falla** si faltan secretos, si Mongo no conecta, o si mock/dev quedan activos.

## Descargas: link efímero, re-descargas libres

El vector de abuso es que el comprador **comparta el link**, no que se baje el
ZIP muchas veces. Por eso los dos límites están invertidos respecto de la
versión vieja (link de 30 días + tope de 50 bajadas), que castigaba al comprador
legítimo y dejaba un link repartible durante un mes:

- `DOWNLOAD_TTL_SECONDS=900` — el link firmado vive **15 minutos** y se emite
  recién cuando el comprador toca Descargar. Alcanza de sobra para arrancar,
  pausar y reanudar un ZIP en una conexión lenta: el TTL se chequea al abrir el
  request, no mientras el archivo baja.
- `MAX_DOWNLOADS=0` (o sin setear) — **sin tope**. Es la norma del mercado
  (Envato, Creative Market, Gumroad): re-descargás desde tu cuenta para siempre,
  mientras tengas sesión y seas dueño de la orden.

`downloadCount` **se sigue contando** en cada orden: sirve para detectar abuso y
para soporte, pero ya no bloquea nada. Si alguna vez hace falta frenar a alguien
puntual, poné `MAX_DOWNLOADS` en un número > 0 y vuelve el tope duro.

Si `DOWNLOAD_TTL_SECONDS` quedó viejo (largo), el boot lo avisa por log pero
**no lo pisa**: el valor del entorno manda. Un link vencido no muestra un JSON
crudo: el API redirige a `/account?download=expired` y Mis compras explica que
hay que tocar Descargar otra vez.

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

**Trampa del panel:** la config de webhooks tiene dos pestañas, **Modo de prueba**
y **Modo productivo**, y **cada una guarda su propia URL**. Un pago productivo
notifica solo a la URL de Modo productivo: si esa pestaña está vacía no llega
ningún webhook y la orden queda `pending` para siempre, aunque la de prueba esté
bien cargada. La clave secreta, en cambio, es de la aplicación y se comparte entre
ambos modos, así que `MP_WEBHOOK_SECRET` es uno solo.

El evento a tildar es **Pagos (legacy)**, que manda `type=payment`: es lo que
filtra el handler. «Order (Mercado Pago)» tiene otro payload y se ignora.

**Importante (doc oficial):** los pagos creados con **credenciales de prueba no envían webhooks**. Por eso el front, al volver a `/checkout/success`, llama a `POST /api/checkout/confirm` con el `payment_id` de la query y marca la orden como paga. En producción el webhook sigue siendo la fuente principal; el confirm actúa de respaldo.

## Diagnóstico: «Error interno» en /checkout/success

En producción `errorHandler` enmascara todo 5xx como «Error interno», así que ese
recuadro rojo siempre significa que `POST /api/checkout/confirm` devolvió 500 —
nunca un problema de Mercado Pago. La pantalla muestra abajo un **código de
referencia**: es el `requestId` del pedido, y el log de Railway trae el stack con
ese mismo id entre corchetes.

```
[<requestId>] TypeError: ...
```

Los errores esperados ya no son 500: pago en proceso (409), pago rechazado (400),
orden inexistente (404), pago de otra cuenta (403), MP caído o token de otro
entorno (502/503/504 con mensaje propio). Confirmar un pago que el webhook ya
cumplió devuelve 200 con la orden.

## Mercado Pago — pasar a producción

En [Mercado Pago Developers](https://www.mercadopago.com.ar/developers):

1. Abrí tu aplicación → pestaña **Producción** (no Prueba).
2. Copiá el **Access Token** de producción → `MP_ACCESS_TOKEN` en Railway.
3. Webhooks → pestaña **Modo productivo** (no alcanza con Modo de prueba) → URL:  
   `https://TU-API/api/webhooks/mercadopago`  
   con el evento **Pagos (legacy)** tildado.
4. Copiá la **clave secreta** de firma del webhook → `MP_WEBHOOK_SECRET`
   (es la misma para los dos modos).
5. En Railway / prod:
   ```
   MP_MOCK_ENABLED=false
   AUTH_DEV_ENABLED=false
   NODE_ENV=production
   CLIENT_URL=https://www.scrolllab.com.ar
   API_PUBLIC_URL=https://TU-API   # HTTPS obligatorio
   ```

   `CLIENT_URL` tiene que ser el host canónico que sirve el sitio (hoy `www`,
   porque el apex hace 308 a `www` en Vercel). El CORS y la defensa CSRF
   aceptan ese origin **más la variante apex/www del mismo dominio**, porque
   Mercado Pago puede devolver al apex y el POST de confirmación moría en 403
   «Origen no permitido». Cualquier otro host (otro dominio, otro subdominio,
   otro esquema) sigue rechazado: no hay wildcards.
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

### Composición del builder: precio por tramos

No es un precio plano. `priceCustomRecipeUsd()` (servidor) y
`estimateCustomPriceUsd()` (cliente) calculan lo mismo:

```
base (USD 235, incluye 8 secciones)
+ USD 15 × secciones por encima de 8
+ USD 39 si la receta trae alguna sección commerce/
```

- Constantes: `CUSTOM_BASE_PRICE_USD` / `CUSTOM_BASE_SECTIONS` /
  `CUSTOM_EXTRA_SECTION_USD` en `src/lib/pricing.js`, espejadas en
  `server/catalog.js`. `npm run check` falla si se despegan.
- **Cuenta cada entrada de la receta**, incluidas nav, footer y repeticiones:
  cada una es un componente renderizado en el `App.jsx` del ZIP. El tope son
  30 (`maxRecipeSections` en `server/config.js`, espejado en
  `MAX_CUSTOM_SECTIONS`).
- Anclajes: 8 secciones = el piso, 10 = USD 309, 30 = USD 609. El piso queda
  arriba del template más caro (RATIO / Beat, USD 269).
- El carrito **no guarda el monto**: lo recalcula desde la receta con la misma
  fórmula, así una composición vieja en `localStorage` no muestra un precio que
  el checkout ya no cobra.

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

## Tarjetas para compartir (og por demo) — front en Vercel

El SPA devuelve el mismo `index.html` en toda ruta, y Facebook / LinkedIn / X /
WhatsApp / Slack no ejecutan JS: sin esto, cualquier demo compartida mostraba la
tarjeta de la home.

- `npm run gen:og` genera `public/og/<sku>.jpg` (1200×630, una por demo pública)
  con Chromium + Google Fonts (necesita red). **Se commitean**: si falta alguna
  el build falla a propósito. `npm run gen:og nocturne` regenera una sola.
- `npm run build` corre `vite build` y después `scripts/gen-share-pages.mjs`, que
  emite `dist/templates/<sku>/index.html` y `dist/builder/index.html`: el mismo
  HTML del build con sus tags `og:*` / `twitter:*` (lógica en `src/lib/sharePages.js`).
  Las demos siguen `noindex` con canonical a la home; solo cambian las tarjetas.
- Las rutas salen de `publicDemoSkus()` (`src/lib/pricing.js`): al sumar un
  modelo, agregá su `templates.<sku>` en `en.json`, su poster en `public/catalog/`
  y corré `npm run gen:og <sku>`.
- Vercel da prioridad al filesystem sobre los rewrites, y con `trailingSlash`
  sin definir `/x` sirve `x/index.html` sin redirigir. `vite preview` **no** lo
  hace (cae al SPA sin barra final): verificalo en un preview de Vercel con
  `curl -s https://<preview>/templates/nocturne | grep og:image`.
- Para revisar una tarjeta en las redes: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/),
  [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/). Si ya
  compartieron el link antes, hay que pedir el re-scrape.
- Vercel sí sirve `/templates/<sku>` sin barra final desde el archivo estático
  (verificado en producción el 2026-09-18: `og:image` de CHAPTERS = `/og/chapters.jpg`).

## Páginas de producto (SEO) — `/plantillas/<sku>`

Una página por template en venta, en español, para que Google los encuentre por
lo que hacen y lo que cuestan. Las demos (`/templates/<sku>`) siguen `noindex`:
son pantalla completa con textos de relleno.

- El texto sale de `templates.<sku>` y `builder.sections.<sku>` de `es.json` más
  `PRODUCT_COPY` en `src/lib/productPages.js`. Ese objeto lo leen la página de
  React (`src/pages/ProductPage.jsx`), el HTML del build y los tests, así que no
  se despegan. Las secciones son opcionales (COMIC no está en el builder y sale sin
  esa lista).
- `npm run build` emite `dist/plantillas/<sku>/index.html` con title, descripción,
  canonical, tarjeta `og/<sku>.jpg`, datos `schema.org/Product` (precio de lista en
  USD, el mismo que muestra la página) y el contenido dentro de `#root`, fuera de
  pantalla: lo lee quien no ejecuta JS y React lo reemplaza al arrancar.
- El cuerpo va siempre en español (lo que se indexa), aunque el navegador esté en
  inglés: Googlebot pide en inglés y, si no, indexaría la versión en inglés.
- Al sumar un template a la venta: agregá su URL en `public/sitemap.xml` y en el
  `ItemList` de `index.html`. `npm test` (`productPages.test.js`) falla si falta,
  y también si falta su `public/og/<sku>.jpg` o `public/catalog/<sku>.jpg`.
  `robots.txt` ya cierra `/plantillas/` a los bots de IA, como el resto del catálogo.
- Una sola vez: en [Google Search Console](https://search.google.com/search-console)
  agregar `https://www.scrolllab.com.ar` (verificación por DNS, que está en Vercel)
  y enviar `sitemap.xml`. Sin eso Google igual llega por los links de la home, pero
  más lento y sin decirte con qué búsquedas te encuentran.
- Los resultados tardan semanas o meses. Mirar en Search Console, a las 4 a 6
  semanas, qué búsquedas muestran las páginas antes de tocar los textos.

## Cupón de bienvenida (por cuenta, sin formulario)

Quien entra con su cuenta de Google y todavía no compró recibe un cupón del 10%
para su **primera compra**. No hay formulario en el sitio: el cupón sale de la
cuenta (antes había una franja en la home que pedía el mail; se sacó). Sin
newsletters: el único mail que sale es el cupón, una sola vez.

**Flujo**
- Al haber sesión, el front (`WelcomeCouponSync`, montado en `App.jsx`) pide
  `POST /api/coupons/welcome` (con sesión; 120 por hora **por usuario**, no por IP,
  porque se pide en cada carga de página: si se cortara, el comprador perdería el
  descuento sin enterarse). Manda el idioma y los `utm_*` guardados.
- La primera vez el servidor crea el cupón en la colección `leads` (en dev
  `storage/db/leads.json`, `source: "account"`): código `SL-XXXXXX`, uno por mail,
  vence a los 14 días, un solo uso, y con `EMAIL_ENABLED=true` sale **un mail**
  por Resend diciendo que el descuento ya está en la cuenta y se aplica solo (el
  código va en el pie, solo de referencia). Las siguientes veces devuelve el mismo
  cupón, sin mail.
- Un cliente que ya compró (`eligible: false`) no recibe cupón ni queda anotado.
- El carrito (`CartPage.jsx`) lo aplica solo si hay sesión y muestra una línea con
  el descuento y el vencimiento; la cuenta (`AccountPage.jsx`) lo menciona en una
  línea. Sin sesión no se muestra nada. No hay campo para escribir códigos.
- `POST /api/checkout` recibe **solo el código**. El servidor lo revalida (existe,
  no usado, no vencido, es de ese mail y el usuario no tiene compras pagas) y
  descuenta sobre el precio de lista en USD (`discountedArsFromUsd`, mismo
  redondeo que `arsFromUsd`). Así el monto de la preference de Mercado Pago,
  `order.total` y lo que compara el webhook coinciden. El cliente nunca manda un
  precio ni un %.
- Se canjea cuando la orden pasa a `paid` (`markOrderPaid`): webhook, confirm o
  mock. Canjear es contabilidad: si falla, no frena la entrega. Al confirmar el
  pago el front también borra el cupón guardado.
- Aplica a modelos, bundle y composiciones del builder. No a LAB.
- **Es personal**: el cupón se crea con el mail de la cuenta, así que solo vale
  pagando con esa cuenta (los puntos y la `+etiqueta` de Gmail cuentan como el
  mismo mail). Con otra cuenta el checkout responde 403 con
  `code: coupon_other_account`.
- El endpoint público `POST /api/leads` **ya no existe** (servía para anotar
  cualquier mail y mandarle un cupón a un tercero). Los cupones que se generaron
  con la franja siguen valiendo: al entrar con esa cuenta se devuelve el mismo
  cupón, sin mail nuevo.

**Ajustes**: constantes, no env. `WELCOME_COUPON_PERCENT`, `WELCOME_COUPON_DAYS` y
`WELCOME_COUPON_BOUND_TO_EMAIL` en `server/catalog.js`; el porcentaje está
espejado en `src/lib/pricing.js` y `npm run check` falla si se despegan.

**Medición**
- `npm run leads:export > leads.csv` saca la lista, con el cupón, si lo canjearon
  y de qué canal llegó (`utmSource`, `utmMedium`, `utmCampaign`: los `utm_*` de la
  primera visita, guardados 30 días, que viajan con el pedido del cupón).
  `npm run leads:stats` resume cuentas y canjes por canal y por campaña. Ambos
  usan la misma base que el server.
- Brevo es **opcional** y no se usa: el alta ya no sube sola. `npm run leads:sync`
  sube a mano los pendientes si algún día se configura `BREVO_API_KEY`.
- GTM: el front empuja `generate_lead` (con `lead_source: "account"`) al dataLayer
  cuando se crea el cupón de una cuenta nueva. Falta el trigger + tag de GA4 en el
  contenedor.
- La política de privacidad (es/en) dice que se guarda el cupón de bienvenida
  (mail, cuándo, canal y si lo usaste) y que se manda por mail.

**Probar con Mercado Pago real**: los tests y la prueba en el navegador usan el
pago simulado. Antes de promocionarlo, hacé una compra de prueba con cupón con
credenciales de prueba de MP y mirá que el monto cobrado sea el descontado.

## Notas

- Una sola réplica de API hasta tener storage compartido (S3/R2) — el volume de Railway no se comparte entre instancias.
- Precios siempre salen de `server/catalog.js`; el cliente nunca define precio.
