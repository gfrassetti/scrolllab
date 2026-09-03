# Hosted Component — plan de implementación

Servicio nuevo, en paralelo al actual. **No reemplaza nada.**

- **Servicio 1 (existe):** Builder → template/sección ZIP. Pago único, Checkout Pro.
  Se lleva el código, es suyo, no hay moat. Precio de activo.
- **Servicio 2 (esto):** Hosted Component. El usuario configura una sección en el
  builder y la sirve desde nuestro CDN con un `<script>`. Suscripción. El código
  nunca sale de nuestro lado; el moat es infra + key revocable + domain-lock.

Mismo catálogo de secciones alimenta los dos.

---

## Decisión de cobro: híbrido

| | One-time (ya existe) | Suscripción (nuevo) |
|---|---|---|
| Qué | Builder → template/sección ZIP | Hosted Component |
| API MP | `Preference` (Checkout Pro) | `PreApproval` |
| Credenciales | mismo access token | **mismo access token** |
| Webhook | misma URL, `type=payment` | misma URL, `type=subscription_*` |
| Modelo local | `Order` | `Subscription` |
| Al cobrar | empaqueta ZIP | extiende período, reactiva instancias |

Checkout Pro **se queda intacto**. `preapproval` se **suma** a la misma app de
MercadoPago. Ver `docs/mercadopago-dos-sistemas.md` para el detalle.

---

## Qué secciones se pueden hostear

No todas. Las que asumen ser dueñas del viewport (pin + scrub multi-pantalla,
Lenis sobre `window`, boot que bloquea scroll) no traducen bien a "una caja en la
página de otro".

- Flag en catálogo: `hostable: true | false` por SKU de sección.
- Las `hostable` llevan **badge naranja "HOSTED"** en el catálogo y en el builder.
- Las que no, simplemente no ofrecen el botón "Publicar como embed". Sin rework
  forzado.
- Candidatas directas: heroes, footers, reveals de una escena, secciones
  estáticas con WebGL de fondo.
- Flagship con scrolljack: 2–3 pueden reworkearse a "embed edition" (autocontenida,
  altura acotada, progreso por IntersectionObserver propio, no por scroll
  anfitrión). Es trabajo a mano por sección, decisión caso por caso.

---

## Fase 0 — Decisiones fijadas

- **Runtime del embed:** Preact + `preact/compat` embebido en el bundle IIFE
  (~15 KB gz; las secciones React andan casi sin tocar). No shippear React full.
- **Infra:** Cloudflare — Pages para el loader `.js`, Workers + KV para el config
  JSON, R2 para imágenes. CDN global, edge, costo en centavos por sitio.
- **Cuota del plan:** por cantidad de instancias hosteadas activas
  (ej. Starter 1 / Pro 5 / Studio 15). Pageviews solo como señal de abuso, no
  como métrica de cobro.
- **Cobro recurrente:** MP `preapproval` con **precios ARS fijos** (sin fx).
  Cada tier tiene monto mensual y monto anual; el anual va siempre por debajo de
  12× el mensual y se muestra como oferta ("Save 40%", estilo HorizonX). Cambiar
  un precio es una acción explícita sobre el plan, nunca automática.

---

## Fase 1 — Embed runtime — ✅ HECHA (después migrada a iframe, ver abajo)

Primera versión: `<script>` inline + Shadow DOM. Piloto `chapters/FooterCTA`,
verificado contra una página con CSS hostil (aísla, config remota, Tailwind +
GSAP + SplitText en el shadow root). Optimización: React→Preact + gsap recortado
bajó de 143 KB gz a 82 KB gz.

Esa versión inline quedó **reemplazada por el modelo iframe** (abajo) — el
`<script>` inline le da acceso total a la página del cliente y no se puede
garantizar seguridad. El código sigue en `embed/src/entry.jsx` como referencia.

---

