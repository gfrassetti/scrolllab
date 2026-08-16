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

### Beat (producto SCROLLLAB — no es P15)

Motor propio: widgets `<BeatStage>` + `<Beat>` (riel CSS `offset-path` + `seek`). Spec: [`docs/scrolllab-beat.md`](scrolllab-beat.md). Código: `src/lib/beat/`. Secciones nuevas: esos componentes. GSAP solo pincha.

Si la URL de referencia es un proyecto Readymag, **no** interpolar con tweens GSAP `x/y`. Extraer recetas y alimentar Beat. Método de port: [`docs/readymag-motion.md`](readymag-motion.md). HeroTools (RATIO) es el primer consumidor; no reescribirlo si ya está clavado.


## Receta para un beat nuevo

Si las piezas **siguen un riel** (cubo, letras que se van): no esta lista — [`scrolllab-beat.md`](scrolllab-beat.md) + `<BeatStage>` / `<Beat>`.

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
