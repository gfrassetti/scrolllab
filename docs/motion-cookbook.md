# Storytelling motion cookbook

> Al final es HTML + CSS + JS. Cada efecto se reduce a primitivos GSAP/Lenis/CSS.
> **Fuente canónica (segundo cerebro):** Obsidian `Storytelling motion cookbook.md`
> Este archivo es el espejo en el repo para el agente y PRs.

## Stack

| Capa | Lib / API | Dónde |
|---|---|---|
| Smooth scroll | Lenis ↔ `ScrollTrigger.update` | `src/hooks/useLenis.js` |
| Tweens / timelines | GSAP 3 | `src/lib/gsap.js` |
| Scroll scenes | ScrollTrigger (`pin`, `scrub`) | idem |
| Type split | SplitText | idem |
| React setup | `useGSAP` | `@gsap/react` vía `lib/gsap.js` |
| **Beat** (riel + seek) | `src/lib/beat` | [`docs/scrolllab-beat.md`](scrolllab-beat.md) |
| Canvas 3D / secuencia de frames | Three.js o canvas 2D + WebP | [`docs/scroll-media.md`](scroll-media.md) |

Reglas: importar GSAP solo desde `lib/gsap.js`; página dentro de `SmoothScrollProvider`; respetar `prefers-reduced-motion`.

## Primitivos

| ID | Efecto | Lib | Método clave |
|---|---|---|---|
| **P1** | Pin + scrub timeline | GSAP ScrollTrigger | `gsap.timeline({ scrollTrigger: { pin, scrub, end: '+=N%' } })` |
| **P2** | Zoom/parallax imagen, UI fija | GSAP | animar solo media (`scale`/`yPercent`); chrome en sibling |
| **P3** | Crossfade capas A→B | GSAP | N `<img absolute>` + `opacity`/`scale` cruzados (no cambiar `src` en scrub) |
| **P4** | Disco / zoom-through circular | GSAP + CSS | `rounded-full size-[145vmax] scale 0→1`; bg = color de la sección siguiente |
| **P5** | Horizontal en pin vertical | GSAP | `gsap.to(track, { x: () => -distance(), scrollTrigger: { pin, scrub } })` |
| **P6** | Flores cutout parallax | GSAP + CSS | PNG alpha; scrub `yPercent`/`rotate`; `mix-blend-multiply` opcional |
| **P7** | Lista índice que crece | GSAP tl | item activo `scale↑ opacity 1`; resto atenuado + P3 |
| **P8** | SplitText reveal | SplitText | `new SplitText(el, { type })` + `gsap.from(chars, { yPercent: 110, stagger })` |
| **P9** | Carousel timer | React + CSS | `setInterval` + `@keyframes scaleX` + P8 al cambiar slide |
| **P10** | Hotspots + notes | React | posiciones `%` + hover card; fade-in del grupo en tl |
| **P11** | Rail numérico | GSAP | proxy `{ n }` + `onUpdate` → `padStart(2,'0')`; rail `mix-blend-difference` |
| **P12** | Crest / badge rotando | CSS | `animate-spin` + SVG `textPath` |
| **P13** | Overlap sin hard cut | composición | mismo bg en handoff; media opacity↓ al final del pin |
| **P14** | Day/Night | React state | swap `src`; **no** meter mode en deps del `useGSAP` del pin |
| **P16** | Mask slider (push + estiramiento) | GSAP ticker + ScrollTrigger | posición continua `pos`; por slide `d = i - pos` → caja `translateX(d·100%)`, foto `translateX(-d·W/2) scale(1+1.2|d|, 1+0.2|d|)` — ver abajo |
| **P18** | Mapa con pines + ruta punteada punto por punto | GSAP + SVG | un padre con imagen de mapa + SVG + pines en `%` del mismo espacio; la ruta son N `<circle>` muestreados sobre la curva y animados con `stagger` (`attr r` 0→1.9) — ver abajo |
| **P19** | Reveal circular en card (clip-path) | CSS | foto con `clip-path: circle(0 at <esquina del pin>)` → `circle(150%)` al activar; el título pasa a blanco; al salir colapsa hacia adentro |
| **P20** | Slider por menú de links + hotspots | GSAP + React | mismo motor de máscara que P16 pero `pos` animado por click (1.3s `power3.inOut`); hotspots `%` dentro de la caja del slide (no de la foto) + tooltip a nivel de stage — ver abajo |
| **P21** | Cards con foto ⇄ párrafo ("+" → "×") | CSS clip-path + GSAP | foto con `clip-path: circle(150% at <esquina>)` que colapsa a `circle(0)` al abrir; botón con fill que crece desde el centro en hover, tinta + `rotate(45deg)` al abrir; fotos con parallax interno — ver abajo |
| **P22** | Aérea con puntos que laten + contorno al hover | GSAP + SVG | foto, contornos SVG y puntos comparten una caja con el aspect de la foto y coordenadas en px de la foto; hover = punto desaparece, contorno se traza (`strokeDashoffset` con largo REAL) + tooltip — ver abajo |
| **P17** | Handoff con parallax (hero sticky → sección siguiente) | ScrollTrigger | al salir del sticky, el fondo baja `0.3 × distancia` mientras el stage sube 1:1 — ver abajo |