## Fase 1b — Modelo iframe — ✅ HECHO Y PROBADO LOCAL

El cliente pega un `<script>` (**`loader.js`, 1.7 KB**) que **solo** crea un
`<iframe>` cross-origin sandboxeado. La sección corre **dentro del iframe, en
nuestro origen**. El navegador aísla ese iframe de cookies / formularios /
storage del host — verificado: `iframe.contentDocument` da `null` desde el host.

Probado en `embed/test/iframe-host.html` con 3 servidores (host :4178, frame
:4179, API :8787):

- ✅ El loader crea el iframe, lee `data-key`/`data-frame`/`data-api`
- ✅ El frame hace `fetch` de la config a la API y renderiza `FooterCTA` con los
  props publicados
- ✅ **Puente de altura**: el frame reporta su alto por `postMessage`, el loader
  dimensiona el iframe
- ✅ **Puente de inView**: el loader avisa cuándo el iframe entró en pantalla; el
  frame ahí revela + `ScrollTrigger.refresh()`
- ✅ **Aislamiento**: `contentDocument` bloqueado, el `#secret` del host
  inalcanzable
- ✅ Code-splitting real (cada sección un chunk); `@source` de Tailwind apuntando
  a `src/components/sections` para que se generen las clases

Pesos: loader 1.7 KB (host) · frame core 57.5 KB gz (nuestro origen, cache
compartida) · CSS 16.9 KB gz (amplio, pendiente scopear) · ~1 KB gz por sección.

**Pendiente del iframe:** puente de **scroll virtual** para secciones pineadas —
el loader hace `position:sticky` sobre un spacer en el host y manda progreso
0→1 al frame. Sin eso, el iframe sirve para secciones de altura acotada
(FooterCTA), no para las de pin/scrub. Más: versionado inmutable + SRI, CSP en
el origen del frame.

---

## Fase 2 — Secciones scrolljack ⚠️ — ✅ MECÁNICA PROBADA

Probado con `chapters/HorizontalPanels` (`variant="type"`) en
`embed/test/panels.html`. Resultado: **`pin: true` + `scrub` + `containerAnimation`
funcionan dentro del shadow DOM sin tocar la sección.** La sección se pinea y el
pan horizontal sigue el scroll linealmente.

Lo que hizo falta (ya implementado en `embed/`):

1. **Orquestar `ScrollTrigger.refresh()`** en `entry.jsx` — tras mount,
   `fonts.ready`, `load`, resize e `img` load. En el sitio lo hace
   `SmoothScrollProvider`; el embed no lo tiene y sin esto el pin no engancha.
2. **Stub de media** (`stubMedia` en `vite.config.js`) — en modo library Vite
   inlinea los `import png` de las secciones en base64 (bundle de 12 MB). En el
   embed las imágenes vienen de la config.
3. No hizo falta abstraer el scroll a un `scroller` configurable ni pasar a
   IntersectionObserver: ScrollTrigger con scroller `window` (default) anda sobre
   el scroll nativo del host.

### Por el iframe — ✅ HECHO (puente de scroll)

`embed/test/iframe-pin.html` con `chapters/HorizontalPanels` (`variant: "type"`),
3 servidores. El loader detecta modo PIN cuando el frame le manda
`scrolllab:pinlength` (= `scrollHeight - innerHeight` del frame, que crece por el
pin-spacer que crea ScrollTrigger). Ahí:

1. **Loader**: mete el iframe en un `<div data-scrolllab-pin>` de
   `viewportH + pinLen` de alto, y hace el iframe `position: sticky; top:0;
   height:100vh`. En cada frame calcula `progress = -wrapTop / pinLen` (0→1) y
   lo manda por `postMessage`.
2. **Frame**: al recibir `scrolllab:progress` hace
   `window.scrollTo(0, progress * scrollMax)`. La sección reacciona a **su
   propio scroll**, nativo — `pin: true` + `scrub` + `containerAnimation`
   funcionan sin tocar la sección.

