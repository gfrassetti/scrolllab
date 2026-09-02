# Handoff — replicar kprverse.com desde cero

> Brief para armar un template SCROLLLAB nuevo que reproduzca los efectos y
> animaciones de `https://kprverse.com/`. Empezar de cero: no hay código previo
> que reusar para esto. Análisis de red hecho el 2026-08-30 (Three.js r150).

---

## 1. Objetivo

Un modelo vendible, nivel Awwwards, que capture la **sensación** de kprverse:
boot cinematográfico, wordmark que morfea, hero full-bleed con cámara que orbita
al puntero, y tableaux de "carpetas" dispersas con parallax por pieza sobre un
fondo que se revela. Estilo a definir con el usuario (kprverse es "clean web3";
si el pedido es cyberpunk/anime, la paleta cambia pero la mecánica es la misma).

**Elegir un nombre de SKU antes de empezar** (`<sku>` / `<Name>` en este doc).

## 2. Qué es kprverse.com

Landing de un proyecto de coleccionables. Scrollytelling de una sola página,
Nuxt/Vue. La estética: ilustración painterly plana (no hay arte 3D), luz clara
—lavanda, crema, mint— sobre papel crema, acentos turquesa saturados. Contraste
suave. El HUD (crosshair, reglas de columna, labels mono) hace la mitad del
trabajo de "esto se siente un producto vivo".

## 3. El motor — evidencia de red

`three.module.c9112413.js` bajado del sitio es **Three.js r150 stock**
(`const t="150"`, copyright Three.js Authors, MIT, sin una línea custom). El
`data-engine="three.js r150"` del `<canvas>` lo estampa el propio Three.js. **No
hay motor propietario.** Son tres sistemas conviviendo + audio:

### 3.1 Three.js + texturas KTX2 (escena en tiempo real)
```
/images/compressed/ktx/tableau/keep/kai/kai-3.ktx2
/images/compressed/ktx/tableau/keep/beam-ship/beam-ship-{0,1,2}.ktx2
```
`.ktx2` = Basis Universal, textura comprimida para GPU. Se transcodifica en un
worker (por eso las decenas de `blob:` en el waterfall) y se sube directo a VRAM.
El retrato del hero es **ilustración 2D sobre un plano** con órbita de cámara
(damp λ≈3), **no un mesh**. KPR no tiene arte 3D.

### 3.2 Sprite atlas frame-by-frame (el wordmark)
```
/images/sheets/logo-anim-low-res-0.json   ← descriptor TexturePacker
/images/compressed/ktx/sheets/logo-anim-low-res-0.ktx2  ← el atlas
```
| Dato | Valor |
|---|---|
| Formato | TexturePacker, RGBA8888 |
| Atlas | 2048 × 2048 |
| Frames | **101** (`logo_anim_downscaled_00000…00100`) |
| Frame | 206 × 124 (trimmed) |

101 fotogramas en **un solo archivo**, reproducidos moviendo el offset de UV en
el shader. Una request, cero stutter, rewind perfecto. Es el zoom por la letra
del boot.

### 3.3 After Effects → JSON (el *second layer* — la firma visual)
```
/data/2ndlayer.ae.json
```
Export literal de un proyecto de After Effects, replayado en el browser:
```json
{ "project": { "totalDuration": 180.18, "compositions": [
  { "name": "keep0", "duration": 30.03, "numLayers": 8, "size": [1920,1080],
    "layers": [ { "name": "5", "type": "ADBE AV Layer", "inOut": [5.47, 7.47],
      "properties": { "position": {"keyframes":[...]}, "scale": {"keyframes":[...]},
                      "anchorpoint": {...}, "marker": {...} } } ] } ] } }
```
6 composiciones (desktop + mobile por tableau: `universe0`, `keep0`,
`factions0`). Propiedades animadas: `position`, `scale`, `anchorpoint`, `marker`.
El sitio interpola esos keyframes contra el **playhead del scroll**.

Las fuentes de esas capas son WebP con alpha en **anclas de pantalla nombradas**:
```
/images/compressed/webp/tableau/{keep,factions,universe}/second-layer/flow-0/set-{0..5}/{slot}.webp
```
Slots: `trc brc blc` · `crl crs` · `cbl cbs` · `cl cs` (top/bottom + right/left
corner; center right/bottom, large/small). Los `set-0..5` son **pasos de
profundidad/parallax**, no frames consecutivos. La mayoría de los slots son
stubs 1×1 transparentes; solo unos pocos llevan arte real, siempre cutout con
alpha.

