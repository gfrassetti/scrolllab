# AGENTS.md — SCROLLLAB (storytelling-pages-templates)

Marketplace de templates scrollytelling. Cada modelo es una demo completa; el builder arma composiciones; la compra entrega un **ZIP con código fuente** + `LICENSE.txt` (watermark con orden/email). Pagos: Mercado Pago Checkout Pro. Auth: Google (o login de desarrollo).

**Language convention**: product chrome (catalog, builder, cart, account) in Spanish with rioplatense voseo; template placeholder content stays in English. Brand: `src/lib/site.js` → `SCROLLLAB`.

## Qué vendemos (posicionamiento)

Vendemos **páginas de nivel Awwwards**: demos originales, cinematográficas, que no se ven en el promedio de marketplaces de templates. No es un tema Bootstrap ni un layout genérico con animaciones leves.

- El listón es **sitio de referencia / portfolio award-level**: tipografía con intención, scroll coreografiado (GSAP + Lenis), atmósfera y una idea visual propia por modelo.
- Cuando el efecto lo pide, usamos **Canvas 2D y/o WebGL** (Three.js u otras APIs): 3D, shaders, fondos reactivos, objetos con presencia real. Si el promedio se resuelve con CSS, nosotros no bajamos el listón: usamos la API que haga falta.
- El comprador es un **desarrollador**: baja código fuente React/Vite, no un constructor no-code. Una persona sin experiencia técnica no puede “usarlo” como un Wix.
- Al diseñar o mejorar un template, preguntate: *¿esto podría estar en Awwwards / en un site of the day, o es interchangeable con ThemeForest?* Si es lo segundo, no entra.

El cookbook de motion (`docs/motion-cookbook.md`) y Canvas/WebGL son herramientas para ese estándar, no ornamento.

## Design craft — Impeccable + UI/UX Pro Max (siempre)

Para **cualquier** tarea de UI/UX (armar, rediseñar, criticar, pulir, animar, tipografía, color, layout, anti-slop), usar estas skills del proyecto **antes** de inventar un look genérico. Complementan el posicionamiento Awwwards de arriba; no lo reemplazan.

### Impeccable (`.cursor/skills/impeccable/`)