Verificado: pin engancha (`iframeTop == 0`, sticky) en todo el rango, el track
horizontal panea al scrollear el host, y **el pin suelta** al pasar el rango
(el bloque del host de abajo queda accesible).

`chapters/HorizontalPanels` agregada a `HOSTABLE_SECTIONS` + `variant` a
`ALLOWED_PROPS_BY_SECTION` (preset `media`/`type`). Los `panels` (array) siguen
sin ser editables — limitación conocida.

**Costo:** en modo PIN la sección reserva `pinLen` px de scroll en el host
(~1600 px acá). Es inherente al pin — la alternativa sigue siendo una "embed
edition" de altura acotada, decisión de producto por sección.

---

## Fase 3 — Config store + editor

### Servidor ✅ (hecho, con tests + E2E)

1. Modelo `HostedInstance` (`server/models.js` + `db.js` + `fileStore.js`):
   `{ userId, key, sectionId, status: draft|published|suspended, domains[],
   draftProps, publishedProps, publishedAt }`. Key `pub_` + 24 hex, revocable.
2. API (`server/app.js`):
   - `GET  /api/embed/:key/config` — **público**, `ACAO: *`, `Cache-Control:30s`,
     domain-lock por `Origin`/`Referer`, 409 si no se publicó, 402 si suspendida
   - `GET  /api/hosted/sections` — lista de `HOSTABLE_SECTIONS`
   - `POST /api/hosted` — crea instancia en `draft` (auth)
   - `GET  /api/hosted` — lista las del usuario
   - `GET  /api/hosted/:id` — instancia completa (draft + published)
   - `PUT  /api/hosted/:id` — edita `draftProps`/`domains`; `publish:true` copia
     draft→published
   - `DELETE /api/hosted/:id`
3. Props validadas con `sanitizeSectionProps` (server/sectionFields.js).
   `HOSTABLE_SECTIONS` empieza en `['chapters/FooterCTA']` — se amplía cuando una
   sección tiene embed verificado + schema de props.
4. Tests: `server/__tests__/hosted.test.js` (5, verdes). E2E manual verificado:
   página en `:4178` → `fetch` cross-origin a la API → render de la sección
   publicada con los props del `PUT`.

### Editor (cliente) — ✅ HECHO

- **Nav**: link `LAB` al lado de `Builder` (`SiteHeader.jsx`, desktop + mobile).
- **`/lab`** (`src/pages/LabPage.jsx`): panel "Mis secciones hosteadas". Lista
  (`GET /api/hosted`), badge de estado, snippet + copiar para las publicadas,
  borrar, **＋ Nueva** (`POST /api/hosted` → va al editor).
- **`/lab/:id`** (`src/pages/LabEditorPage.jsx`): editor de una instancia.
  - form generado de `getSectionFields(sectionId)` (text/textarea/select)
  - **preview en vivo** de la sección real (`getSection().component`), con
    remonta debounced porque varias secciones corren SplitText/GSAP una sola
    vez y si no el texto editado no se refleja
  - textarea de dominios permitidos → `domains[]`
  - **Guardar borrador** (`PUT {draftProps, domains}`) · **Publicar**
    (`PUT {…, publish:true}`) · **Despublicar** (`PUT {unpublish:true}`)
- `src/lib/api.js`: `api.hosted{Sections,List,Get,Create,Update,Delete}`.
- i18n: bloque `lab.*` en `es.json` + `en.json`.

Verificado en dev (API file store): crear → editar campos → preview actualiza →
publicar → `publishedProps` + `status` persisten; lista muestra la card con
snippet.

### Editor — pendiente menor

6. Imágenes suben a R2, URLs en `draftProps` (solo cuando una sección hosteable
   tenga campos `image`; `FooterCTA` no tiene).
7. `data-api` / `data-frame` default del loader → dominio real cuando exista.

---

