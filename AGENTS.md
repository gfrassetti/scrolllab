# AGENTS.md — SCROLLLAB (storytelling-pages-templates)

Marketplace de templates scrollytelling. Cada modelo es una demo completa; el builder arma composiciones; la compra entrega un **ZIP con código fuente** + `LICENSE.txt` (watermark con orden/email). Pagos: Mercado Pago Checkout Pro (Argentina, ARS) y Paddle (resto del mundo, USD, merchant of record — [`docs/paddle.md`](docs/paddle.md)); el medio de pago viene marcado por ubicación y el comprador puede cambiarlo (selector «Medio de pago», un solo botón de pago). Auth: Google (o login de desarrollo).

**Language convention**: product chrome (catalog, builder, cart, account) in Spanish with rioplatense voseo; template placeholder content stays in English. Brand: `src/lib/site.js` → `SCROLLLAB`.

## Qué vendemos (posicionamiento)

Vendemos **páginas de nivel Awwwards**: demos originales, cinematográficas, que no se ven en el promedio de marketplaces de templates. No es un tema Bootstrap ni un layout genérico con animaciones leves.

- El listón es **sitio de referencia / portfolio award-level**: tipografía con intención, scroll coreografiado (GSAP + Lenis), atmósfera y una idea visual propia por modelo.
- Cuando el efecto lo pide, usamos **Canvas 2D y/o WebGL** (Three.js u otras APIs): 3D, shaders, fondos reactivos, objetos con presencia real. Si el promedio se resuelve con CSS, nosotros no bajamos el listón: usamos la API que haga falta.
- El comprador es un **desarrollador**: baja código fuente React/Vite, no un constructor no-code. Una persona sin experiencia técnica no puede “usarlo” como un Wix.
- Al diseñar o mejorar un template, preguntate: *¿esto podría estar en Awwwards / en un site of the day, o es interchangeable con ThemeForest?* Si es lo segundo, no entra.

El cookbook de motion (`docs/motion-cookbook.md`) y Canvas/WebGL son herramientas para ese estándar, no ornamento. La plusvalía junto al builder es **Beat** (`docs/scrolllab-beat.md`, `src/lib/beat/`): riel + seek en nuestras secciones, no un fade genérico. Si la URL de referencia es un proyecto **Readymag**, extraer recetas y alimentar Beat — no interpolar a ojo con GSAP ni copiar el viewer (`docs/readymag-motion.md`).

**Estudio (trabajo a medida).** Además del marketplace, ScrollLab también es un
estudio: hace sitios a medida y adapta un modelo del catálogo a la marca del
cliente — las dos únicas tarjetas en el home. También ofrece mantenimiento/
soporte, pero **sin tarjeta ni suscripción propia** (no es self-serve como
LAB): sale solo si surge en la conversación con quien ya contactó por uno de
los dos servicios de arriba. Todo por cotización
manual (no pasa por el checkout de Mercado Pago), enmarcado en la calidad del
sitio y el proceso (diagnóstico antes de construir), nunca por hora. **No
prometer resultados de negocio** (más clientes, más conversión, más
consultas): eso depende de marketing/tráfico/oferta, no de nosotros — somos
un estudio de desarrollo web, no una agencia de marketing (2026-09-28,
decisión explícita del dueño tras dudar de la lección de un curso). Público: marcas
que quieren un sitio de nivel superior al promedio — no se nombran rubros
específicos (arquitectura, moda, etc.) en copy público ni en el pitch, no
suma acotar la lista. Los precios ancla del Estudio no se muestran en el
sitio (se hablan con el cliente) y tienen que quedar siempre arriba del techo
del builder (`CUSTOM_BASE_PRICE_USD` + secciones extra + commerce,
`src/domain/catalog.js`) y del template más caro en venta: no afirmar cupos
fijos ("1 por mes") — la capacidad depende del proyecto. Copy y sección viven
en el home
(`src/features/home/StudioZone.jsx`, zona `estudio`, componente `ZoneHeadline`);
detalle completo en `docs/estudio-positioning.md`.

## Design craft — obligatorio (siempre)

En **cualquier** tarea de UI/UX (homepage, templates, builder, cart, chrome, polish, animación):