- Instalar / actualizar: `npx impeccable install --providers=cursor --scope=project` · `npx impeccable update`
- Setup de contexto (una vez por proyecto / cuando cambie la marca): `/impeccable init` → escribe `PRODUCT.md` (verdad de producto). El sistema visual se documenta después con `/impeccable document` → `DESIGN.md`
- Uso típico: `/impeccable critique`, `audit`, `polish`, `animate`, `typeset`, `layout`, `craft`, `document`, `live`, etc.
- Hook en `.cursor/hooks.json`: bloquea writes de UI con anti-patrones de “AI slop” antes de que aterrizen
- Detector CLI: `npx impeccable detect src/` (sin API key)
- Docs: [impeccable.style](https://impeccable.style) · repo [pbakaus/impeccable](https://github.com/pbakaus/impeccable)
- Requiere **Node ≥ 22.12** para el CLI completo; el runtime del agente en esta máquina puede ser 20.x (aviso EBADENGINE): conviene subir Node localmente

### UI/UX Pro Max / `uipro` (`.cursor/skills/ui-ux-pro-max/` + related)

- Paquete npm: **`ui-ux-pro-max-cli`** (comando `uipro`). No usar el paquete viejo `uipro-cli`.
- Instalar skill en Cursor: `uipro init --ai cursor` (o `uipro init --ai cursor --force` para regenerar)
- Actualizar CLI: `uipro update` / `npm install -g ui-ux-pro-max-cli@latest`
- Flujo: pedís UI → genera / razona design system → recomienda estilos, color, tipografía → implementá con el stack del repo (**React + Vite + Tailwind**; también cubre Three.js) → chequeos pre-entrega contra anti-patrones
- Skills instaladas junto al pack: `ui-ux-pro-max`, `design`, `design-system`, `brand`, `slides`, `banner-design`, `ui-styling`

### Cuándo usar qué

| Situación | Herramienta |
|---|---|
| Nuevo surface / look award-level, live en browser, detector de slop | **Impeccable** |
| Sistema de diseño, stacks, recomendaciones de estilo/color/tipo, checklist UX | **UI/UX Pro Max** |
| Scroll / GSAP / Lenis / WebGL del producto | Cookbook + skills GSAP + reglas de “Qué vendemos” |

Nota en Obsidian (segundo cerebro): `Impeccable + UI UX Pro Max.md` en la bóveda ScrollLab.

## Stack & commands

- Vite + React 19 + Tailwind CSS v4
- GSAP 3 + Lenis + three (vanilla in monolith)
- Express API (`server/`) + MongoDB + Passport Google OAuth + Mercado Pago SDK
- Zustand cart (UX only; prices validated server-side)

```
npm run dev            # Vite + API (concurrently)
npm run dev:web        # only Vite
npm run dev:api        # only Express
npm run build
npm run start          # API production
npm test               # API unit + HTTP tests
npm run check          # invariantes cruzadas (precios, secciones, props, i18n, rutas)
npm run pack:templates # prebuild catalog ZIPs for chapters/nocturne/monolith
npm run check:visual   # instala, compila y fotografía cada ZIP (lento, ~2 min)
npm run check:builder  # el editor del builder aplica los cambios (Chromium)
```

Lo que se vende es el ZIP, no el repo, y el repo compila aunque el ZIP esté
roto. Dos redes lo cubren:

- `server/__tests__/packaging.test.js` (dentro de `npm test`) empaqueta cada
  modelo, lo abre y verifica imports, archivos de arranque y dependencias.
- `npm run check:visual` hace lo que haría el comprador: `npm install`, `vite
  build` y Chromium, con capturas en `storage/visual-check/`.

El editor del builder tiene su propia red: `check:builder`. Varias secciones
animan el texto con SplitText, que reemplaza el DOM del nodo; a partir de ahí
React no puede actualizar ese texto. El preview remonta la sección cuando las
props se estabilizan (`CompositionCanvas`). Si tocás esa lógica, corré
`npm run check:builder`.

Reglas que salen de bugs reales: las secciones se copian **verbatim** (nunca
reescribas rutas de import al empaquetar) y el `package.json` del template se
**genera** a partir de los imports del código — copiar el del marketplace le
mandaba al comprador un `npm run dev` que arrancaba `nodemon server/index.js`.

Copy `.env.example` → `.env`. Without `MP_ACCESS_TOKEN`, checkout uses mock pay. Without Google creds, use “Login de desarrollo”. Deploy notes: `docs/DEPLOY.md`.

## Market flow

1. User logs in (`/login`) → session cookie.
2. Adds SKU to cart (Zustand) or buys builder recipe (`custom:` + recipe array).
3. `POST /api/checkout` creates Order + MP preference (or mock URL).
4. Webhook / mock-pay marks `paid` and packs ZIP into `storage/orders/` with watermarked LICENSE.
5. `/account` → signed download token → `GET /api/download/:token` (TTL + max 10 downloads).

## Architecture (extra)

```
server/
├── index.js              # boot + graceful shutdown
├── app.js                # Express app factory (testable)
├── config.js             # env validation (fail-fast in prod)
├── middleware.js         # helmet, CORS, origin CSRF, rate limits
├── validation.js         # cart / recipe allowlist
├── sections.js           # sellable section IDs
├── catalog.js            # server prices (ARS)
├── models.js             # User, Order (mongoose)
├── packaging.js          # ZIP pack + signed tokens
├── license.js
├── services/
│   ├── mercadoPago.js
│   └── orders.js
└── __tests__/
src/lib/
├── api.js
├── auth.jsx
└── cart.js
```

Los templates fijos tienen precio de lista; la composición del builder va **por
tramos**: base de USD 199 con 8 secciones incluidas, USD 15 por cada sección
extra hasta 30, más USD 39 si la receta trae commerce. Cuenta cada entrada de la
receta (nav, footer y repeticiones incluidas). Las constantes viven en
`src/lib/pricing.js` y se espejan en `server/catalog.js`; `npm run check` valida
la paridad. Detalle en `docs/DEPLOY.md`.

Never trust client prices. Never obfuscate sold JSX — license + account + signed links + watermark.
In production: Mongo required (no silent file fallback), mock/dev auth off, MP webhook signature required, persistent `STORAGE_DIR`.

## Template models / section conventions

(Same as before: self-contained sections, `lib/gsap.js`, reduced motion, matchMedia for heavy scroll.)

Image pieces for new models: generate realistic local assets under `sections/<sku>/assets/` (see `.cursor/rules/template-image-assets.mdc`). Do not ship sellable defaults on picsum.

Register new sellable SKUs in `server/catalog.js` and pack logic in `server/packaging.js`. Keep `server/sections.js` in sync with `src/lib/sectionRegistry.jsx`.

## Storytelling motion (HTML + CSS + JS — no magia)

El scrollytelling **no es imposible**: son capas DOM + CSS + GSAP/Lenis. Antes de inventar un efecto, **leer y reutilizar** el cookbook:

| Dónde | Qué |
|---|---|
| Repo | [`docs/motion-cookbook.md`](docs/motion-cookbook.md) |
| Obsidian (canónico) | `Storytelling motion cookbook.md` en ScrollLab |
| Wiring | `src/lib/gsap.js` + `SmoothScrollProvider` / `useLenis` |

### Primitivos (P1–P14) — lib y método

| ID | Efecto | Lib | Método |
|---|---|---|---|
| P1 | Pin + scrub | GSAP ScrollTrigger | `timeline({ scrollTrigger: { pin, scrub, end: '+=N%' } })` |
| P2 | Zoom/parallax, UI fija | GSAP | animar solo media (`scale`/`yPercent`) |
| P3 | Crossfade A→B | GSAP | capas `opacity`/`scale` (nunca `src` en scrub) |
| P4 | Disco / zoom-through | GSAP + CSS | `rounded-full` `scale 0→1`; bg = sección siguiente |
| P5 | Horizontal en pin | GSAP | `to(track, { x: -distance, pin, scrub })` |
| P6 | Cutouts parallax | GSAP | PNG alpha + scrub `yPercent`/`rotate` |
| P7 | Lista índice activa | GSAP tl | item `scale↑`; resto atenuado + P3 |
| P8 | Type reveal | SplitText | `chars/words` + `yPercent: 110` stagger |
| P9 | Carousel timer | React + CSS | `setInterval` + keyframes `scaleX` + P8 |
| P10 | Hotspots | React | `%` + hover; fade del grupo en tl |
| P11 | Rail `00→N` | GSAP | proxy `{ n }` + `onUpdate` |
| P12 | Crest spin | CSS | `animate-spin` + SVG `textPath` |
| P13 | Overlap sin hard cut | composición | mismo bg / media opacity↓ al unpin |
| P14 | Day/Night | React | swap `src`; no en deps del pin `useGSAP` |

Al portar una ref (Loom / live): anotar cada beat como `beat → P# → archivo`.

## Second brain — graphify + Obsidian

Cursor, graphify y Obsidian se usan **juntos**, no como alternativas:

| Capa | Rol | Dónde |
|---|---|---|
| **graphify** (máquina) | Orientación del agente antes de explorar código | `graphify-out/` + CLI |
| **Obsidian** (humano + notas) | Segundo cerebro visual: Graph view, canvas, anotaciones | bóveda **ScrollLab** |
| **Cursor** | Implementa; se apoya en graphify primero y en notas Obsidian si aportan decisión/contexto | este repo |

### Flow obligatorio para el agente

1. Pregunta de arquitectura / “dónde está X” / dependencias → `graphify query`, `path` o `explain` (ver `.cursor/rules/graphify.mdc`).
2. **Template nuevo desde URL de referencia** → correr solo  
   `npm run analyze:ref -- <url> --sku <sku> --name "<Name>"`  
   (ver `.cursor/rules/analyze-reference.mdc`). Escribe libs + scroll sample a Obsidian y `docs/reference-analysis/`. No esperar a que el usuario lo pida.
3. **Piezas de imagen del template** → el agente actúa como diseñador/generador: inventariar cada foto/cutout que la ref anima, generar assets realistas locales en `src/components/sections/<sku>/assets/`, **sin picsum**. Regla `.cursor/rules/template-image-assets.mdc` + skill `.cursor/skills/template-image-designer/`.
4. Si hace falta narrativa o decisión ya anotada → leer notas en la bóveda Obsidian (abajo).
5. **Motion / transitions de un template** → leer `Storytelling motion cookbook.md` (Obsidian) + `docs/motion-cookbook.md`; implementar con primitivos P1–P14, no aproximaciones vagas.
6. Recién después: `Read` / `Grep` sobre archivos concretos para editar.
7. Tras cambiar código estructuralmente → `graphify update .` (AST, sin API key).
8. Si el usuario pide re-sync del vault →  
   `graphify export obsidian --graph graphify-out/graph.json --dir "C:\Users\Guido\Documents\Obsidian\ScrollLab"`

### Bóveda canónica (usar solo esta)

- **ScrollLab** → `C:\Users\Guido\Documents\Obsidian\ScrollLab`
- Entrada visual: `graph.canvas` o Graph view (`Ctrl+G`)
- Ignorar bóvedas duplicadas `graphify` / `obsidian` salvo que el usuario diga lo contrario

Obsidian **no reemplaza** `graphify-out/`; lo complementa. El agente no “abre” Obsidian UI: lee los `.md` del vault cuando aportan contexto.