## Fase 4 — Suscripciones (MP preapproval) — ✅ HECHO (mock; falta enchufar MP real)

- **Planes** en `catalog.js`: `HOSTED_PLANS` (`hosted_starter/pro/studio`) con
  precio ARS fijo mensual + anual + `instanceQuota` (5/15/∞).
- **`server/services/mercadoPago.js`**: `createPreapproval()` (monto **inline**,
  sin plan pre-creado), `fetchPreapproval()`, `cancelPreapproval()` — usan
  `config.mpSubs.accessToken` (env `MP_SUBS_ACCESS_TOKEN`, aparte del Checkout
  Pro). **No hay seed ni plan IDs**: el precio sale de `HOSTED_PLANS`.
- **Modelo `Subscription`** `{ userId, plan, cycle, status, currentPeriodEnd,
  mpPreapprovalId }` + métodos db/fileStore. Una activa por usuario.
- **Webhook** con branch por `type`: `payment` (intacto) ·
  `subscription_preapproval` → `handlePreapprovalEvent` (sync status + período)
  · `subscription_authorized_payment` → log (el período lo cubre el evento
  anterior). Firma con `config.mpSubs.webhookSecret`.
- **Enforcement**: `assertCanPublish` en `PUT /api/hosted/:id {publish:true}` —
  cuenta instancias `published` del usuario vs cuota del plan (o
  `HOSTED_FREE_QUOTA`, default **0**). Además `POST /api/hosted` frena la
  creación de un usuario free que ya llegó a `HOSTED_FREE_QUOTA` (0 → no crea
  nada). La prueba de 7 días (`HOSTED_TRIAL_DAYS`) es el "probá antes de pagar".
- **Rutas**: `GET /api/subscriptions/plans` (público) ·
  `GET /api/subscriptions/me` (entitlement + uso) · `POST /api/subscriptions`
  (mock → `activateUrl`; real → `init_point`) ·
  `POST /api/subscriptions/:id/mock-activate` · `POST /api/subscriptions/cancel`.
- **Front**: `src/components/HostedPlans.jsx` en `/lab` — toggle mensual/anual,
  badge de ahorro, 3 columnas con precio/cuota/features, estado del plan actual +
  "Cancelar". El flujo mock activa y refresca; el real redirige al `init_point`.
- Tests: `server/__tests__/subscriptions.test.js` (5). Total 221 verdes.

**Falta (lo enchufás vos):** marcar los topics `subscription_preapproval` +
`subscription_authorized_payment` en el webhook de la app (misma URL que
Checkout Pro, `/api/webhooks/mercadopago`) y probar un alta real. **El token
lo reusa de `MP_ACCESS_TOKEN`** — no hay que agregar nada en Railway. Ver
`docs/mercadopago-suscripciones-setup.md`.

---

## Fase 5 — Endurecimiento + legal + lanzamiento

### Contenido — ✅ HECHO

- **Guía de instalación** en `/lab` (3 pasos: configurar → publicar → pegar el
  `<script>` antes de `</body>`).
- **FAQ** en `/lab` (7 preguntas: qué es, editar después, acceso a datos,
  Webflow/WordPress, despublicar/cancelar, dominios permitidos, vs Builder).
- **Home** (`TemplatesIndex.jsx`, sección "cómo funciona"): card de componentes
  hosteados + link a `/lab`.
- **Legal**: sección "Componentes hosteados (LAB)" en Terms (servicio continuo
  por suscripción, no entregable; código no licenciado; cobro por adelantado +
  renovación automática; cancelar = frena renovaciones, acceso hasta fin de
  período, sin reembolso de lo cobrado; despublicar/impago = embed off + freeze
  sobre cuota; cambio de precio con aviso; disclaimer de disponibilidad; uso
  aceptable) y en Privacy (config guardada y borrada al eliminar instancia/
  cuenta, logs de IP/UA/referer, embed aislado en iframe). Sin marca de
  borrador — conviene igual un repaso legal antes de escalar.
