# KPR engine — qué usa de verdad (VANTA)

Fuente: chunks de kprverse.com (`LoaderMixin`, `globals`, `simple-three`, `camera`, `three-object`, `custom-material`, `preloader`, `the-console-loading`).  
No se copian los scripts. Se extraen recetas. IP propia en VANTA.

## No es Beat. No hay físicas

| Qué parece | Qué es |
|---|---|
| “Motor propio / Beat” | **GSAP 3** (`gsap`, `ScrollTrigger`, `ScrollSmoother`) inyectado en Vue/Nuxt |
| “Físicas” | **No hay** Cannon, Rapier ni Matter. Es `MathUtils.damp` (exponencial) + coords esféricas |
| Three.js | Sí: cámara, GLTF/KTX, shaders, **no** el loader ni el HUD |
| 600 JS | Code-split de Nuxt: un chunk por botón, frame, wallet |

`globals.b114dd32.js` exporta `{ gsap, ScrollTrigger, ScrollSmoother }`. Todo el motion de UI pasa por ahí.

## Capas (cómo está conectado)

```
Nuxt UI (preloader, nav, botones)
        │  autoAlpha / scaleX / SplitText / drawSVG
        ▼
GSAP ScrollSmoother  →  scrollTop()  →  lerp hacia scrollTg
        │
        ▼
ScrollTrigger por escena  (pinSpacing: FALSE por default)
        │
        ▼
Three.js canvas fijo (.gl)  ←  cámara spherical + damp(lambda=3)
        │
LoaderMixin  →  carga GLTF/KTX/img  →  emite LOAD_PROGRESS
```

El canvas 3D es una capa **fija** aparte del DOM. El scroll no “pincha” el GLTF: mapea `progress = map(scroll, start, end, 0, 1)` y la escena 3D lee ese número.

## Loader (preloader + LoaderMixin)

`LoaderMixin` **no anima**. Agrega loaders (gltf, ktx, jpg) y emite progreso global.

El Vue `preloader`:

- Barra: `transform: scaleX(app.loadProgress)`
- Filenames ciclan con `setTimeout` random 150–400ms
- CTA de sonido sigue al mouse con lerp `ease: 0.4`
- Salida: `(new gsap.timeline).to(root, { autoAlpha: 0 })`

**No hay zoom a una letra. No hay segunda foto.** El homepage ya está debajo; el overlay se apaga.

`the-console-loading`: `gsap.to(proxy, { percent: 1, duration: 0.6, ease: "none" })` + `scaleX(percent)`.

## Cámara 3D (camera + custom-material `Gt`)

```
theta = damp(theta, map(pointerX, 0, vw, +max, -max), 3, dt)
phi   = damp(phi,   map(pointerY, 0, vh, +max, -max), 3, dt)
position = spherical(dist, phi + π/2, theta) + lookAt
```

- FOV 24–32, `damp` lambda **3**, órbita `0.06π` ≈ 11° (o `maxRotation: 10`)
- `damp` = `current + (target - current) * (1 - exp(-lambda * dt))` (Three.MathUtils)
- **No es** `gsap.set` al pixel del mouse

## ScrollTrigger de escena (`Ut` en custom-material)

```
start: "top bottom"
end:   "bottom top"
pinSpacing: false    // ← no infla 2000px de papel vacío
progress = map(scroll, start, end, 0, 1)
```

Si pincheamos en VANTA con `end: "+=170%"` y `pinSpacing: true` (default GSAP), aparece el hueco crema. KPR no hace eso.

## Qué integramos en VANTA (no pegar el bundle)

| Receta KPR | VANTA |
|---|---|
| Loader `autoAlpha: 0` + `scaleX(%)` | `BootVanta` |
| Cámara `damp` al pointer | `HeroOperators` tilt |
| `pinSpacing: false` / no spacer muerto | Citadel / Keeper / World |
| Console `scaleX` 0.6s ease none | `VantaConsole` en Citadel |
| SplitText + scramble | `NavVanta` (ya) |
| Hold overlay | `useHoldScan` (ya) |
| Three GLTF tableau | **no** en v1 del hero (no tenemos su GLTF). Foto + damp 3D |

## GLTF / GLB

Es un **archivo 3D** (geometría + materiales + texturas), como un `.mp4` pero de un objeto. KPR carga operadores/keep desde `/gltf/compressed/etc1s/*.glb` con `GLTFLoader` + KTX2.

VANTA no copia esos modelos (IP de ellos). Para un GLB propio: Meshy MCP (`MESHY_API_KEY` en `.cursor/mcp.json`, hoy no está levantado en esta sesión) o un `.glb` en `sections/vanta/assets/`.

Hasta tener un GLB, el hero usa un **plano con la foto** y la **misma cámara** (`damp` + esférica).

## ScrollSmoother vs Lenis

`ScrollSmoother` es plugin **GSAP Club** (no está en el `gsap` de npm). El repo ya usa **Lenis** + `ScrollTrigger.update` — es el equivalente público. No lo cambiamos.


- Segunda `<img>` del retrato encima del hero (doble cara)
- `clip-path` “entrar en la A” inventado (la ref no lo hace en el preloader)
- Pin `+=170%` + `pinSpacing` default sobre `bg-[#f4f1ea]` (bloque blanco)