### Beat (producto SCROLLLAB — no es P15)

Motor propio: widgets `<BeatStage>` + `<Beat>` (riel CSS `offset-path` + `seek`). Spec: [`docs/scrolllab-beat.md`](scrolllab-beat.md). Código: `src/lib/beat/`. Secciones nuevas: esos componentes. GSAP solo pincha.

Si la URL de referencia es un proyecto Readymag, **no** interpolar con tweens GSAP `x/y`. Extraer recetas y alimentar Beat. Método de port: [`docs/readymag-motion.md`](readymag-motion.md). HeroTools (RATIO) es el primer consumidor; no reescribirlo si ya está clavado.


### P16 — Mask slider (push + estiramiento)

Es el `effect: 'mask'` del Swiper de horizonte-village.com (`speed: 1200`), reconstruido sin Swiper. Código: `src/components/sections/meridian/GallerySlider.jsx`.

**Idea:** no hay "slide activo" que cambia; hay una **posición continua** `pos` (float). El contador es `Math.round(pos)`, por eso el siguiente número aparece a mitad de camino mientras el anterior todavía está saliendo. Las fórmulas salen de leer los `transform` en vivo de la referencia:

```
d = i - pos                      // 0 = actual, ±1 = vecinos; |d| ≥ 1 → visibility hidden
caja  (overflow hidden, absolute inset-0):  translateX(d * 100%)
foto  (hijo, absolute inset-0):
      translateX(-d * W / 2)     // se atrasa a media velocidad → parallax
      scale(1 + 1.2·|d|, 1 + 0.2·|d|)   // se estira mientras viaja
      transform-origin: d > 0 ? left center : right center
```

- La caja se mueve 1:1; la foto adentro va a la mitad y se deforma en X: la saliente se "arrastra" y se ensancha, la entrante se asienta desde ese estiramiento. Por eso no se siente un slide plano sino un empuje con parallax.
- `scaleY` casi 1 (+0.2·|d|) a propósito: solo se estira en horizontal.
- Todo se escribe directo en `style` (sin re-render por frame); solo el contador usa `useState`, y solo cuando `Math.round(pos)` cambia.

**Driver por scroll (lo que usa MERIDIAN):**

1. `<section>` alta: `height: calc(100svh + (n-1) * 0.9 * 100svh)` con hijo `sticky top-0 h-svh` (sticky, no `pin`).
2. `ScrollTrigger` (`top top` → `bottom bottom`): `target = progress * (n-1)`.
3. `gsap.ticker`: `cur += (target - cur) * 0.1` (lerp) con early-return cuando `|target-cur| < 0.0005` — no dibujar en reposo.
4. Snap: si el scroll se detiene 160 ms entre slides, `getLenis().scrollTo(y del slide más cercano, { duration: .9 })`. Solo con Lenis activo y solo si `0 < progress < 1` (no atrapar al visitante en los extremos).
5. Flechas: `lenis.scrollTo(y_del_slide)`, con `window.scrollTo({ behavior: 'smooth' })` de fallback.
6. `prefers-reduced-motion`: sin lerp ni snap, `layout(progress * (n-1))` directo.

**Trampas:**

- Al arrastrar/mover `pos` fuera de rango (< 0 o > n-1) los bordes muestran vacío: clampear o no permitir drag (MERIDIAN no usa drag; el scroll ya cubre touch).
- Pasar `scale` como `scale(x, y)` con origin cambiante: fijar `transform-origin` en el mismo write que el `transform`, o salta al cruzar `d = 0`.
- Imágenes: usar `object-cover` en la foto interior; con el estiramiento la foto necesita ≥ 1920px de ancho para no verse blanda.
- Mobile: el contador y las flechas van en una fila bajo la foto (la referencia hace lo mismo).

### P17 — Handoff con parallax (hero sticky → siguiente sección)

Medido en la referencia: el hero es una `<section>` alta con un `hero-inner` `sticky top-0 h-screen`. Cuando termina el tramo sticky (`scrollY = alto_sección - vh`), el stage empieza a subir 1:1 con el scroll, pero **su fondo** (`.hero-background`) baja `0.3 × (scrollY - fin)` (270px a 900px de scroll). El texto queda sin parallax. Resultado: el hero parece "quedarse quieto" mientras la sección siguiente lo empuja desde abajo.