- i18n: `lab.guide*` / `lab.faq` / `home.lab*` + secciones en `terms`/`privacy`,
  ES + EN. Paridad de claves OK, 213 tests verdes.

### Endurecimiento técnico — ✅ HECHO (falta CDN real)

- **Versionado inmutable + SRI**: build a `embed-dist/v1/` (loader + frame).
  `embed/build-loader.mjs` escribe `manifest.json` con el hash sha384.
  `GET /api/embed/loader` → `{ version, url, integrity }` (lee el manifest,
  arma la URL con `EMBED_CDN_URL`). El snippet en LAB sale con
  `integrity="sha384-…" crossorigin="anonymous"` (`src/lib/embed.js`).
- **CSP en el frame** (`embed/frame/index.html`, meta): `default-src 'none'`,
  `script-src 'self'`, `style-src 'self' 'unsafe-inline' fonts.googleapis.com`,
  `font-src fonts.gstatic.com`, `img-src 'self' data: https:`, `connect-src
  https: http://localhost:*`. Probado: no rompe el render. Una sección WebGL
  puede necesitar `blob:` más adelante.
- **Pageviews** por instancia: `db.incHostedViews` en el endpoint de config
  (best-effort, no bloquea). Aproximado por el cache de 30s — alcanza para
  señal de uso/abuso. Se muestra en LAB ("N vistas").
- **Revocación de key**: `POST /api/hosted/:id/(un)suspend` con header
  `x-admin-token` (`ADMIN_TOKEN`). Sin UI. `suspend` → config responde 402 →
  el embed deja de renderizar. `unsuspend` → vuelve a `published`/`draft`.
- Tests: `server/__tests__/hosted.test.js` (8, verdes). 216 en total.

Hecho después:

- **Deploy del embed sin infra**: el loader deriva la URL del frame de su
  propio `src` (no más `FRAME_BASE_DEFAULT` fijo); `server/app.js` sirve
  `embed-dist/` en `/embed` si está presente (CORS `*`, sin `X-Frame-Options`,
  cache inmutable). `EMBED_CDN_URL` apunta a la API o a un CDN aparte. Ver
  `embed/README.md#deploy`.
- **Config con revalidación**: `/api/embed/:key/config` pasó de `max-age=30` a
  `max-age=0, must-revalidate` (+ `s-maxage=5` para un cache compartido). El
  ETag débil de Express hace baratos los 304 → al republicar, el cambio se ve
  en la próxima carga.
- **Freeze al caer el plan**: si el dueño se quedó sin suscripción activa (o
  bajó de plan), las publicadas por encima del tope dejan de servir (402, como
  suspendida), ordenando por `createdAt` — las más viejas quedan cubiertas.
  Chequeo perezoso en el endpoint de config, sin tocar `status`: al
  re-suscribirse reviven solas. `db.countPublishedHostedCreatedBefore`.

Pendiente: purge activo de un CDN al publicar (hoy alcanza con la
revalidación), badge "congelada por el plan" en la lista de LAB.

---

## Fase 6 — LANZADO (2026-09) — embed en producción

**El Servicio 2 está vivo end-to-end.** Verificado: LAB publica → snippet
`<script>` → loader crea iframe cross-origin → frame trae la config de Railway
(vía proxy de Vercel) → FooterCTA renderiza en una página ajena.

### Topología

| pieza | dónde |
|---|---|
| SPA (`/lab`, `/account`, catálogo) | Vercel, proyecto `scrolllab`, `https://www.scrolllab.com.ar` |
| API | Railway, `https://scrolllab-production.up.railway.app` (`API_PUBLIC_URL`) |
| **Embed** (loader + frame) | Vercel, proyecto `scrolllab-embed`, `https://embed.scrolllab.com.ar` (output `embed-dist/`, build `npm run build:embed`) |
| DNS de `scrolllab.com.ar` | Vercel (nameservers) |
| `vercel.json` (raíz) | proxya `/api/*` → Railway; el fallback SPA excluye `/v1/` |