**El *second layer* = collage de recortes con alpha, anclados a posiciones
nombradas, animados con keyframes de AE contra el scroll.** No es un flipbook.

### 3.4 Audio por tableau
```
INTROx_song.mp3 · INTROx_AFTER_loop.mp3
TBL1_song.mp3 · TBL1_AFTER_loop.mp3   (idem TBL2, TBL3)
FX_Wind.mp3 · FX_TBL_Transition.mp3 · FX_press_sheen.mp3
```
Cada tableau: tema + loop de permanencia + FX de transición y de press. El
click-to-sound del boot existe para arrancar el `AudioContext`.

## 4. Estructura de la página (el arco)

| # | Tramo | Fondo | Qué pasa |
|---|---|---|---|
| 0 | Boot | **blanco** | `LOADING - N%`, línea de progreso fina, URL de protocolo a la derecha, botón circular "CLICK TO ENABLE SOUND" centrado |
| 1 | Wordmark | **blanco** | Logo gigante negro morfeando (atlas de 101 frames) |
| 2 | Hero | **oscuro** | Retrato full-bleed, tipografía blanca gigante encima, HUD |
| 3 | Card fold | oscuro → **crema** | La card del hero se achica a forma de carpeta |
| 4+ | Tableaux | **crema** | Headline negro gigante + cards de carpeta dispersas |

Detalles que suman mucho y **no dependen del arte**:
- **Grid de columnas visible**: reglas verticales finas; es la estructura sobre
  la que todo se alinea.
- **Headline que se entinta**: arranca gris claro y se resuelve a negro sólido
  con el scroll — no aparece, se *entinta*. Un índice chico (`001`) al costado.
- **Cards de carpeta dispersas** abajo-derecha, **tamaños distintos**, con
  solapamiento real, moviéndose a **distinta velocidad entre beats** (parallax
  por card — ahí está la profundidad, no en un tilt 3D).
- **Riel izquierdo fijo**: crosshair ✛ a media altura, `.....` abajo.
- **Nav fija** con el ítem activo marcado por un cuadradito ■.
- **Label dentro de la card**, arriba-izquierda: mono, mayúsculas, bullet
  cuadrado — `■ TRAILER V. 004`. Va SOBRE la imagen.
- **Botón de play** (círculo con ▷) abajo-izquierda en cards de trailer.
- **Bloque de copy chico** abajo-izquierda de la sección (~4 líneas), contrapeso
  del headline gigante.
- KPR **alterna** secciones claras y oscuras (`darkTheme`/`lightTheme` en el
  DOM). El tableau principal ("A FAMILIAR WORLD… SET ON A DIFFERENT PATH") es
  crema.

Escala tipográfica medida en el DOM de la ref (1440): H1 273.6px / numeral
"00 k" 369px (fuente *Hexaframe*); H2 46.8px (fuente *ABCWhytePlus*). No
inventar la escala: medir contra la ref.

## 5. Qué replicar y con qué (herramientas del repo)

| Mecanismo KPR | En el template nuevo | Por qué |
|---|---|---|
| Three.js + plano texturizado + órbita de cámara con damp | **igual** — `src/lib/webgl/` (`createWebGLStage`, `createCoverPlane`/`fitCoverPlane`, `attachPointerOrbit`, λ≈3) | El mini-motor ya existe y **sí** viaja en el ZIP. El arte es 2D sobre un plano, no un GLB. |
| KTX2 / Basis | **no** | Es optimización de carga, no estética. Textura normal alcanza y no querés un transcoder en el ZIP. |
| Atlas de 101 frames del wordmark | **no como atlas** — máscara SVG / clip-path que morfea con `progress` | Vectorial, editable por el comprador, pesa nada, mismo resultado en pantalla. |
| AE → JSON (second layer) | **Beat** — `src/lib/beat/` (`<BeatStage>` + `<Beat mag recipe>`) | El contenido de ese JSON es exactamente lo que Beat hace: keyframes de position/scale sobre un riel con seek al scroll. Sin AE ni motion designer. |
| Cutouts con alpha en anclas nombradas | **sí, es prioritario** | Es la firma de KPR. Higgsfield + remoción de fondo, colocados en slots con nombre. Grid de slots fijo, la mayoría vacíos. |
| Audio por tableau | **decidir con el usuario** | Suma "live-service" pero pesa en el ZIP y hay que licenciarlo. |
| HUD (crosshair, grid de columnas, labels mono, nav con ■) | **sí** | Barato y es la mitad del parecido. |