| # | Herramienta | Rol | Dónde |
|---|---|---|---|
| 1 | **Impeccable** | Critique / audit / **polish** / animate / anti-slop — **siempre** antes de dar por cerrada una UI. Leer `SKILL.md` al tocar UI | `.cursor/skills/impeccable/` · [impeccable.style](https://impeccable.style) · repo [pbakaus/impeccable](https://github.com/pbakaus/impeccable) |
| 2 | **Emil Kowalski / emil-design-eng** | Easing, duración, press feedback, drawers/toasts, “should this animate?” | `.cursor/skills/emil-design-eng/` · [animations.dev](https://animations.dev/) |
| 3 | **taste-skill** (`design-taste-frontend`) | Anti-slop: no repetir look genérico LLM; brief inference antes de diseñar | `.agents/skills/design-taste-frontend/` (junction `.cursor/skills/taste-skill/`) · [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) |
| 4 | **UI/UX Pro Max** | Sistemas, paletas, tipografía, checklist UX | `.cursor/skills/ui-ux-pro-max/` |
| 5 | **template-image-designer** | Inventario + brief de piezas de un SKU | `.cursor/skills/template-image-designer/` (versionada) |
| 6 | **Higgsfield** (plugin MCP) | Generar fotos, cutouts PNG, video, GLB — **preferido** para assets de templates | namespace `plugin-higgsfield-higgsfield` · [higgsfield.ai](https://higgsfield.ai) · plugin [Cursor Marketplace](https://cursor.com/marketplace/higgsfield) |
| 7 | **playwright-cli** | Verificar demos/UI en el browser (open / snapshot / click / screenshot). Token-efficient | `.agents/skills/playwright-cli/` · [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) · [docs](https://playwright.dev/docs/getting-started-cli) |
| 8 | **img2threejs** | Reconstruir un objeto de una foto como Three.js **procedural** (código, no GLB) | `.agents/skills/img2threejs/` · [img2threejs/img2threejs](https://github.com/img2threejs/img2threejs) |
| 9 | **The Award-Winning Web Developer** (curso del usuario) | Craft award-level: white space, jerarquía, motion con vocabulario chico, catálogo de micro-interacciones, checklist award vs. genérico | [`docs/award-winning-web-developer.md`](docs/award-winning-web-developer.md) |

### Reglas de uso (no negociables)

1. **Impeccable siempre**: al crear o tocar UI, **leer** `.cursor/skills/impeccable/SKILL.md` y correr el flujo relevante (`critique` / `audit` / **`polish`**). No shippear chrome “a ojo” sin pasar por Impeccable.
2. **Emil en motion de UI**: chrome del market + microinteracciones de templates (nav, botones, popovers, toasts) **y la UI propia de cada template** — links, CTAs, cards, accordions, forms — con la capa `tpl-*` de `src/styles/tpl.css` (catálogo del Detalle #6 de la guía del curso, un mismo lenguaje en todo el template) y la barra de scroll propia `src/components/ScrollRail.jsx`. Tokens en `src/index.css` (`--ease-out`, `--ease-in-out`, `--ease-drawer`, `--duration-reveal` para la pausa titular → subtítulo). Nunca `ease-in` en UI. Scroll storytelling sigue en GSAP + cookbook.
3. **taste-skill antes de inventar look**: declarar un “Design Read” de una línea; evitar defaults LLM (purple mesh, Inter+slate, cards genéricas). Skill canónico: `design-taste-frontend`.
4. El scrollytelling cinematográfico (pin/scrub/WebGL) **no** se reemplaza por micro-UI: Emil/Impeccable pulen el chrome y los detalles; el cookbook manda el scroll.
5. **Higgsfield para piezas de imagen** de templates (fotos, cutouts, upscale). No picsum. `GenerateImage` nativo de Cursor es fallback si el plugin no está. Video / GLB: preflight `get_cost` y confirmar créditos con el usuario.
6. **playwright-cli para verificar** templates y chrome en el browser (`npx playwright-cli …`). Leer el skill antes de automatizar. No sustituye `check:visual` / `check:builder`.
7. **img2threejs** cuando hay que esculpir un objeto **genérico y reemplazable** desde una foto a código Three.js. No para caras/artistas/productos únicos (mismo filtro que Tabasco). GLB texturizado: Higgsfield `generate_3d` o Meshy.

### Instalar / actualizar (local, gitignored)

Los skills de CLI viven en `.agents/skills/` (`skills-lock.json` sí se versiona). Restore: `npx skills experimental_install -y`.

```bash
npx impeccable install --providers=cursor --scope=project
npx impeccable update
# link opcional si tenés skills compiladas en .impeccable:
# npx impeccable link --source=.impeccable --providers=cursor

# taste-skill (pack: design-taste-frontend + siblings)
npx skills add Leonxlnx/taste-skill -a cursor -y

# Playwright CLI (skill + bin local)
npx skills add https://github.com/microsoft/playwright-cli --skill playwright-cli -a cursor -y
npm install -D @playwright/cli@latest
npx playwright-cli --help
npx playwright-cli install-browser chromium

# img2threejs (checkout completo: SKILL + forge/ + grimoire/)
npx skills add img2threejs/img2threejs -a cursor -y --full-depth

# Emil design eng
# clonar https://github.com/emilkowalski/skills → .cursor/skills/emil-design-eng/
```

Requiere **Node ≥ 22.12** para el CLI de Impeccable / skills; con Node 20 el skill ya instalado en `.cursor/skills/` sigue usable.

Hook: `.cursor/hooks.json` (detector Impeccable).

Nota Obsidian: `Impeccable + UI UX Pro Max.md` en ScrollLab.

### Cuándo usar qué (atajo)

| Situación | Herramienta |
|---|---|
| Pulir / limpiar UI existente | **Impeccable `polish`** (obligatorio; leer el skill) |
| Microinteracción / easing / toast / drawer | **emil-design-eng** |
| Landing / homepage / evitar look repetido | **taste-skill** + Impeccable |
| Sistema de color / tipografía / checklist | **UI/UX Pro Max** |
| Fotos / cutouts de un template | **Higgsfield** `generate_image` + `remove_background` (brief: template-image-designer) |
| Video / still animado de un beat | **Higgsfield** `generate_video` (confirmar créditos) |
| Verificar demo / flujo en el browser | **playwright-cli** (`npx playwright-cli open …`) |
| Objeto 3D procedural desde una foto (código Three.js) | **img2threejs** — solo si es genérico/vendible |
| Mesh GLB texturizado | **Higgsfield** `generate_3d` o **Meshy MCP** |
| Scroll / GSAP / Lenis / WebGL | Cookbook + skills GSAP + “Qué vendemos” |
| Motion de piezas en una sección (riel / cubo / letras) | **Beat** — [`docs/scrolllab-beat.md`](docs/scrolllab-beat.md) + `src/lib/beat/` |
| Card hero / tableau / emblem Three.js | **WebGL mini motor** — [`docs/scrolllab-webgl.md`](docs/scrolllab-webgl.md) + `src/lib/webgl/` |
| “3D” al scroll (WebGL vs secuencia WebP tipo pear.no / Apple) | [`docs/scroll-media.md`](docs/scroll-media.md) — mismo playhead `progress`; APIs distintas |
| Ref es Readymag (`window.RM`, `rmcdn`, `.animation-container`) | Extraer recetas → Beat. Método: [`docs/readymag-motion.md`](docs/readymag-motion.md) |
| Template existente "no está al nivel de la ref" (handoff / review) | [`docs/rebuild-against-reference.md`](docs/rebuild-against-reference.md) — reconstruir contra beats, no contra el JSX actual |
| Revisar o pulir un template contra el estándar award-level (white space, micro-interacciones, orden de entrada) | [`docs/award-winning-web-developer.md`](docs/award-winning-web-developer.md) — checklist «Award-level vs. genérico» |

## Design craft — Impeccable + UI/UX Pro Max (detalle)

Para UI/UX award-level, estas tools viven **instaladas en la máquina** (gitignored salvo `template-image-designer` y `skills-lock.json`). Complementan el posicionamiento Awwwards; no lo reemplazan.

### Impeccable (local: `.cursor/skills/impeccable/`)

- Instalar / actualizar: ver bloque obligatorio arriba
- Setup: `/impeccable init` → `PRODUCT.md`; `/impeccable document` → `DESIGN.md`
- Uso frecuente: `/impeccable critique`, `audit`, **`polish`**, `animate`, `typeset`, `layout`, `live`
- Docs: [impeccable.style](https://impeccable.style)

### UI/UX Pro Max / `uipro` (local)

- CLI: **`ui-ux-pro-max-cli`** → `uipro init --ai cursor`
- Skills que genera (gitignored): `ui-ux-pro-max`, `design`, `design-system`, `brand`, `slides`, `banner-design`, `ui-styling`

### Skill de producto (sí versionada)

- `.cursor/skills/template-image-designer/` — inventario + brief de piezas; la generación la hace Higgsfield

### Higgsfield (dos rutas según el cliente)

**En Cursor** — plugin MCP `plugin-higgsfield-higgsfield` ([Marketplace](https://cursor.com/marketplace/higgsfield), [higgsfield.ai](https://higgsfield.ai)). No hay CLI que instalar: si el namespace no aparece, reactivar el plugin y autenticar en Customize → MCPs.

**En Claude Code** — el plugin del Marketplace no existe. Server local `scripts/higgsfield-mcp.mjs` (cero dependencias) que habla directo con `https://api.higgsfield.ai`. Credenciales en `.env`: `HIGGSFIELD_API_KEY_ID` + `HIGGSFIELD_API_KEY_SECRET` ([cloud.higgsfield.ai/api-keys](https://cloud.higgsfield.ai/api-keys)); auth `Authorization: Key <id>:<secret>`. Tools: `higgsfield_list_models`, `higgsfield_generate`, `higgsfield_status`, `higgsfield_cancel`, `higgsfield_download`.

Es la misma cuenta pero **no las mismas tools**: la API pública expone los 48 endpoints de generación (Soul, Sora 2, Veo 3.1, Kling, Hailuo, Seedance, WAN, Nano Banana, Reve, Flux Kontext, DoP) y no trae `remove_background` ni `generate_3d`. En Claude Code: cutouts → editar con `/nano-banana` o `/reve/edit` por prompt; GLB → **Meshy**. Empezar siempre por `higgsfield_list_models` para el esquema exacto del endpoint. El índice de modelos vive en `scripts/higgsfield-models.json` (derivado de `docs.higgsfield.ai/docs/openapi.json`; regenerarlo si Higgsfield suma modelos).

**Default para assets de templates** (fotos fotográficas, no picsum) — nombres de tool del plugin de Cursor:

| Necesidad | Tool |
|---|---|
| Foto / still | `generate_image` (`models_explore` si el modelo no está claro) |
| Cutout PNG alpha | `remove_background` sobre el job/media |
| Upscale / reframe / expandir | `upscale_image` / `reframe` / `outpaint_image` |
| Video de un beat | `generate_video` — `get_cost:true` y confirmar créditos |
| GLB desde foto | `generate_3d` — mismo filtro genérico/vendible; o Meshy |

Bajar el original a `design/masters/<sku>/` y correr `npm run images`: genera los WebP livianos (completo + 640/1080, 320 en recortes con alfa) y `src/components/sections/<sku>/assets/images.js`; la sección importa de ahí y usa `imgAttrs` (`src/lib/responsiveImage.js`) con su `sizes`. El original no viaja al build ni al ZIP. Fallback si el plugin no está: tool `GenerateImage` de Cursor.

Video, 3D y batches caros: no gastar créditos a ciegas. Entrada `/higgs` para pedidos sueltos de media.

### Playwright CLI (verificar UI)

Bin local: `npx playwright-cli` (`devDependency` `@playwright/cli`). Skill: `.agents/skills/playwright-cli/SKILL.md`.

Al verificar un template o chrome (no en lugar de `npm run check:visual`):

```bash
npx playwright-cli open http://localhost:5173/templates/atrium --headed
npx playwright-cli snapshot
npx playwright-cli screenshot
npx playwright-cli close
```

Patrón de sesión (docs oficiales):

```bash
npx playwright-cli open https://demo.playwright.dev/todomvc --headed
npx playwright-cli type "Buy groceries"
npx playwright-cli press Enter
npx playwright-cli type "Water flowers"
npx playwright-cli press Enter
npx playwright-cli check e21
npx playwright-cli screenshot
```

Si `playwright-cli` no está en PATH, usar `npx playwright-cli` (este repo) o `npx playwright cli`.

### img2threejs (foto → Three.js procedural)

Skill + `forge/` + `grimoire/`: `.agents/skills/img2threejs/`. Estado local: `.img2threejs/` (gitignored).

Usar cuando el brief pide reconstruir **el objeto de una imagen** como modelo Three.js en código (primitivas, shaders, geometría generada) — no photogrammetry ni un GLB de Higgsfield/Meshy. Seguir el `SKILL.md`: `python forge/next.py` como gate, pases blockout → material, verificar contra la ref.

**Filtro SCROLLLAB:** el objeto tiene que ser reemplazable por el comprador (latas geométricas, hardware genérico, massing abstracto). Una cara, un artista o un producto único no entra.

## Stack & commands

- Vite + React 19 + Tailwind CSS v4
- GSAP 3 + Lenis + three (vanilla in monolith)
- Motion for React (`motion`) para micro-interacción de componente; GSAP sigue
  siendo el motor de scroll — ver [`docs/motion-componentry.md`](docs/motion-componentry.md)
- `cn()` en `src/lib/utils.js` (clsx + tailwind-merge) para componentes copiados
  de registros shadcn (componentry.dev) en `src/components/ui/`
- Express API (`server/`) + MongoDB + Passport Google OAuth + Mercado Pago SDK
- Zustand cart (UX only; prices validated server-side)

```
npm run dev            # Vite + API (concurrently)
npm run dev:web        # only Vite
npm run dev:api        # only Express
npm run build
npm run start          # API production
npm test               # cada *.test.js de server/, src/lib/ y embed/ (scripts/run-tests.mjs los descubre)
npm run check          # invariantes cruzadas (precios, secciones, props, i18n, rutas)
npm run verify         # lint + typecheck + test + check: el gate antes de cada commit
npm run typecheck      # tsc sobre src/domain y server (tipos JSDoc, gradual; ver docs/adr/0004)
npm run ssr:snapshot   # HTML renderizado en el servidor: la red de los refactors de UI
npm run pack:templates # prebuild catalog ZIPs for chapters/nocturne/monolith
npm run check:visual   # instala, compila y fotografía cada ZIP: los 8 del bundle, ATRIUM, MERIDIAN y el custom (lento, ~3 min)
npm run check:builder  # el editor del builder aplica los cambios (Chromium)
npm run check:lab      # LAB: editar → preview (el embed real) → publicar → se ve en un sitio ajeno (Chromium)
npm run check:mp-sandbox # suscripciones LAB contra el sandbox real de MP (credenciales de prueba)
npm run check:paddle-sandbox # transacciones (template, cupón, builder, LAB con prueba) contra el sandbox real de Paddle
npm run check:responsive # captura cada ruta a 390/768/1024/1440 + report de overflow (dev server arriba)
npm run check:mobile   # cada sección de los 10 templates, 320→1280 + reduced motion: desbordes, texto, toque, imágenes (--snapshot para seguir editando)
npm run check:motion   # emulador de teléfono: gestos táctiles reales, CPU ×4, 10 templates + home, normal / reduce / forced (huecos, trabas, texto oculto)
npm run check:motion-notice # el aviso «Ver con animaciones»: una sola vez, el botón anda, el toggle del header (Chromium)
npm run check:parity   # PC ↔ teléfono ↔ tablet por sección: ScrollTriggers, tamaño del efecto, canvas, listeners de puntero, blur pesado (dev server, Chromium)
npm run images         # WebP + srcset de las fotos de los templates desde design/masters/<sku>/
```

### Responsive — 3 tiers (mobile / tablet / desktop)

Modelo acordado, mapeado a Tailwind v4 (breakpoints default):

- **Mobile**: base sin prefijo, `< 640`. Referencias 390 y 480.
- **Tablet**: `sm:` (≥640) hasta 1023. Referencias 768 y 834. `md:` (768) es refinamiento *dentro* de tablet (los navs colapsan a hamburguesa en `md`; excepción intencional: `NavAtelier` siempre overlay vía `useMobileMenu({ breakpoint: null })`).
- **Desktop**: `lg:` (≥1024). Referencias 1280/1440.

Reglas:
- Navs de template + market colapsan en `md:` (consistente; no mezclar `lg:` como hacía comic). Excepción: el `SiteHeader` del market colapsa en `lg:` — con las etiquetas en español el menú no entra entre 768 y ~900 px y ensanchaba el documento (los audits corren con `locale: 'es-AR'` por eso).
- Grid/flex items que puedan quedar más anchos que su track necesitan `min-w-0` (el default `min-width:auto` los expande a min-content y desborda; fue el bug del builder en mobile).
- `body { overflow-x: clip }` enmascara leaks horizontales pero **no** arregla layout; usar `npm run check:responsive` para detectar elementos que se salen del viewport. Ojo: secciones con scroll horizontal/marquee/pin (HorizontalPanels, TrackMerge, SelectedWork, ChapterRail, marquees) son anchas *a propósito* y van clippeadas — no son overflow real.
- Piso en mobile (≤ 480, probado desde 320): micro-labels ≥ 11 px y cuerpo ≥ 14 px; controles con zona de toque ≥ 44 px (`tpl-hit` si el dibujo es más chico; los links dentro de un párrafo quedan exentos); alturas en `svh`; nada que solo se descubra con hover (Tailwind v4 ya limita `hover:` a dispositivos con hover, pero el contenido tiene que tener camino táctil); imágenes con `srcSet`/`sizes`. `npm run check:mobile` lo mide por sección.

### Reducir movimiento — versión calma, nunca rota

Con `prefers-reduced-motion: reduce` los templates **no apagan todo**: pasan a la
versión calma (`src/lib/motion.js`): fundidos cortos en vez de pin/parallax/zoom,
contadores que cuentan, carruseles que se deslizan con el dedo. **Nunca** un
contenedor alto vacío ni contenido oculto: los altos de scrub colapsan por CSS
con la variante `calm:` (`h-[400vh] calm:h-auto`), y el JS tiene una rama calma
(`calmReveal` / `calmCount`) en vez de un `return` temprano. `npm run check:motion`
lo mide (huecos, trabas, texto oculto) con gestos táctiles reales.

«Ver con animaciones» (`MotionNotice` / `MotionToggle`, solo market, no viaja en el
ZIP) deja ver la demo completa **sin tocar el ajuste del dispositivo** (la web solo
lo lee):

- Se pregunta **una sola vez, en total**. La respuesta (`scrolllab-motion`) y el «ya
  te lo mostré» (`scrolllab-motion-notice`) viven en `localStorage`; después se
  cambia desde el header (`MotionToggle`, visible solo si el dispositivo pide reducir).
  No lo vuelvas a preguntar por pestaña, por template ni al navegar.
- Con `full`, `src/lib/motionOverride.js` pone `<html data-motion="full">` y reescribe
  `window.matchMedia`: `prefers-reduced-motion` da «sin preferencia» para TODO lo que
  corre en el market, incluidas las secciones que leen el ajuste directo y
  `gsap.matchMedia`. Por eso una sección nueva puede leer
  `matchMedia('(prefers-reduced-motion: reduce)')` sin romper el botón.
- **CSS**: una regla `@media (prefers-reduced-motion: reduce)` escrita a mano tiene que
  llevar `:where(:root:not([data-motion='full']))` adelante (o usar `calm:`), porque
  el CSS no pasa por `matchMedia`. En el ZIP y en el embed `data-motion` no existe y
  queda igual que siempre.
- Para saber qué pide el dispositivo de verdad (aviso, toggle) usá
  `deviceWantsLessMotion()`, no `matchMedia`: con el botón puesto esta última miente
  a propósito.
- `MOTION=forced npm run check:motion` verifica que, con «reducir movimiento» + el
  botón, cada página quede **igual que sin reducir** (alto y ScrollTrigger vivos);
  una sección que ignore el botón sale como `override-ignored`.

### Paridad con PC — lo que anima el mouse, lo anima el dedo

Con el movimiento completo un template tiene que verse y animarse en el teléfono
como en PC: el mismo beat, adaptado al toque (no una copia píxel por píxel).

- Lo que en PC responde al mouse (`pointermove`) usa `trackPointer()` de
  `src/lib/motion.js`: el mouse en PC, el dedo en el teléfono. Un dedo que
  scrollea cancela los eventos de puntero: una escena que solo escucha
  `pointermove` queda apagada en el teléfono. Es el caso de los 3D de FIZZ,
  MONOLITH y ATELIER.
- Blur animado solo en elementos chicos. Sobre una capa a pantalla completa o
  sobre fotos / canvas con scrub, el mismo beat en el teléfono con opacidad y
  escala: un `filter` animado se re-dibuja cuadro a cuadro y cuesta GPU (barato
  en PC, caro en un teléfono real).
- Un efecto con `matchMedia('(min-width: …)')` necesita su rama `(max-width: …)`
  que también anima. Un adorno que existe solo en PC (`hidden md:block`) no
  cuenta contra el teléfono: `check:parity` compara por pieza solo lo que se
  dibuja en las dos vistas. Lo que sí es una decisión se declara en `ACCEPTED`
  (`scripts/check-parity.mjs`, con el motivo).
- `motion-reduce:` de Tailwind significa lo mismo que `calm:` (respeta el botón).
- Todo 3D con `PerspectiveCamera` encuadra con `fitCameraDistance`
  (`src/lib/motion.js`): con la cámara fija el objeto llena el alto de la pantalla y
  en un teléfono en vertical ocupa más del doble del ancho (MONOLITH lo hacía). La
  función aleja la cámara solo en pantallas angostas; en PC devuelve la distancia de
  siempre.
- Las escenas WebGL llaman a `createFrameBudget` (`src/lib/motion.js`): si el teléfono no llega a
  ~30 cuadros, baja el pixel ratio de a escalones. En un equipo rápido no cambia nada.
- `npm run check:parity` compara cada sección PC ↔ teléfono ↔ tablet y falla con
  las marcas que no estén en `ACCEPTED`: `sin-trigger`, `quieta`, `solo-mouse`,
  `blur-pesado`, `canvas-quieto`, `css-quieto`.
- Si Chromium no baja Google Fonts (proxy cuyo CA no reconoce), el texto se
  mide con la fuente de reemplazo: `FONTS_VIA_CURL=1` (`check:mobile`,
  `check:motion`, `check:parity`) las baja con `curl` y se las entrega al
  navegador, sin tocar TLS.
- Un emulador no es un teléfono: es Chromium con perfil de teléfono, gestos
  táctiles por CDP y CPU ×4. No prueba la GPU ni Safari. Para mirar un teléfono
  real: `?motion-debug` en cualquier URL del market (`?motion-debug=0` lo apaga).

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
3. El medio de pago viene marcado por ubicación (país del request o zona horaria): Argentina → Mercado Pago en ARS; otro país → Paddle en USD. El comprador siempre puede cambiarlo con el selector «Medio de pago» (`PaymentMethodPicker`: argentino en el exterior, VPN, extranjero que quiere Mercado Pago). Un solo botón de pago; el «Comprar» rápido hereda el medio vigente. El header tiene un selector ARS | USD (`CurrencySelector`) que es esa misma elección: **la moneda de los precios sigue al medio de pago, no al idioma** (`useCurrency`, `src/lib/currency.js`; los precios se formatean con `formatPriceFromUsd(usd, currency, rate)`).
4. `POST /api/checkout` (`provider`) creates Order + MP preference, o la transacción de Paddle (overlay), o mock URL.
5. Webhook (`/api/webhooks/mercadopago` o `/api/webhooks/paddle`), confirm del front o mock-pay marks `paid` and packs ZIP into `storage/orders/` with watermarked LICENSE. Recibo es/en; un pago rechazado avisa por mail una vez, ~10 min después y solo si la orden sigue sin pagar (`services/paymentFailedSweep.js`).
6. `/account` → signed download token → `GET /api/download/:token` (TTL + max 10 downloads).

LAB (suscripciones) usa el mismo selector: Mercado Pago PreApproval en ARS o Paddle Billing en USD (`HOSTED_PLANS.priceMonthlyUsd` / `priceYearlyUsd`). Cuota cobrada y cuota rechazada mandan mail en las dos pasarelas.

## Architecture (extra)

Mapa completo y la regla de dependencia: [`docs/architecture.md`](docs/architecture.md). Las decisiones y su
porqué: [`docs/adr/`](docs/adr/README.md). En corto:

```
src/domain/            precios, qué se vende y secciones: JS puro que importan el front y el servidor
server/
├── app.js             composition root (middlewares, sesión, Passport y el montaje de los routers)
├── http/routes/       un router por dominio: solo traduce HTTP ↔ servicios (sin reglas de negocio)
├── services/          las reglas de negocio (checkout, payments, subscriptions/, email, orders…)
├── repositories/      persistencia por entidad; db.js los compone (archivos en dev, Mongo en prod)
├── auth/passport.js   sesión y login con Google
├── errors.js          HttpError (una sola clase)
└── packaging.js       arma el ZIP (+ licenseWatermark.js, downloadToken.js)
src/features/          bloques de la home y del builder; la página los compone
src/lib/               utilidades del market (cart, api, pricing de UI…)
```

**Regla de dependencia**: se importa solo hacia abajo. `src/domain` no importa React ni capas de arriba (ESLint lo
hace cumplir); las rutas no tienen reglas de negocio; los servicios no conocen `req`/`res`.

**Refactors**: antes de mover código que mueve plata, mails, la base o el ZIP, sacar una foto del comportamiento y
compararla después (ver [ADR 0005](docs/adr/0005-refactors-con-foto.md)). Con otras sesiones trabajando en el mismo
árbol, nunca `git stash`/`checkout`/`add -A`: para comparar contra `HEAD` limpio, una copia con `git archive`.

Los templates fijos tienen precio de lista; la composición del builder va **por
tramos**: base de USD 389 con 8 secciones incluidas, USD 15 por cada sección
extra hasta 30, más USD 39 si la receta trae commerce. Cuenta cada entrada de la
receta (nav, footer y repeticiones incluidas). RATIO (Beat) lista USD 269 pero
sigue en `COMING_SOON_SKUS` (no cuenta para el piso); la base del builder tiene
que quedar **arriba** del template más caro que SÍ está en venta (hoy MERIDIAN,
USD 379).
Las constantes viven **una sola vez** en `src/domain/catalog.js` (dominio puro, sin React):
las importan `src/lib/pricing.js` (UI) y `server/catalog.js` (copy de Checkout Pro, conversión
a ARS). `npm run check` valida que la base supere al template más caro en venta. Detalle en `docs/DEPLOY.md`.

Never trust client prices. Never obfuscate sold JSX — license + account + signed links + watermark.
In production: Mongo required (no silent file fallback), mock/dev auth off, MP webhook signature required, persistent `STORAGE_DIR`.

## Template models / section conventions

(Same as before: self-contained sections, `lib/gsap.js`, reduced motion, matchMedia for heavy scroll.)

Image pieces for new models: generate realistic local assets (see `.cursor/rules/template-image-assets.mdc`), keep the originals in `design/masters/<sku>/` and run `npm run images` — it writes the WebP variants plus `sections/<sku>/assets/images.js`, and each `<img>` uses `imgAttrs(src, variants)` with its own `sizes`. Do not ship sellable defaults on picsum.

Riel / cubo / letras que siguen un path: **Beat** (`src/lib/beat`, [`docs/scrolllab-beat.md`](docs/scrolllab-beat.md)). `<BeatStage>` + `<Beat>`. No copies el motor a `sections/<sku>/`.

Register new sellable SKUs in `server/catalog.js` (copy de Checkout Pro) + su precio en `src/domain/catalog.js`, and pack logic in `server/packaging.js`.

**Sumar una sección nueva** (la tabla de secciones vive una sola vez en `src/domain/sections.js`):
1. `src/domain/sections.js` → el id y su `kind` dentro de su modelo (el orden es el de la paleta).
2. `src/lib/sectionRegistry.jsx` → componente, nombre y blurb (mismo id, mismo orden).
3. `server/__tests__/sections.test.js` → sumar el id a `APPROVED` si se vende: la allowlist del servidor
   (`server/sections.js`) se deriva sola, el test la fija para que habilitarla sea a propósito.
4. Campos editables **solo** en `src/lib/sectionFields.js`: el servidor deriva de ahí qué props acepta.
   Un campo `color` se llama `bg`/`fg`/`accent`… y uno `href` termina en `Href`: el servidor valida por
   nombre y `npm run check` lo exige. Después, i18n del builder y `HOSTABLE_SECTIONS` como siempre.

`src/lib/sectionKinds.js`, `ALLOWED_SECTIONS` y `ALLOWED_PROPS_BY_SECTION` / `LIST_PROPS_BY_SECTION`
(`server/sectionFields.js`) ya **no se editan a mano** (no existe más `gen-section-kinds.mjs`). `npm run verify` avisa si algo quedó afuera.

## Storytelling motion (HTML + CSS + JS — no magia)

El scrollytelling **no es imposible**: son capas DOM + CSS + GSAP/Lenis. Antes de inventar un efecto, **leer y reutilizar** el cookbook:

| Dónde | Qué |
|---|---|
| Repo | [`docs/motion-cookbook.md`](docs/motion-cookbook.md) |
| Obsidian (canónico) | `Storytelling motion cookbook.md` en ScrollLab |
| Wiring | `src/lib/gsap.js` + `SmoothScrollProvider` / `useLenis` |
| Beat (producto) | [`docs/scrolllab-beat.md`](docs/scrolllab-beat.md) · `src/lib/beat/` |
| Motion + Componentry | [`docs/motion-componentry.md`](docs/motion-componentry.md) · `src/components/ui/` |

### Qué motor usa cada cosa (no mezclar en el mismo elemento)

| Capa | Herramienta |
|---|---|
| Scroll / storytelling (P1–P14, Beat) | **GSAP + ScrollTrigger + Lenis** — no migrar |
| Enter/exit, layout animations, gestos, springs | **Motion for React** (`import { motion } from 'motion/react'`) |
| Piezas listas para copiar (MIT, quedan como código nuestro) | **Componentry** (`componentry.dev`) → `src/components/ui/` |

Si el efecto se scrubea con el scroll es GSAP. Motion y GSAP peleando por el
`transform` del mismo nodo es un bug garantizado.

**ZIP:** el empaquetador (`server/packaging.js`) copia `SHARED` + la carpeta de la
sección y **no sigue imports relativos**. Una sección de un template a la venta
no puede importar `components/ui/*` ni `lib/utils` (no viajan, ni sus deps). PLUM
sí los importa — ver el bloque "Bloqueante" en
[`docs/motion-componentry.md`](docs/motion-componentry.md). PLUM y SIGNAL no se
van a terminar: quedan solo en local (`LOCAL_ONLY_SKUS`, ruta que en producción
redirige a la home, fuera del builder, sus frames no viajan en el build).
El alias `@/` (→ `src/`) es sólo para `components/ui` y `lib`, nunca dentro de
`components/sections/*`.

**Docs de Motion dentro del agente:** `npx motion-ai` instala un MCP con la
documentación siempre actualizada (búsqueda gratis, sin token). Es interactivo
— lo corre el usuario, no el agente. Detalle en el doc de arriba.

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

Al portar una ref (Loom / live): anotar cada beat como `beat → P# → archivo` **o** `beat → Beat recipe → archivo`.

### Beat — motor propio (secciones + builder)

Producto: [`docs/scrolllab-beat.md`](docs/scrolllab-beat.md). Widgets: `<BeatStage>` + `<Beat mag recipe>` — cada pieza es un riel (`offset-path`) y el escenario hace `seek` al scroll. GSAP solo pincha. Equivalente a mano: `data-beat` + `useBeatStage`. El motor **no** va en el ZIP vendido (`SHARED` en `packaging.js` lo excluye). No hay compilador aparte: el riel se arma en runtime.

#### Cómo se usa en un template propio nuevo (obligatorio)

1. Inventar el **mundo** del template (fotos reales, tipo, copy placeholder en inglés).
2. Elegir **una escena firma** (casi siempre el hero; a veces un objeto que cruza el tipo).
3. Piezas = widgets Beat: `<BeatStage>` + `<Beat mag recipe>` (o `data-beat` + `useBeatStage`). Receta propia — no copiar el cubo de RATIO. En el registry: `beat: true`.
4. El resto de la página puede ser primitivos P1–P14 (pin, zoom, WebGL). Beat no reemplaza todo.
5. Esa sección **entra al builder**. El panel edita copy; el motion viaja en el JSX/ZIP. Quien arma una composición se lleva Beat sin tocar código.

#### Builder (v1)

- **Sí:** secciones `beat: true` en la paleta (badge Beat) cuando el modelo ya no está en obra. RATIO sigue en `BUILDER_HIDDEN_SKUS` + `COMING_SOON_SKUS` hasta estar terminado.
- **No:** editor de recetas JSON / `dx`/`dy` en el panel. `sectionFields.js` sigue en strings.
- Después (cuando haya 2–3 escenas Beat): un tipo de campo `beat` en `SECTION_FIELDS`.

#### Precio

- RATIO lista **USD 269** (Beat) pero sigue en `COMING_SOON_SKUS`, no cuenta para el piso. Catálogo en venta: entry 149 / mid 189 / top 229 / MERIDIAN 379 (el más caro hoy).
- RATIO lista **USD 269** (Beat). Catálogo en venta: entry 149 / mid 189 / top 229 / MERIDIAN 379.
- La base del builder (`CUSTOM_BASE_PRICE_USD`, hoy 389) tiene que superar al template más caro **en venta** (RATIO no cuenta mientras esté en `COMING_SOON_SKUS`). Si subís un SKU vendible por encima de la base, subí la base o `npm run check` falla.

### Readymag (cuando la ref lo usa) — cómo se aprendió

RATIO (`HeroTools`) clavó el hero de https://grids.obys.agency/ **porque se portó el motor**, no porque se aproximó el look. Ese motor ahora vive en `src/lib/beat/engine.js`.

La modelo no trae GSAP. Trae el viewer de Readymag: CSS `offset-path` / `offset-distance`, wrappers `.animation-container`, y `timeline.seek(scrollTop)` con easing cuadrático. El JSON de cada widget vive en `RM.viewerRouter.mag.currentPage.widgets` (`dx`/`dy` absolutos, canvas 1024).

| Dónde | Qué |
|---|---|
| Producto (usar esto) | [`docs/scrolllab-beat.md`](docs/scrolllab-beat.md) · `src/lib/beat/` |
| Método de port | [`docs/readymag-motion.md`](docs/readymag-motion.md) |
| Ejemplo ya clavado | `src/components/sections/ratio/HeroTools.jsx` |

**No** meter `viewer.js` de Readymag en el ZIP vendible (propietario). Si un template nuevo sale de Readymag, extraer `animation[]` y alimentar Beat (`attachScroll` / `playLoadPath`). Detalle y anti-patrones en el doc de port.

### WebGL mini motor (card / tableau)

Producto: [`docs/scrolllab-webgl.md`](docs/scrolllab-webgl.md). API: `src/lib/webgl/` (`createWebGLStage`, `attachPointerOrbit`, `createCoverPlane`). **Sí** va en el ZIP (`SHARED` en `packaging.js`). Three.js ya está en `package.json` raíz.

**Patrón KPR (obligatorio en heroes WebGL):** `#canvas-container` fijo + `<canvas>` Three.js + DOM encima (`pointer-events-none`). No retrato hero en `<img>`. Referencias en el catálogo: `monolith/HeroThree.jsx`, `fizz/HeroBubbles.jsx`, `atelier/*`.

No confundir con Beat: WebGL mueve cámara/meshes; Beat mueve DOM en riel. Un third path (secuencia de WebP en canvas 2D, estilo pear.no) está en [`docs/scroll-media.md`](docs/scroll-media.md).

**Nuxt:** KPR usa Nuxt (Vue). SCROLLLAB usa React/Vite — **mismo Three.js**, no hace falta cambiar de framework.

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
3. **Piezas de imagen del template** → inventariar cada foto/cutout que la ref anima (skill `template-image-designer`), generarlas con **Higgsfield** (`generate_image`, cutout con `remove_background`), guardar el original en `design/masters/<sku>/` y correr `npm run images` (WebP + `assets/images.js`), **sin picsum**. Si el beat pide un objeto 3D **procedural genérico** → **img2threejs**. Si pide un GLB texturizado → Higgsfield `generate_3d` o Meshy.
4. Si hace falta narrativa o decisión ya anotada → leer notas en la bóveda Obsidian (abajo).
5. **Motion / transitions de un template** → leer `Storytelling motion cookbook.md` (Obsidian) + `docs/motion-cookbook.md`. Piezas que recorren un riel → **Beat** (`docs/scrolllab-beat.md`, `useBeatStage`). Si la ref es Readymag → extraer recetas ([`docs/readymag-motion.md`](docs/readymag-motion.md)) y alimentar Beat, no tweens `x/y` “parecidos”.
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

### Plugin: Higgsfield (imágenes, video, 3D)

- Ya vinculado: namespace MCP `plugin-higgsfield-higgsfield`. Si no aparece, Customize → Plugins / MCPs y reautenticar.
- Default para fotos y cutouts de templates (`generate_image`, `remove_background`). Original en `design/masters/<sku>/` + `npm run images`.
- Video y `generate_3d`: `get_cost:true` y confirmar créditos. Mismo filtro de plantilla genérica que el resto del catálogo.

### MCP: Meshy (generación de assets 3D)

- Config del servidor MCP en `.cursor/mcp.json` (servers `meshy` → `npx -y @meshy-ai/meshy-mcp-server` y `higgsfield` → `node ${workspaceFolder}/scripts/higgsfield-mcp.mjs`, ambos con `"envFile": "${workspaceFolder}/.env"`). **Ese archivo está gitignored**, así que no viaja con el repo: si no existe, recrealo con esas dos entradas.
- En Claude Code los dos están registrados en scope `local` (`~/.claude.json`, no commiteado). Para recrearlos: `claude mcp add meshy --scope local --env MESHY_API_KEY=… -- npx -y @meshy-ai/meshy-mcp-server`.
- La API key va **solo** como secret `MESHY_API_KEY` (empieza con `msy_`), referenciada en `mcp.json` como `"MESHY_API_KEY": "${env:MESHY_API_KEY}"`. Nunca hardcodear ni commitear la key (los docs de Meshy lo advierten; consume créditos de la cuenta).
- El server **valida la key contra `https://api.meshy.ai` al arrancar**: sin una key válida no levanta (`Invalid MESHY_API_KEY`) y las tools no aparecen. Tras setear el secret, activá el server en el panel MCP de Cursor.
- Encaja con el uso de Three.js/WebGL del catálogo; `meshy_output/` ya está gitignored para las salidas.
- No confundir con **img2threejs**: Meshy (y Higgsfield `generate_3d`) entregan mesh/GLB; img2threejs escribe Three.js procedural. Para **fotos de templates** el default es Higgsfield, no Meshy.