### URL scheme

- Snippet: `<script src="https://embed.scrolllab.com.ar/v1/loader.js" data-scrolllab data-key="pub_…" data-api="https://www.scrolllab.com.ar" async>`. **Sin prefijo `/embed/`** (el archivo directo, sin depender de rewrites).
- `EMBED_CDN_URL` (Railway): opcional, default `https://embed.scrolllab.com.ar`.
- `data-api`: lo mete `loaderInfo()` desde `API_PUBLIC_URL`; el frame es
  estático y no sabe dónde está la API si no. El fetch de config va a
  `https://www.scrolllab.com.ar/api/embed/:key/config` → `vercel.json` lo
  proxya a Railway (mismo-origin del SPA → sin CORS del lado del browser).
- `EMBED_SRI` (Railway): `true` → el snippet suma `integrity`+`crossorigin`
  (requiere el host del embed con `Access-Control-Allow-Origin: *`). Default
  off para que ande sin configurar headers.

### Cuota gratis

`HOSTED_FREE_QUOTA` (Railway, default **0**): cuántas instancias hosteadas
puede tener un usuario **sin suscripción**.
- `0` (default) → LAB 100% de pago: un usuario free no crea ni borradores
  (`POST /api/hosted` → 402). Lo publicado antes deja de servir (freeze) y
  vuelve al re-suscribirse. La prueba de 7 días es el "probá antes de pagar".
- `1+` → free tier real: N instancias sin pagar (crear + publicar hasta N).

### Suscripción MP — flujo real confirmado

`createPreapproval` con `auto_recurring` inline (monto por alta, sin plan
pre-creado) **funciona** contra MP real. Notas:
- MP para suscripciones **no tiene `auto_return`** → tras autorizar muestra
  "Volver al sitio del vendedor" (va a `${CLIENT_URL}/lab`). No redirige solo.
- La suscripción arranca `pending` local hasta el webhook
  `subscription_preapproval` **o** el botón "Sincronizar" en `/account`.
- Renovación: el webhook `subscription_authorized_payment` extiende
  `currentPeriodEnd` (`handleAuthorizedPaymentEvent`, trae el authorized_payment
  por REST para mapear al preapproval).

### Fixes del deploy (2026-09)

- `loaderInfo()` arma `${EMBED_CDN_URL}/v1/loader.js` (sin `/embed/`).
- `data-api` en el snippet (`src/lib/embed.js` + `loaderInfo()`); el frame
  aborta con error claro si falta.
- `markModified('publishedProps'/'draftProps')` en el PUT de publish — Mongoose
  no persistía los campos Mixed al reasignarlos.
- El config endpoint sirve la instancia publicada aunque `publishedProps` esté
  vacío (antes: 409). Guard = solo `status === 'published'`.
- FLOW/PIN se decide por `.pin-spacer` real (ScrollTrigger), no por
  `scrollHeight > viewport` — FooterCTA (footer alto, sin pin) caía en PIN y se
  veía cortada.
- Sección **inline** en el bundle del frame (no más `import()` lazy → no más
  404 del chunk si el CDN/rewrite falla).
- El frame se auto-revela si se abre fuera de un iframe (URL directa = preview).
- `embed-dist/` salió de `dist/` (`vite build` del SPA lo vaciaba).

### (histórico) Endurecimiento — plan original

1. **Domain-lock:** config trae `domains[]`; endpoint valida `Origin`/`Referer`;
   loader valida `location.hostname`. Fuera de lista → no renderiza.
2. Revocación de key inmediata desde panel admin.
3. Rate-limit del endpoint de config + cache en edge (TTL corto, purge on publish).
4. Ofuscación/minificación del bundle.
5. **Panel de cuenta "Mis secciones hosteadas":** lista, editar, pausar, eliminar,
   estado de suscripción, uso en pageviews.