Traducción práctica del arco: después de boot + hero, el entregable de mayor
impacto es un **componente `SecondLayer` reutilizable** (grid de slots con
nombre + riel Beat) que las secciones tableau consumen con distinto arte. Es un
subsistema, se construye una vez.

## 6. Qué NO portar (licencia)

Nada de esto viaja al ZIP vendido: el bundle Nuxt/Vue, los `.ktx2` de KPR, los
WebP de sus tableaux, `2ndlayer.ae.json`, los MP3, el arte de Kai/Keepers, el
copy y las URLs de protocolo. Se extrae la **receta de motion**, no el material.
Copy placeholder en inglés genérico (Headline N / lorem corto).

## 7. Cómo arrancar

1. **Analizar la ref** (no esperar a que lo pidan):
   ```
   npm run analyze:ref -- https://kprverse.com/ --sku <sku> --name "<Name>"
   ```
   Playwright muestrea el scroll y guarda **solo los beats donde cambia la
   firma** (fondo / sticky / transforms / texto) + JPEG livianos en
   `docs/reference-analysis/<sku>/beats/` + `beats.json`. Si hay `GEMINI_API_KEY`
   en `.env`, anota fondo/figura/texto.
2. Por cada beat clave (inicio, cada cambio de fondo, el final): anotar
   `beat → primitivo (docs/motion-cookbook.md) → archivo`. Ej:
   ```
   beat 0-2   → boot lock + máscara SVG           → Boot<Name>
   beat 1-2   → wordmark morph                     → <Name>Mark
   beat 2-3   → hero WebGL + type reveal + fold    → Hero<Name>
   beat 4-18  → tableau: fan de cards + entintado  → SecondLayer + <Tableau>
   ```
3. Definir el **mundo** del template (fotos, tipo, copy en inglés) y **una
   escena firma** (casi siempre el hero, o un tableau con el SecondLayer). Esa
   escena entra al builder.
4. Página `src/pages/<Name>Page.jsx` + ruta en `src/App.jsx`. Mientras está en
   obra: **gatear la ruta con `import.meta.env.DEV`** y NO registrar el SKU en
   catálogo (así `npm run check` sigue verde). Ver §9.

## 8. Convenciones del repo (respetar)

- **Stack**: Vite + React 19 + Tailwind v4, GSAP 3 + Lenis + three.
- **Motion**: importar GSAP **solo** de `src/lib/gsap.js`. Página dentro de
  `SmoothScrollProvider` (Lenis). Primitivos P1–P14 en `docs/motion-cookbook.md`
  — leer y reusar antes de inventar. Respetar `prefers-reduced-motion` (estado
  final con `gsap.set`, sin scrub). `matchMedia` para gatear scroll pesado.
- **Beat** (`docs/scrolllab-beat.md`, `src/lib/beat/`): widgets `<BeatStage>` +
  `<Beat mag recipe>`. `mag` = reposo en lienzo 1024 (`x y w h z`); `recipe.scroll`
  = riel (`dx/dy` absolutos desde el reposo, `delay_px`, `speed`, `acc`). El
  escenario hace `seek` al scroll; GSAP solo pincha. Receta propia por escena, no
  copiar presets de otros modelos. **Beat NO viaja en el ZIP vendido** (plusvalía
  marketplace — `SHARED` en `server/packaging.js` lo excluye).
- **WebGL** (`docs/scrolllab-webgl.md`, `src/lib/webgl/`): **sí** viaja en el
  ZIP. Patrón hero: `#canvas-container` fijo + `<canvas>` Three.js + DOM encima
  (`pointer-events-none`). No retrato en `<img>`. Referencias del catálogo:
  `monolith/HeroThree.jsx`, `fizz/HeroBubbles.jsx`, `atelier/*`.
- Secciones **self-contained** en `src/components/sections/<sku>/`. Assets en
  `sections/<sku>/assets/`, importados en el JSX. **Sin picsum.**
- Nav: usar `parseNavLinks` (`src/lib/navLinks.js`) + `useMobileMenu`
  (`src/hooks/useMobileMenu.js`). Scrim + blur detrás de la barra, **no**
  `mix-blend-difference` (se rompe sobre headlines gigantes).
- **No** leer los componentes de otros templates como plantilla antes de
  construir — ancla a un clon. Construir contra los beats y la ref.

## 9. Registrar el SKU (dev-only primero, vendible después)

**En obra** (lo mínimo, `npm run check` sigue verde):
- `src/pages/<Name>Page.jsx` + `<Route path="/templates/<sku>" element={import.meta.env.DEV ? <Page/> : <Navigate to="/" replace/>} />` en `src/App.jsx`.
- Bloque de skin en `src/index.css` (patrón `.atrium-world`: un scope que
  define toda la paleta; secciones skin-agnósticas).
