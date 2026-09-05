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
  `HOSTED_FREE_QUOTA`, default **1** = el plan gratis incluye 1 sección
  hosteada). Además `POST /api/hosted` frena la creación de un usuario free que
  ya llegó a `HOSTED_FREE_QUOTA`. La prueba de 7 días (`HOSTED_TRIAL_DAYS`)
  desbloquea todos los planes antes de pagar.
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

`HOSTED_FREE_QUOTA` (Railway, default **1**): cuántas instancias hosteadas
puede tener un usuario **sin suscripción**.
- `1` (default) → el plan gratis incluye 1 sección hosteada real (crear +
  publicar). Crear/publicar una 2da → `402` con "suscribite para más".
- `0` → LAB 100% de pago: el free no crea ni borradores. Lo publicado antes
  deja de servir (freeze) y vuelve al re-suscribirse.
- `N` → N instancias sin pagar.

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

## Fase 8 — Snippets por framework (2026-09)

El embed dejó de ser "un `<script>` y nada más". Sigue siendo un iframe cross-
origin; lo que cambia es cómo cada stack lo inyecta.

- **`embed/loader/loader.js`**: además del auto-scan de `<script data-scrolllab
  data-key>` (ahora también en `DOMContentLoaded`), expone
  `window.ScrollLab.render(el, { key, api, frame })` y `window.ScrollLab.scan()`.
  `render()` reusa el mismo `mount()` interno, es idempotente
  (`data-scrolllab-done`) y deriva la base del frame del `src` del propio loader.
  Minificado pasó de ~2.7 KB a ~3.7 KB.
- **`src/lib/embed.js`**: `embedSnippet(key, loader, variant)` con
  `variant: 'html' | 'react' | 'next' | 'vue'`. `html` es el default y no
  cambió. `react`/`next`/`vue` devuelven un componente que carga el loader una
  vez y monta con `render`.
- **`src/components/SnippetBox.jsx`**: selector de stack (HTML · React · Next.js
  · Vue) + copiar, usado en `/lab` y `/lab/:id`. i18n: `lab.snippetStack`.