6. **Legal:** ToS (uptime disclaimer, cancelar = embed off, uso aceptable),
   Privacy (IPs/cookies/GDPR por el CDN y el embed), refund policy de suscripción.
7. **Docs/FAQ en el home:** instalación del script, qué pasa al cancelar, límites
   por plan, diferencia ZIP vs hosted.
8. Contador de pageviews por instancia (log del Worker) para uso y abuso.

---

## Fase 7 — Catálogo hosteable: familia footer (2026-09)

Primer paso de la expansión más allá de `chapters/FooterCTA`. Se agregan los
**6 footers restantes** del catálogo a `HOSTABLE_SECTIONS`:

`nocturne/OutroCTA` · `monolith/FooterBrutal` · `fizz/FooterSplash` ·
`velocity/FooterVelocity` · `atelier/FooterAtelier` · `atrium/FooterAtrium`

Por qué estos y no otros: comparten la mecánica de FooterCTA — SplitText de
entrada `once` (o estáticos), **sin pin, sin scrub, alto acotado** → FLOW puro
en el iframe. Todos sus textos son props string ya declaradas en
`SECTION_FIELDS` / `ALLOWED_PROPS_BY_SECTION` (paridad ya verificada por
`scripts/check-consistency.mjs`).

Qué hizo falta:

1. `embed/src/registry.js` — import estático + entrada en `SECTIONS` de cada uno
   (inline en el bundle del frame; +~3 KB gz JS).
2. `embed/frame/main.css` — tokens `@theme` de cada modelo (NOCTURNE
   `salt/acid/noir`, MONOLITH `carbon/klein/concrete`, FIZZ `foam/fizz/grape`,
   ATRIUM `atrium-ink/atrium-paper`) + fuentes (`--font-brico`, `--font-anton`,
   `--font-mono`) + clase `.atrium-note`. Deben coincidir con `src/index.css`.
   (+~1.5 KB gz CSS.)
3. `embed/frame/index.html` — Bricolage Grotesque + Anton + JetBrains Mono al
   `<link>` de Google Fonts.
4. `server/sections.js` — los 6 IDs en `HOSTABLE_SECTIONS`.

El editor (`/lab`), el dropdown "＋ Nueva", el preview en vivo y el snippet
funcionan sin tocar nada más: leen `HOSTABLE_SECTIONS` + `getSectionFields`.

Tests: 272 unit + 6 e2e Chromium + `npm run check`, todo verde. El e2e sigue
ejercitando `chapters/FooterCTA` (misma ruta de render).

### Siguiente tanda (candidatas, aún NO hosteables)

Bloques de contenido estáticos, entrada-`once`, sin scrub: `atrium/ManifestoType`,
`atrium/ScopeSerif`, `atelier/StudioCards`. Requieren verificación de render en
el iframe caso por caso. **Fuera**: scrub sin pin (`chapters/ManifestoReveal`,
`chapters/QuoteBreak`, `atrium/StatField` — el scrub queda congelado en FLOW),
todos los `Nav*` (header fijo en una caja no tiene sentido), y las pineadas
(necesitan modo PIN o "embed edition").

---

## No se toca

- Builder → template/sección ZIP, pago único, Checkout Pro.
- `catalog.js` / `fx.js` / `arsFromUsd` — se extienden, no se reemplazan.
- El flujo de fulfillment de órdenes one-time (`server/services/orders.js`).

---

## Ruta crítica

1. Fase 1 con **una** sección → probar el embed en una página ajena real.
2. Recién si eso se ve bien, Fase 2 (elegir las flagship que sobreviven la caja).
3. Recién con catálogo hosteable armado, Fases 3–4 (config, editor, billing).

No construir billing ni panel antes de tener el embed andando en un sitio ajeno.