- Nada más.

**Para venderlo** (todos estos, la paridad de precios la valida `npm run check`):
`server/catalog.js` (PRODUCTS) · `src/lib/pricing.js` (TEMPLATE_PRICES_USD) ·
`server/sections.js` (ALLOWED_SECTIONS) · `src/lib/sectionRegistry.jsx` ·
`src/lib/sectionFields.js` + `server/sectionFields.js` · `src/lib/sectionKinds.js` ·
`src/lib/sectionTheme.js` · `src/lib/shop/theme.js` · `server/packaging.js`
(MODELS + wrapperClass) · `src/pages/TemplatesIndex.jsx` (meta + cover
`/public/catalog/<sku>.jpg`) · `src/i18n/locales/{en,es}.json`
(`templates.<sku>`) · quitar el gate `import.meta.env.DEV` de la ruta.
Precio: catálogo hoy 149 / 189 / 229 / 269 (Beat). Un modelo con WebGL + Beat
va en la banda alta. La base del builder (`CUSTOM_BASE_PRICE_USD`) tiene que
quedar arriba del template más caro.

## 10. Arte — Higgsfield

- Tool: `mcp__higgsfield__higgsfield_generate`. Empezar por
  `higgsfield_list_models` para el esquema exacto.
- Endpoint típico: `/higgsfield-ai/soul/standard` — params `prompt`,
  `num_images` (≤4), `aspect_ratio`, `resolution`. **`resolution` real es
  `720p` / `1080p`** (el schema dice `2K`/`4K` y devuelve 422).
- La API pública **no** trae `remove_background`. Para cutouts: pedir "aislado
  sobre negro plano" y keyear por CSS/`mix-blend`, o editar con `/nano-banana` /
  `/reve/edit`.
- **Estado hoy: `403 not_enough_credits`.** Sin recarga de crédito no hay arte
  propio. Probar el estilo con 1 imagen antes de tirar un batch.
- Guardar en `src/components/sections/<sku>/assets/`.
- Batch mínimo para una demo creíble: 1 retrato hero + 4–6 cutouts con alpha
  para los slots del SecondLayer + 1–2 fondos de tableau.

## 11. Verificación

- `npm run check` + `npx eslint <archivos tocados>` en verde.
- Capturas a **1440×900** en los stops de scroll clave, comparadas contra
  `docs/reference-analysis/<sku>/beats/beat-NN.jpg`. No "se scrollea bien".
- **Scroll en tests**: manejar con Lenis
  (`getLenis()?.scrollTo(y, { immediate: true })`) o con eventos de rueda
  reales. `window.scrollTo` nativo lo **ignora** Lenis para el sync de
  ScrollTrigger → las timelines con scrub no avanzan.
- El panel de browser **oculto** throttlea rAF y no compone las capas pineadas
  (`position: fixed`) en los screenshots — verificar visualmente con el panel
  **visible**.
- Probar `prefers-reduced-motion`: boot se saltea, escenas en estado final.
- Bugs típicos del anillo/scatter de cards: `width: 0` fantasma (verificar con
  `getBoundingClientRect()`, no a ojo); rotar el wrapper en scrub, nunca el tile
  que ya tiene su `rotate` fijo.

## 12. Errores a no repetir

- **Aplastar a monocromo / duotono**: KPR tiene color pleno. Monocromo aleja.
- **Dos planos de la misma foto para paralaje**: render negro intermitente; dos
  copias de una imagen no es profundidad real. Usar dos objetos a distinta `z`
  o el parallax por card del second layer.
- **Perseguir el "flicker" como bug de código**: buena parte es contención de
  CPU real (varios dev servers en paralelo).
- **Leer el JSX de un template hermano y "pulir encima"** en vez de construir
  contra la ref → sale un clon. Reescribir mirando los beats.
- El arte oscuro/fotorrealista sobre papel crema queda como un agujero negro
  pegado. Si el estilo es oscuro/cyberpunk, **todo el tramo** tiene que ser
  oscuro (no heredar el papel crema de KPR).

## 13. Reproducir el análisis de red

```bash
curl -s https://kprverse.com/data/2ndlayer.ae.json | node -e "…"
curl -s https://kprverse.com/images/sheets/logo-anim-low-res-0.json | node -e "…"
```
O con el browser pane: `preview_start` en la URL → `read_network_requests` con
`limit: 200` una vez que pasó el boot.
