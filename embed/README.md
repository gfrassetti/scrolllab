# embed/ — Hosted Component

Sirve una sección del sitio en una página ajena. Plan completo:
`docs/hosted-component-plan.md`.

## Arquitectura: loader + iframe

El cliente pega un `<script>`. Ese script (**`loader.js`, 1.7 KB**) no toca su
página: solo crea un `<iframe>` cross-origin sandboxeado a `/frame/index.html`.
La sección se renderiza **dentro del iframe, en nuestro origen** (Preact + GSAP).
El navegador aísla ese iframe de las cookies / formularios / storage del host —
probado: `iframe.contentDocument` da `null` desde el host (4178 ≠ 4179).

```
loader.js (en la página del host)   frame/ (nuestro origen, dentro del iframe)
├─ crea el <iframe> sandbox         ├─ fetch de la config a la API
├─ le ajusta la altura             ├─ render de la sección (Preact)
│   (msg postMessage height)        ├─ reporta altura (ResizeObserver → postMessage)
└─ le avisa cuándo entró en         └─ al primer inView: revela + ScrollTrigger.refresh
    pantalla (msg inView)
```

| archivo | qué |
|---|---|
| `loader/loader.js` | el `<script>` del cliente. Plano, sin deps. Se pinea con SRI. |
| `frame/index.html` · `frame/main.jsx` · `frame/main.css` | la página del iframe |
| `src/registry.js` | `sectionId` → componente (code-split) |
| `src/gsap.js` | gsap del embed: solo ScrollTrigger + SplitText |
| `build-loader.mjs` | minifica el loader + imprime el hash SRI |

`frame/main.css` usa `@source "../../src/components/sections"` porque el build
corre con `root: embed/frame` y si no Tailwind no ve las clases de las secciones.

## Instalación (lo que pega el cliente)

```html
<script src="https://embed.scrolllab.com.ar/embed/v1/loader.js"
        integrity="sha384-…" crossorigin="anonymous"
        data-scrolllab data-key="pub_xxxxx" async></script>
```

La página LAB arma este snippet con el `integrity` real (de
`GET /api/embed/loader`, que lo lee de `embed-dist/v1/manifest.json`).
`data-frame` / `data-api` son overrides solo para test local.

**Build versionado inmutable**: todo sale a `embed-dist/v1/`. Una nueva versión
= carpeta `v2/`, hash nuevo, el snippet viejo sigue apuntando a `v1` intacto.

## Deploy

El loader y el frame son estáticos (`embed-dist/v1/`). El loader **deriva la
URL del frame de su propio `src`** (`.../embed/v1/loader.js` → `.../embed/v1`),
así que funcionan desde cualquier host sin configurar el frame aparte.

`npm run build:embed` deja en `embed-dist/`:

```
embed-dist/
├─ v1/loader.js         · el <script> del cliente (+ manifest.json con el SRI)
├─ v1/frame/…           · la página del iframe (index.html + assets)
├─ _headers             · CORS abierto (Cloudflare Pages / Netlify)
└─ _redirects           · /embed/*  →  /*   (rewrite 200)
```

El `_redirects` hace que la URL pública sea `.../embed/v1/loader.js` en las dos
formas, igual que en el self-host desde la API.

### A · Cloudflare Pages → `embed.scrolllab.com.ar` (recomendado, gratis)

1. **Cloudflare → Workers & Pages → Create → Pages → Connect to Git** → el repo.
2. Build:
   - Framework preset: **None**
   - Build command: `npm run build:embed`
   - Build output directory: `embed-dist`
   - Root directory: *(vacío)*
   - Variables: ninguna.
3. **Save and Deploy**. Sale un `https://<proyecto>.pages.dev` — probalo:
   `https://<proyecto>.pages.dev/embed/v1/loader.js` tiene que dar 200.
4. **Custom domains → Set up a custom domain → `embed.scrolllab.com.ar`**.
   - DNS de `scrolllab.com.ar` en Cloudflare → agrega el `CNAME` solo.
   - DNS en otro lado → creá un `CNAME` `embed` → `<proyecto>.pages.dev`.
5. En **Railway** (API): `EMBED_CDN_URL=https://embed.scrolllab.com.ar` → redeploy.
6. Verificá en LAB que el snippet salga con
   `src="https://embed.scrolllab.com.ar/embed/v1/loader.js"` y pegalo en una
   página de prueba.

Cada push que toque `embed/` → Pages redeploya solo. Nueva versión del loader
= carpeta `v2/` (nunca pisar `v1/`), y el `_redirects` la cubre igual.

> Netlify es equivalente: *Add new site → Import*, build `npm run build:embed`,
> publish dir `embed-dist`. Lee `_headers` y `_redirects` igual.

### B · Sin infra — desde la propia API (para arrancar rápido)