- Tests: `embed/test/iframe-host-render.html` + caso e2e nuevo ("window.
  ScrollLab.render monta el embed en un div") — 7 e2e verdes. 277 unit + `check`.

Pendiente: publicar `@scrolllab/embed` en npm (por ahora copy-paste alcanza);
snippet para Astro/Svelte si hay demanda.

---

## Fase 9 — Edición total: color / href / list (2026-09) — infra ✅

Objetivo: que cada hosteable se pueda editar entera (textos, enlaces, colores),
no solo un puñado de strings.

**Infra (esta fase):**
- Tipos de campo nuevos: **`color`** (hex/rgb, entra crudo en un `style` inline),
  **`href`** (`#ancla` / `/ruta` / http(s) / `mailto:` / `tel:` — nada de
  `javascript:`), **`list`** (array de items; `item` = sub-campos
  text/textarea/href/color).
- `sanitizeProps` (cliente) + `sanitizeSectionProps` (server) validan por tipo.
  Server: `LIST_PROPS_BY_SECTION` (schema de los `list`) + convención de nombre
  para color (`bg`/`fg`/`accent`) y href (`*Href` / `href` / `link`). El
  cliente conserva los slots vacíos del `list` (para editar); el server los
  descarta al persistir.
- **`src/components/SectionFieldRow.jsx`**: renderer compartido (LabEditorPage +
  BuilderPreview). `list` con agregar / reordenar / quitar. `image`/`model`
  siguen inline en cada editor (traen upload).
- `scripts/check-consistency.mjs`: valida paridad de los `list` (schema server ↔
  campo cliente + sub-campos).
- i18n: `builder.listAdd`, `builder.hrefHint`.

**Piloto:** `chapters/FooterCTA` gana `ctaHref` (href), `bg`/`fg` (color) y
`links` (list de `{ label, href }` que reemplaza las columnas placeholder). El
`<footer>` aplica `bg`/`fg` por `style` inline. Verificado end-to-end en el
builder: fondo `#101014` + link `/nosotros` renderizados.

Tests: 289 unit (client + server sanitizers) + 7 e2e + `npm run check`.

### Fase B — familia footer completa ✅

Los 7 footers hosteables ya se editan enteros:

| footer | agrega |
|---|---|
| `chapters/FooterCTA` | `bg` `fg` `ctaHref` `links` |
| `nocturne/OutroCTA` | `bg` `fg` `ctaHref` `links` (reemplaza columns) |
| `monolith/FooterBrutal` | `bg` `fg` `ctaHref` `links` (normaliza el `string[]` viejo a `{label,href}`) |
| `fizz/FooterSplash` | `bg` `fg` `ctaHref` `links` (reemplaza columns) |
| `velocity/FooterVelocity` | `bg` `fg` |
| `atelier/FooterAtelier` | `bg` `fg` `ctaHref` (antes no editable) · `social` (list) |
| `atrium/FooterAtrium` | `bg` `fg` |

`bg`/`fg` = `style` inline en el `<footer>` (pisa la clase del modelo). `links`/
`social` vacíos → cae al default del componente. `check-consistency` valida que
cada key sea prop real del componente + paridad client/server + schema de los
`list`.

### Fase C — bloques de contenido, primera tanda ✅

Primeros hosteables **no-footer**. Criterio: entrada `once` (o sin
ScrollTrigger), sin pin, sin scrub, y padding en `rem`/`px`/`vw` — nada de `svh`,
que dentro del iframe FLOW no tiene viewport estable. Los 3 usan modelos que la
familia footer ya dejó tokenizados en `embed/frame/main.css` → **cero cambios en
el frame** (ni `main.css` ni `index.html` ni `MODEL_CANVAS`).

| sección | modelo | agrega |
|---|---|---|
| `chapters/BigNumbers` | chapters | `bg` `fg` · `stats` (list: `value`/`suffix`/`label`, max 6) |
| `atelier/KeyFacts` | atelier | `bg` `fg` · `facts` (list: `value`/`label`, max 6) — `FACTS` hardcodeado pasó a prop |
| `monolith/TypeAccordion` | monolith | `unit` `total` `label` · `bg` `fg` · `items` (list: `title`/`body`, max 6). El `<img>` por fila queda sólo si el item lo trae (en el embed los assets se stubean). |

`KeyFacts` mantiene su `ScrollFog` (canvas 2D, sin assets ni WebGL → CSP-safe;
en FLOW no scrollea, la niebla deriva sólo con el tiempo).

Tests: 293 unit (nuevos casos de sanitize por sección) + `npm run check`.
`build:embed` OK — bundle del frame 63 KB gz JS · 18.4 KB gz CSS.

### E2E — cada hosteable embebida en un sitio ajeno ✅

`embed/test/e2e/hosted-sections.e2e.mjs` (Chromium real, corre en `npm run
test:e2e` junto con `embed.e2e.mjs`, `--test-concurrency=1`). Itera
`HOSTABLE_SECTIONS` directamente — **un id nuevo sin su caso en `CASES` hace
fallar el test**, así que la cobertura no se puede olvidar:

- **Una por una, todas las `HOSTABLE_SECTIONS`**: login dev → crear → publicar
  con props (marcador de texto único + `bg`/`fg`) → cargar la página
  anfitriona con el `<script>` del loader → verificar que el iframe
  cross-origin montó, que el host **no** lo puede leer (`contentDocument ===
  null`), que `#root` renderió **ese** marcador, que `bg` se aplicó por
  `style` inline, que **no hay scroll horizontal** en el frame y que el
  puente de altura dimensionó el iframe.
- **Responsive, las mismas, a 375 / 768 / 1280 px** (`iframe-host-plain.html`,
  host a sangre): marcador visible, frame nunca más ancho que el viewport,
  `#root` con alto real, el iframe siguiéndolo. (`FooterAtrium`, con `svh`,
  corre el mismo chequeo salvo el de "el iframe sigue al contenido en el
  primer settle" — ver Fase D.)
- Infra: `RATE_LIMIT_DISABLED=true` en `e2e-api.mjs` (18 secciones × 3
  viewports en ráfaga tiran 429 sin esto).

**Fix que salió del e2e:** los cierres con palabra gigante
(`FooterCTA`/`FooterBrutal`, `text-[13.5vw]` `whitespace-nowrap`) desbordaban
horizontalmente con un texto largo → **`#root { overflow-x: clip; max-width:
100% }`** en `embed/frame/main.css`: recorta sin crear contenedor de scroll (no
toca el `window.scrollTo` del modo PIN). Ninguna sección puede ya generar scroll
horizontal en la página del host.

---

## Fase D — segunda tanda: 8 más, 18 hosteables en total (2026-09)

`chapters/VelocityMarquee` · `nocturne/DiagonalMarquee` · `nocturne/SplitReveals`
· `nocturne/WorkIndex` · `monolith/SkewScroller` · `monolith/ExhibitGrid` ·
`fizz/BubbleBenefits` · `atelier/AboutClarity`.

Mismo criterio FLOW-safe que las Fases 7/C, con una variante nueva: los
**ribbons continuos** (`VelocityMarquee`, `DiagonalMarquee`) tienen un
`ScrollTrigger.create` que acelera el loop con la velocidad de scroll — pero
el loop de fondo es un `gsap.to({repeat:-1})` independiente. En el iframe FLOW
el host no scrollea el frame, así que el boost simplemente nunca dispara; el
ribbon se ve corriendo a velocidad base. **No rompe**, degrada bien.

Los 8 caen en modelos que la familia footer ya dejó tokenizados
(`chapters`/`nocturne`/`monolith`/`fizz`/`atelier`) → **cero cambios en
`embed/frame/`** otra vez.

### El patrón de edición total (ya es el estándar — se repite acá y de acá en más)

Toda sección que entra a `HOSTABLE_SECTIONS` sale con:

- `bg` / `fg` (color) — `style` inline en el elemento raíz, pisa el canvas del modelo.
- Toda colección de contenido repetible como campo **`list`** (sub-campos
  `text`/`textarea`/`href`/`color` — `color` incluido cuando aporta, ver
  `fizz/BubbleBenefits.benefits[].color`: cada card tiene su propio color).
- **Límite conocido de las `list`**: el sub-campo no soporta `image` todavía
  (`SectionFieldRow` no trae upload en filas de lista). Las secciones con
  imagen **bundleada** por ítem (`SplitReveals.beats`, `WorkIndex.works`,
  `ExhibitGrid.exhibits`) quedan con la imagen de fondo por índice del set de
  ejemplo — el texto se edita entero, la imagen no (mismo trato que
  `TypeAccordion` en Fase C). Distinto de una imagen **por URL** ya declarada
  como campo `image` suelto (`CanCarousel.can1Image…`), que sí es editable hoy.
- `HOSTABLE_SECTIONS` (`server/sections.js`) + import/registro en
  `embed/src/registry.js` (`SECTIONS`, y `MODEL_CANVAS` solo si el modelo es
  nuevo para el frame).

### Testeo obligatorio — el checklist que se repite por cada sección nueva

1. **Se ve embebida en un sitio ajeno** (host hostil, 1280px) — caso en
   `CASES` de `hosted-sections.e2e.mjs`, ver arriba.
2. **Mobile / tablet / desktop** (375 / 768 / 1280px, host a sangre) — mismo
   archivo, mismo `CASES`, corre automático para toda `HOSTABLE_SECTIONS`.
3. Sanitize por sección en **ambos** lados (`sanitizeProps` cliente +
   `sanitizeSectionProps` server): color válido vs. nombre CSS rechazado, `max`
   de la `list` respetado, item vacío descartado al persistir.
4. `npm run check` — cada key es prop real del componente (check 3c,
   parseado), paridad `SECTION_FIELDS` ↔ `ALLOWED_PROPS_BY_SECTION` en ambas
   direcciones, paridad de los `list` (`LIST_PROPS_BY_SECTION` ↔ sub-campos
   cliente) en ambas direcciones.

Tests: **79 e2e** (7 base + 18 por-sección + 54 responsive, las 18 × 3
viewports) + **301 unit** + `npm run check`. `build:embed`: 66.6 KB gz JS /
18.46 KB gz CSS.

### Siguiente tanda (candidatas, requieren más trabajo antes de sumar)

- `fizz/CanCarousel` — ya tiene 5 campos `image` sueltos editables (no
  bloqueado por la limitación de las `list`), pero el fallback SVG
  (`CanIllustration`) se rompe en el embed: el `can.image` stubeado
  (`data:image/gif;base64,…` 1×1) es *truthy*, así que pisa el fallback bonito
  con una imagen transparente en vez de mostrar la lata ilustrada. Necesita una
  función `isStubImage()` compartida con el frame antes de sumarla.
- `monolith/HelmetGrid`, `atelier/StudioCards` — el catálogo de ítems es una
  `const` fuera de props (no un default de prop): hay que refactorizarlas a
  `items = ITEMS` primero, y ahí sí exponer `list`.
- `unity/*`, `ratio/*` — ningún candidato limpio todavía sin sumar tokens/
  fuentes nuevas al frame (`embed/frame/main.css` + `index.html`).
- `atrium/ManifestoType` + `atrium/ScopeSerif`: usan `svh` para el aire (están
  pensadas para vivir sobre un hero pineado). Necesitan una "embed edition" con
  alturas acotadas antes de entrar.
- El resto de `ALLOWED_SECTIONS` queda afuera por diseño: todos los `Nav*`
  (header fijo en una caja no tiene sentido), pin+scrub (`HorizontalPanels` ya
  tiene mecánica probada pero sin props de contenido editables — ver Fase 2),
  y scrub-sin-pin (`ManifestoReveal`, `QuoteBreak`, `StatField`, `ClarityPair`,
  `ZoomPortal`, `StickyWordCycle`, `TrackMerge`, `ParallaxRise`, `PopManifesto`,
  `SpecSheet`… — se congelan en FLOW porque el frame no scrollea).

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
