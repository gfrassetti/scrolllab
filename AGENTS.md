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

## Design craft — obligatorio (siempre)

En **cualquier** tarea de UI/UX (homepage, templates, builder, cart, chrome, polish, animación):

| # | Herramienta | Rol | Dónde |
|---|---|---|---|
| 1 | **Impeccable** | Critique / audit / **polish** / animate / anti-slop — **siempre** antes de dar por cerrada una UI | `.cursor/skills/impeccable/` · [impeccable.style](https://impeccable.style) · repo [pbakaus/impeccable](https://github.com/pbakaus/impeccable) |
| 2 | **Emil Kowalski / emil-design-eng** | Easing, duración, press feedback, drawers/toasts, “should this animate?” | `.cursor/skills/emil-design-eng/` · [animations.dev](https://animations.dev/) |
| 3 | **taste-skill** (`design-taste-frontend`) | Anti-slop: no repetir look genérico LLM; brief inference antes de diseñar | `.cursor/skills/taste-skill/` · [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) |
| 4 | **UI/UX Pro Max** | Sistemas, paletas, tipografía, checklist UX | `.cursor/skills/ui-ux-pro-max/` |
| 5 | **template-image-designer** | Fotos / cutouts reales de templates | `.cursor/skills/template-image-designer/` (versionada) |

### Reglas de uso (no negociables)

1. **Impeccable siempre**: al crear o tocar UI, correr el flujo relevante (`critique` / `audit` / **`polish`**). No shippear chrome “a ojo” sin pasar por Impeccable.
2. **Emil en motion de UI**: chrome del market + microinteracciones de templates (nav, botones, popovers, toasts). Tokens en `src/index.css` (`--ease-out`, `--ease-in-out`, `--ease-drawer`). Nunca `ease-in` en UI. Scroll storytelling sigue en GSAP + cookbook.
3. **taste-skill antes de inventar look**: declarar un “Design Read” de una línea; evitar defaults LLM (purple mesh, Inter+slate, cards genéricas).
4. El scrollytelling cinematográfico (pin/scrub/WebGL) **no** se reemplaza por micro-UI: Emil/Impeccable pulen el chrome y los detalles; el cookbook manda el scroll.

### Instalar / actualizar (local, gitignored)

```bash
npx impeccable install --providers=cursor --scope=project
npx impeccable update
# link opcional si tenés skills compiladas en .impeccable:
# npx impeccable link --source=.impeccable --providers=cursor

# taste-skill (si `npx skills` falla por Node < 22.20, clonar/copiar SKILL.md a .cursor/skills/taste-skill/)
npx skills add Leonxlnx/taste-skill

# Emil design eng
# clonar https://github.com/emilkowalski/skills → .cursor/skills/emil-design-eng/
```

Requiere **Node ≥ 22.12** para el CLI de Impeccable / skills; con Node 20 el skill ya instalado en `.cursor/skills/` sigue usable.

Hook: `.cursor/hooks.json` (detector Impeccable).

Nota Obsidian: `Impeccable + UI UX Pro Max.md` en ScrollLab.

### Cuándo usar qué (atajo)

| Situación | Herramienta |
|---|---|
| Pulir / limpiar UI existente | **Impeccable `polish`** (obligatorio) |
| Microinteracción / easing / toast / drawer | **emil-design-eng** |
| Landing / homepage / evitar look repetido | **taste-skill** + Impeccable |
| Sistema de color / tipografía / checklist | **UI/UX Pro Max** |
| Fotos / cutouts de un template | **template-image-designer** |
| Scroll / GSAP / Lenis / WebGL | Cookbook + skills GSAP + “Qué vendemos” |

## Design craft — Impeccable + UI/UX Pro Max (detalle)

Para UI/UX award-level, estas tools viven **instaladas en la máquina** (gitignored salvo `template-image-designer`). Complementan el posicionamiento Awwwards; no lo reemplazan.

### Impeccable (local: `.cursor/skills/impeccable/`)

- Instalar / actualizar: ver bloque obligatorio arriba
- Setup: `/impeccable init` → `PRODUCT.md`; `/impeccable document` → `DESIGN.md`
- Uso frecuente: `/impeccable critique`, `audit`, **`polish`**, `animate`, `typeset`, `layout`, `live`
- Docs: [impeccable.style](https://impeccable.style)

### UI/UX Pro Max / `uipro` (local)

- CLI: **`ui-ux-pro-max-cli`** → `uipro init --ai cursor`
- Skills que genera (gitignored): `ui-ux-pro-max`, `design`, `design-system`, `brand`, `slides`, `banner-design`, `ui-styling`

### Skill de producto (sí versionada)

- `.cursor/skills/template-image-designer/` — piezas de imagen realistas para templates SCROLLLAB

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
npm run check:responsive # captura cada ruta a 390/768/1024/1440 + report de overflow (dev server arriba)
```

### Responsive — 3 tiers (mobile / tablet / desktop)

Modelo acordado, mapeado a Tailwind v4 (breakpoints default):

- **Mobile**: base sin prefijo, `< 640`. Referencias 390 y 480.
- **Tablet**: `sm:` (≥640) hasta 1023. Referencias 768 y 834. `md:` (768) es refinamiento *dentro* de tablet (los navs colapsan a hamburguesa en `md`; excepción intencional: `NavAtelier` siempre overlay vía `useMobileMenu({ breakpoint: null })`).
- **Desktop**: `lg:` (≥1024). Referencias 1280/1440.

Reglas:
- Navs de template + market colapsan en `md:` (consistente; no mezclar `lg:` como hacía comic).
- Grid/flex items que puedan quedar más anchos que su track necesitan `min-w-0` (el default `min-width:auto` los expande a min-content y desborda; fue el bug del builder en mobile).
- `body { overflow-x: clip }` enmascara leaks horizontales pero **no** arregla layout; usar `npm run check:responsive` para detectar elementos que se salen del viewport. Ojo: secciones con scroll horizontal/marquee/pin (HorizontalPanels, TrackMerge, SelectedWork, ChapterRail, marquees) son anchas *a propósito* y van clippeadas — no son overflow real.

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
   (ver `.cursor/rules/analyze-reference.mdc`). Playwright muestrea el scroll y **solo guarda beats donde cambia la firma** (fondo / sticky / transforms / texto) + JPEG livianos en `docs/reference-analysis/<sku>/beats/`. Si hay `GEMINI_API_KEY` o `GOOGLE_API_KEY` en `.env`, una pasada de Gemini anota fondo/figura/texto. Salida: Obsidian + `docs/reference-analysis/<sku>.md` + `beats.json`. No esperar a que el usuario lo pida.
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

## Cursor Cloud specific instructions

### MCP: Meshy (generación de assets 3D)

- Config del servidor MCP en `.cursor/mcp.json` (server `meshy` → `npx -y @meshy-ai/meshy-mcp-server`). **Ese archivo está gitignored**, así que no viaja con el repo: si no existe, recrealo con esa entrada.
- La API key va **solo** como secret `MESHY_API_KEY` (empieza con `msy_`), referenciada en `mcp.json` como `"MESHY_API_KEY": "${env:MESHY_API_KEY}"`. Nunca hardcodear ni commitear la key (los docs de Meshy lo advierten; consume créditos de la cuenta).
- El server **valida la key contra `https://api.meshy.ai` al arrancar**: sin una key válida no levanta (`Invalid MESHY_API_KEY`) y las tools no aparecen. Tras setear el secret, activá el server en el panel MCP de Cursor.
- Encaja con el uso de Three.js/WebGL del catálogo; `meshy_output/` ya está gitignored para las salidas.
