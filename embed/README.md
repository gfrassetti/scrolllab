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

**HTML / Webflow / WordPress / Framer** — el `<script>` crudo:

```html
<script src="https://embed.scrolllab.com.ar/v1/loader.js"
        data-scrolllab data-key="pub_xxxxx" async></script>
```

Al cargar, el loader escanea los `<script data-scrolllab data-key>` y monta cada
uno (también en `DOMContentLoaded`, por si va en `<head>`).

**React / Next / Vue / cualquier framework** — el loader expone una API y el
componente monta cuando quiere:

```js
window.ScrollLab.render(elemento, { key: 'pub_xxxxx', api, frame }) // monta en `elemento`
window.ScrollLab.scan()                                             // re-escanea <script> nuevos
```

`render()` es idempotente (`data-scrolllab-done`) y reusa el mismo `mount()` que
el path HTML. Los snippets por stack los arma `src/lib/embed.js`
(`embedSnippet(key, loader, variant)` — `html` | `react` | `next` | `vue`) y se
eligen en `/lab` con `<SnippetBox>`.

La URL sale de `GET /api/embed/loader` → `${EMBED_CDN_URL}/v1/loader.js`. Con
`EMBED_SRI=true` el snippet HTML suma `integrity` + `crossorigin` (requiere que el
host mande `Access-Control-Allow-Origin: *` en loader.js). `data-frame` /
`data-api` son overrides solo para test local.

**Build versionado inmutable**: todo sale a `embed-dist/v1/`. Una nueva versión
= carpeta `v2/`, hash nuevo, el snippet viejo sigue apuntando a `v1` intacto.

## Deploy

El loader y el frame son estáticos. El loader **deriva la URL del frame de su
propio `src`** (`.../v1/loader.js` → `.../v1` → `.../v1/frame/index.html`), así
que funcionan desde cualquier host sin configurar el frame aparte. La URL
pública es el archivo directo — sin rewrites.

`npm run build:embed` deja en `embed-dist/`:

```
embed-dist/
├─ v1/loader.js   · el <script> del cliente (+ manifest.json con el hash)
├─ v1/frame/…     · index.html + assets/index-*.{js,css} (la sección va inline,
│                   NO hay chunk lazy — evita 404 si el CDN/rewrite falla)
└─ _headers       · CORS (lo leen Cloudflare / Netlify; Vercel usa vercel.json)
```

`EMBED_CDN_URL` es la base a la que el server le pega `/v1/loader.js` para armar
el snippet (`loaderInfo()` en `server/app.js`). Default:
`https://embed.scrolllab.com.ar`.

### Producción actual — Vercel (`embed.scrolllab.com.ar`)

Segundo proyecto de Vercel sobre el mismo repo:

| campo | valor |
|---|---|
| Project name | `scrolllab-embed` |
| Framework preset | **Other** |
| Build command | `npm run build:embed` |
| Output directory | `embed-dist` |
| Root directory | `./` |

Custom domain `embed.scrolllab.com.ar` desde el proyecto (el DNS ya está en
Vercel → un click, SSL automático por el wildcard `*.scrolllab.com.ar`).

**`vercel.json`** (raíz del repo, lo leen los DOS proyectos):
- `rewrites`: `/api/:path*` → Railway (así el frame en `embed.scrolllab.com.ar`
  puede pedir la config a `https://www.scrolllab.com.ar/api/...`); el fallback
  SPA `/((?!assets/|v1/).*) → /index.html` **excluye `/v1/`** para no pisar los
  assets del embed.
- `headers`: `/v1/*` con `Access-Control-Allow-Origin: *`, `index.html` con
  `must-revalidate`, `assets/*` con `immutable`.

`EMBED_CDN_URL` en Railway: **no hace falta** (el default ya es
`https://embed.scrolllab.com.ar`). Se setea solo si el embed vive en otro lado.

> `wrangler.jsonc` quedó en el repo de un intento con Cloudflare Workers
> (abandonado: el dominio custom del Worker exige la zona DNS en Cloudflare y
> está en Vercel). Es inofensivo.

### Alternativas

- **Netlify**: proyecto nuevo, build `npm run build:embed`, publish
  `embed-dist`. Lee `_headers`.
- **Desde la propia API**: si `embed-dist/` viaja en el deploy de la API,
  `server/app.js` la sirve en la raíz (`/v1/loader.js`, `/v1/frame/…`; CORS
  `*`, sin `X-Frame-Options`). `EMBED_CDN_URL=https://TU-API`.

## Peso

| pieza | tamaño |
|---|---|
| `loader.js` (lo baja el host) | **~3.7 KB** minificado (incluye `window.ScrollLab.render`/`scan`) |
| frame core (Preact + GSAP + framework) | 57.5 KB gz — nuestro origen, cache compartida entre sitios |
| frame CSS (Tailwind) | 16.9 KB gz — escanea TODAS las secciones (pendiente: scopear a `HOSTABLE_SECTIONS`) |
| secciones | inline en el bundle del frame (~1 KB gz cada una) |

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
| `HOSTABLE_SECTIONS` | familia footer (7): `chapters/FooterCTA`, `nocturne/OutroCTA`, `monolith/FooterBrutal`, `fizz/FooterSplash`, `velocity/FooterVelocity`, `atelier/FooterAtelier`, `atrium/FooterAtrium`. Ampliar con embed verificado + schema de props (`ALLOWED_PROPS_BY_SECTION`). Cada modelo nuevo suma sus tokens/fuentes a `frame/main.css` + `frame/index.html`. |
| gsap recortado | `src/gsap.js` registra solo ScrollTrigger + SplitText. Sumar MotionPath cuando entre una sección que lo use. |
| dark mode | v1 light-only. |