```js
ScrollTrigger.create({
  trigger: track, start: 'bottom bottom', end: 'bottom top',
  onUpdate: (self) => { bg.style.transform = `translate3d(0, ${self.progress * stageH * 0.3}px, 0)` },
})
```

- El fondo debe ir en su propio wrapper (poster + canvas + scrim juntos) para moverlo de una vez.
- El stage lleva `overflow-hidden`: el hueco que deja el fondo al bajar queda fuera de pantalla.
- Todo lo fijo (nav, drawer) vive dentro del stage pero es `position: fixed`; darle al stage `z-30` para que no lo tape la sección siguiente.
- Si el logo vive en el stage, se va con él: el header necesita su propio logo para cuando reaparece más abajo.

### P18 / P19 — Mapa interactivo + cards de distancia (`Location.jsx`)

Sección `.infrastructure` de la referencia, reconstruida. Un solo estado `active` (índice) manda todo:

- **Pin (hover/focus/tap)** → se dibuja su ruta HQ → pin, el pin se rellena de adentro hacia afuera (`clip-path: circle(0% → 75%)` sobre un fill oscuro; el icono cambia de color con delay), el carrusel de cards hace `scrollTo` a esa card y la card revela su foto.
- **Card (hover)** → mismo estado, sin scroll del carrusel.
- **Ruta punteada punto por punto:** la curva HQ → pin (cuadrática con arco) se muestrea por longitud de arco cada ~9 unidades y cada muestra es un `<circle r=0>`. Al activar: `gsap.to(dots, { attr: { r: 1.9 }, opacity: 1, stagger: { amount: 1.5, from: 'start' }, ease: 'back.out(3)' })`; al soltar: `from: 'end'`, `amount: 0.7` — los puntos se deshacen empezando por el último. (Primera versión: `<mask>` con `strokeDashoffset`; Chrome no repinta bien los cambios dentro de un mask y la línea aparecía de golpe. No volver a eso.)
- **Reveal circular de la card:** `.photo { clip-path: circle(0 at calc(100% - 40px) calc(100% - 40px)) }` (centro = botón pin de la esquina) → `circle(150% at …)`, 1s `cubic-bezier(.22,1,.36,1)`. Título y botón cambian a blanco con `transition-delay` para que sigan al círculo. Al soltar el hover el mismo clip-path colapsa hacia adentro y vuelve a mostrar número + texto (que estaban debajo de la foto).
- **Parallax de 3 capas:** mapa, header y cards escrubean con offsets distintos (`y: -60→120`, `80→-80`, `120→-40`) sobre el mismo ScrollTrigger (`top bottom` → `bottom top`), así se deslizan entre sí. El mapa arranca en `top: 0`; el hueco que deja al bajar queda fuera de cuadro y el resto del section tiene el color de la tierra para que no haya corte.
- **Coordenadas:** pines y rutas en unidades del viewBox (1440×832) → `left/top` en %; el padre del mapa fija el aspect-ratio. Los pines van bajo el headline: desplazar el arte (`DY`) antes que mover el texto.
- **Mapa = imagen:** un SVG dibujado a mano se lee como "ola", no como mapa. `public/meridian/map/map.webp` es un raster generado (ruido fbm: mar con degradé, costa irregular, isla, curvas de nivel suaves, fundido a arena arriba y abajo para empalmar con el fondo). Los pines y sus etiquetas (nombre del lugar, 9.5px mono) van encima en `%`.
- **Mobile (sin hover):** `(hover: hover) and (pointer: fine)` decide. En touch el tap activa/desactiva; la card activa crece (76 → 188px de alto) y las demás quedan chicas, su botón pasa a ×, y el mapa hace pan horizontal para centrar el pin activo.
- Carrusel: contenedor `overflow-x: auto` sin scrollbar (touch nativo) + drag con mouse por pointer events, y un cursor "drag" que sigue al mouse.
- Builder: `places` (lista, hasta 12) se mapea por índice a los pines; si hay menos lugares se ocultan los pines sobrantes.

### P20 — Slider por menú de links + hotspots (`Interior.jsx`)