Si el build de la API incluye `npm run build:embed` y `embed-dist/` viaja en el
deploy, `server/app.js` lo sirve en `/embed` (CORS `*`, sin `X-Frame-Options`,
cache inmutable). Poné `EMBED_CDN_URL=https://TU-API` → el snippet queda
`https://TU-API/embed/v1/loader.js`. Mismo origen que la API: más simple,
menos ideal para escalar. Migrás a Pages cambiando solo `EMBED_CDN_URL`.

`EMBED_CDN_URL` solo arma la URL del `<script>` en el snippet (`loaderInfo()`).
El `connect-src` del frame ya permite `https:` para el fetch de la config a la
API.

## Peso

| pieza | tamaño |
|---|---|
| `loader.js` (lo baja el host) | **1.7 KB** sin comprimir |
| frame core (Preact + GSAP + framework) | 57.5 KB gz — nuestro origen, cache compartida entre sitios |
| frame CSS (Tailwind) | 16.9 KB gz — escanea TODAS las secciones (pendiente: scopear a `HOSTABLE_SECTIONS`) |
| por sección (`FooterCTA`) | ~1.1 KB gz, chunk aparte |

## Build

```bash
npm run build:embed     # embed-dist/frame/ + embed-dist/loader.js (+ hash SRI)
npm run build:loader    # solo el loader
```

## Probar

### Automático (Chromium headless)

```bash
npm run test:e2e
```

Buildea el embed y corre `embed/test/e2e/embed.e2e.mjs` (`node --test` +
librería `playwright`, sin `@playwright/test`). Levanta la API en :8787 (store
de archivo, MP mock, `embed/test/e2e-api.mjs`), dos static servers cross-origin
(:4178 host, :4179 frame), publica una instancia y verifica: se monta el iframe
cross-origin, `contentDocument` queda `null`, el frame no puede tocar el DOM del
host, la sección renderiza con los props publicados, el CSS del host no se
filtra y el puente de altura dimensiona el iframe.

> Chromium bloquea `localhost:4178 → localhost:4179` con Local/Private Network
> Access; el harness lo lanza con `--disable-features=LocalNetworkAccessChecks,…`.
> En prod el frame se sirve por HTTPS desde el CDN y no aplica. Same-origin
> sigue intacto (por eso valen las aserciones de aislamiento).

### Manual

```bash
# 1) API (file store)
STORE=file AUTH_DEV_ENABLED=true SESSION_SECRET=dev-session-secret-min-24-chars \
DOWNLOAD_SECRET=dev-download-secret-min-24-chars FX_OFFLINE=true FX_FALLBACK_RATE=1560 \
FILE_DB_DIR=$PWD/storage/db-embed-e2e node server/index.js

# 2) dos static servers: host (4178) y "nuestro origen" (4179)
node embed/test/static-server.mjs 4178
node embed/test/static-server.mjs 4179

# 3) dev-login + POST /api/hosted + PUT {publish:true}, meter la key en
#    embed/test/iframe-host.html reemplazando __E2E_KEY__
# 4) abrir http://localhost:4178/embed/test/iframe-host.html
```

El static server va aparte porque el dev server de Vite transforma el build ya
compilado y lo rompe.

## Estado

| | |
|---|---|
| **Fase 1** — render de sección desde config remota en página ajena | ✅ |
| **Fase 2** — pin + scrub + `containerAnimation` (probado en shadow DOM, `chapters/HorizontalPanels`) | ✅ mecánica |
| **Fase 3 servidor** — modelo `HostedInstance` + API + `server/__tests__/hosted.test.js` (5) + E2E | ✅ |
| **Iframe** — loader 1.7 KB + frame cross-origin, aislamiento verificado, height + inView bridges | ✅ |
| Fase 3 cliente — editor "Publicar como embed" + panel "Mis secciones hosteadas" | ⬜ |
| Fase 4 — suscripciones (MP preapproval), comparación de planes | ⬜ |
| Fase 5 — SRI/versionado inmutable, CSP del frame, legal, pageviews | ⬜ |

## Pendientes técnicos

| tema | detalle |
|---|---|
| ~~Scrub por el iframe~~ | ✅ hecho. Modo PIN: el frame manda `scrolllab:pinlength`, el loader lo hace `position:sticky` sobre un spacer de `viewportH + pinLen` y manda `scrolllab:progress` 0→1; el frame lo traduce a `window.scrollTo`. La sección corre pin/scrub nativo, sin tocarla. Probado con `HorizontalPanels` en `embed/test/iframe-pin.html`. |
| CSS amplio | `@source` escanea todas las secciones (16.9 KB gz). Scopear a `HOSTABLE_SECTIONS`. |
| `data-frame` / `data-api` defaults | placeholders (`embed.scrolllab.com.ar`, `cdn.scrolllab.com.ar`). |
| `HOSTABLE_SECTIONS` | server: solo `chapters/FooterCTA`. Ampliar con embed verificado + schema de props (`ALLOWED_PROPS_BY_SECTION`). |
| gsap recortado | `src/gsap.js` registra solo ScrollTrigger + SplitText. Sumar MotionPath cuando entre una sección que lo use. |
| dark mode | v1 light-only. |