- **Motor:** el de P16 (`d = i - pos`, caja `translateX(d·100%)`, foto `translateX(-d·W/2) scale(1+1.2|d|, 1+0.2|d|)`), pero `pos` no viene del scroll: cada link hace `gsap.to(pos, { v: i, duration: 1.3, ease: 'power3.inOut' })`. El link activo va a opacidad 1; los demás a .45 con subrayado.
- **Hotspots:** botones absolutos en **% de la caja del slide**, hermanos de la foto — nunca hijos de ella, porque la foto se estira durante la transición y arrastraría los "+". Pulso = 2 anillos con `@keyframes` (`scale 1 → 2.1`, `opacity .9 → 0`, desfasados 1.3s).
- **Tooltip:** un solo elemento a nivel de stage anclado a `left/top` del hotspot, con una flecha (cuadrado rotado); si el hotspot está a la derecha (>55%) se invierte. Se cierra al elegir otro link o con un `pointerdown` fuera.
- **Qué NO es editable en el builder:** cuántos hotspots hay por slide y dónde — dependen de la foto. Solo los textos de los links (y la foto de cada slide). La lista de coordenadas vive en `SLIDE_DATA`.
- **Mobile:** el layout cambia por completo — párrafo + lista de links arriba (texto oscuro), slider vertical compacto debajo. Los hotspots siguen igual.
- **Panorama** (`Panorama.jsx`): foto full-width más alta que la sección (`-top-[10%] h-[120%]`) con `yPercent -7 → 7` scrub; título abajo-izquierda (conectores en small caps), CTA con 3 anillos concéntricos que laten.

### P21 — Amenities (`Amenities.jsx`)

- Titular centrado que hace parallax contra el scroll (`y 50 → -50` scrub), sobre una fila de celdas con reglas finas (`border-r` 10%) que se arrastra (mouse: pointer events; touch: nativo) con una barra de progreso de 150px arriba a la derecha (`width = clientWidth/scrollWidth`, `translateX` según `scrollLeft`).
- Cada foto es más alta que su marco (`-top-[8%] h-[116%]`) y hace `yPercent -7 → 7` scrub: el parallax vive dentro del marco.
- **Abrir:** clic en "+" → la foto colapsa hacia el botón (mismo círculo de P19) y aparece el párrafo que estaba detrás; "+" gira 45° a "×" y el botón pasa a fondo tinta. **Hover:** relleno gris que crece desde adentro (`clip-path: circle(0 → 75%)`).
- Mobile = mismo layout, celdas de 82vw.

### P22 — Masterplan (`Masterplan.jsx`)

- **Una sola caja:** `aspect-ratio 16/9` (el de la foto) con la foto, un SVG de contornos (`viewBox` = píxeles de la foto) y los puntos en `%`. Así nada se desalinea con el viewport; en pantallas angostas la caja tiene `min-width: 1000px` y la banda hace scroll horizontal centrada.
- **Punto:** botón de 44px fijo como zona de hover + un hijo visual (`.mer-mp-vis`) con dos anillos que laten (`scale 1 → 2.3`, `opacity .9 → 0`). Al activar, **solo el hijo** se achica a 0: si el propio botón desapareciera, el mouse "saldría" y el estado parpadearía.
- **Contorno:** `<path>` blanco con relleno al 10% que se traza con `strokeDasharray/Offset = getTotalLength()`. **No usar `pathLength="1"`:** GSAP redondea los offsets sub-unitarios y el trazo "salta" de 1 a 0 en vez de dibujarse (medido: a 0.3s seguía en 1.00, a 0.6s ya en 0.00). Con el largo real (≈940) los valores intermedios sí se ven (923 → 801 → 470 → 139 → 0). Mismo criterio aplicado al croquis del preloader.
- **Tooltip:** tarjeta arena anclada al punto, con flecha (cuadrado rotado); si el punto está a la derecha (>60%) se invierte. Contiene ambientes, superficie y el nombre de la unidad en serif grande.
- **Touch:** el tap abre, otro tap (o tocar la foto) cierra. El builder edita solo los textos de cada unidad, no la geometría.

## Receta para un beat nuevo

Si las piezas **siguen un riel** (cubo, letras que se van): no esta lista — [`scrolllab-beat.md`](scrolllab-beat.md) + `<BeatStage>` / `<Beat>`.

Si el beat **parece 3D** (giro de producto, morph cinematográfico): [`scroll-media.md`](scroll-media.md). WebGL interpola cámara/mesh; pear.no / Apple pintan un **fotograma WebP** según el mismo `progress`.

Si es pin / zoom / crossfade GSAP:

1. HTML: pin `h-svh` + capas absolute + chrome fijo aparte.
2. Elegir 1–2 primitivos (no apilar de más).
3. Una timeline `scrub` (o ST `once` si es entrada corta).
4. Handoff de color/overlap con la sección vecina (P13).
5. Reduced motion → `gsap.set` estado final.
6. Probar scroll con Lenis (`getLenis()?.scrollTo`), no solo `window.scrollTo`.

## Anti-patrones

- Tween `x`/`y` en un nodo Beat → receta + `seek`.
- Fade de sección entera → usar P2/P13.
- `img.src` en scrub → P3 capas.
- Animar chrome con la foto → chrome fuera del transform.
- Hard cut de color → P4 / mismo bg.
- SplitText sin `revert` al cambiar props → remount/cleanup.
- UI state en deps de `useGSAP` del pin → resetea la escena.

Detalle narrativo y snippets: vault `Storytelling motion cookbook.md`.
