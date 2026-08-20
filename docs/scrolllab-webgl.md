# SCROLLLAB WebGL (mini motor)

Capa liviana para **card hero / tableau / emblem** cuando CSS + una JPG no alcanzan. No reemplaza **Beat** (`docs/scrolllab-beat.md`).

| | Beat | WebGL mini motor | Secuencia WebP |
|---|---|---|---|
| Qué mueve | Piezas DOM en riel `offset-path` | Cámara + meshes Three.js | Índice de fotograma en canvas 2D |
| Scroll | `seek` en receta | `progress` leído en GSAP / ScrollTrigger | El mismo `progress` → `frameIndex` |
| ZIP vendido | **No** incluye `src/lib/beat/` | **Sí** incluye `src/lib/webgl/` si la sección importa | Los `.webp` locales de la sección |

Comparación larga y receta de frames: [`docs/scroll-media.md`](scroll-media.md).

## Instalación

**Ya está en el repo.** No hay paquete aparte.

```bash
npm install   # trae three@^0.185 desde package.json raíz
```

El comprador del ZIP recibe `three` solo si su template **importa** Three (el `package.json` del ZIP se genera desde los imports del código).

Dependencia runtime:

```json
"three": "^0.185.1"
```

Loaders opcionales (GLB):

```js
import('three/examples/jsm/loaders/GLTFLoader.js')
```

Patrón usado en `monolith/HeroThree.jsx`, `fizz/HeroBubbles.jsx`, `atelier/*`.

## Patrón KPR — `#canvas-container` (obligatorio)

kprverse.com monta un **canvas Three.js fijo** (`#canvas-container`) y renderiza el retrato ahí. El DOM (tipografía Beat, HUD, nav) flota encima con `pointer-events: none`. El movimiento al pointer es **óbita de cámara** (`damp` λ=3), no `matrix3d` en una `<img>`.

```
TemplatePage
├── #canvas-container (fixed, z-15, pointer-events: auto)  ← Three.js
│   └── <canvas data-engine="three.js">
├── Nav* (z-50)
├── <main pointer-events-none>                               ← DOM overlay
│   └── Hero* (copy, marco, grid — sin img hero si va en canvas)
└── Boot* (z-80, opcional)
```

| Capa | Qué renderiza |
|---|---|
| Canvas | Plano con `hero-face.jpg` **o** GLB (tableau). Cámara esférica + damp. |
| DOM | Palabras, copy, marco carpeta, grid. Transparente donde se ve el canvas. |

**Nuxt:** framework Vue de sitios como kprverse.com. SCROLLLAB = React/Vite; la receta Three.js es la misma.

Implementación de referencia en catálogo: `monolith/HeroThree.jsx`, `fizz/HeroBubbles.jsx`.

## Cuándo usar qué

| Efecto | Herramienta |
|---|---|
| Palabras / cubo en riel al scroll | **Beat** |
| Card hero / tableau / emblem | **WebGL** — `#canvas-container` fijo + Three.js |
| Retrato hero KPR-like | **Plano texturizado** en canvas (JPG/GLB), **no** `<img>` DOM |
| Tilt obvio de `<img>` | **Prohibido** en hero — usar órbita de cámara en canvas |
| UI chrome, nav, boot | GSAP + DOM (Emil / Impeccable) |

## API (`src/lib/webgl/`)

### `createWebGLStage({ canvas, mount, fov, clearColor, … })`

Crea `renderer`, `scene`, `PerspectiveCamera`, `ResizeObserver`, loop rAF.

```js
import { createWebGLStage } from '../../../lib/webgl'

const stage = createWebGLStage({
  canvas,
  mount: rootEl,
  fov: 28,
  clearColor: 0x0a0810,
  cameraZ: 2,
})

// … scene.add(mesh)

stage.start((dt) => {
  orbit.update(dt)
})

// cleanup
stage.dispose()
orbit.dispose()
```

### `attachPointerOrbit({ camera, distance, maxDeg, lambda })`

Receta KPR: coords esféricas + `damp(λ=3)` al pointer. **Mueve la cámara**, no `rotateY` en CSS.

### `createCoverPlane(texture)` + `fitCoverPlane({ mesh, camera, distance, texture })`

Plano con foto mientras no haya GLB propio (hero WebGL v1).

### `damp(current, target, lambda, dt)`

Misma curva que `Three.MathUtils.damp`.

## Uso en una sección React

Referencia mínima: ver ejemplo en este doc y `monolith/HeroThree.jsx`.

```jsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import {
  attachPointerOrbit,
  createCoverPlane,
  createWebGLStage,
  fitCoverPlane,
} from '../../../lib/webgl'
import portrait from './assets/hero-face.jpg'

export default function HeroCanvas({ img = portrait }) {
  const wrap = useRef(null)

  useEffect(() => {
    const mount = wrap.current
    const canvas = mount?.querySelector('canvas')
    if (!mount || !canvas) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const stage = createWebGLStage({ canvas, mount, fov: 28, clearColor: 0x0a0810 })
    const tex = new THREE.TextureLoader().load(img, () => {
      stage.resize()
      fitCoverPlane({ mesh, camera: stage.camera, distance: 2, texture: tex })
    })
    const mesh = createCoverPlane(tex)
    stage.scene.add(mesh)

    const orbit = attachPointerOrbit({ camera: stage.camera, distance: 2, maxDeg: 10, lambda: 3 })
    stage.start((dt) => orbit.update(dt))

    return () => {
      orbit.dispose()
      tex.dispose()
      mesh.geometry.dispose()
      mesh.material.dispose()
      stage.dispose()
    }
  }, [img])

  return (
    <div ref={wrap} className="absolute inset-0">
      <canvas className="block h-full w-full" />
    </div>
  )
}
```

En el hero pinneado (`HeroOperators`): reemplazar el `<img>` del shot por `<HeroCanvas img={img} />` y **no** duplicar tilt CSS sobre la misma foto.

### Scroll + WebGL

KPR mapea `progress = map(scroll, start, end, 0, 1)` y la escena 3D lee ese número. En SCROLLLAB:

- **Pin/scrub** → GSAP ScrollTrigger (cookbook P1).
- Dentro de `onUpdate` o `tl` → `uniforms.uProgress.value = self.progress` o tweens a `card.rotation.y`.

El canvas puede vivir **dentro** del pin DOM; no hace falta un canvas fullscreen fijo como KPR.

### Reduced motion

Si `prefers-reduced-motion: reduce`: `<img>` estático o un solo frame renderizado. Ver `useReducedMotion` en `src/hooks/useReducedMotion.js`.

## Assets (hero WebGL / KPR-like)

| Asset | Rol | Cómo se produce |
|---|---|---|
| **GLB** | Card / tableau con grosor | Blender, o **Meshy MCP** (`MESHY_API_KEY` + `.cursor/mcp.json`) |
| **WebP / KTX2** | Texturas comprimidas | Export arte; KTX opcional en v2 |
| **WebM + MP4** | Topo, scans, OBJECT-FX | Blender/C4D → ffmpeg VP9 + HEVC |
| **Spritesheet JSON** | Beams, kai, manos | TexturePacker / pipeline DCC |
| **SVG** | Máscaras stencil (`masks.svg`) | Diseño UI, no el retrato |

Meshy genera **mesh**, no el paquete completo KPR. Videos y atlases siguen siendo pipeline de arte.

## Packaging (ZIP)

Archivos compartidos en `server/packaging.js` → `SHARED`:

- `src/lib/webgl/index.js`
- `src/lib/webgl/stage.js`
- `src/lib/webgl/orbit.js`
- `src/lib/webgl/damp.js`
- `src/lib/webgl/coverPlane.js`
- `src/lib/webgl/gltf.js`

Van en el ZIP del comprador (a diferencia de Beat). `three` entra al `package.json` generado solo si el código importa `three` o `three/examples/…`.

## Meshy → hero (sin Blender)

1. **Image to 3D** con la foto del hero.
2. Export **GLB** → `src/components/sections/<sku>/assets/hero-card.glb`.
3. El componente intenta cargarlo; si no existe o falla, usa el plano JPG.

MCP en Cursor: server `project-0-scrolllab-meshy`. Si el panel muestra error, revisar `MESHY_API_KEY` (`msy_…`) y reiniciar el MCP — el export manual al path de arriba funciona igual.

**Blender no es obligatorio** para este paso.

## Próximo nivel (tableau)

1. Mesh/GLB en `sections/<sku>/assets/`.
2. `GLTFLoader` + materiales custom (displacement / `mapOffset` al hover).
3. Capas second-layer: secuencias WebP o `<video>` transparente.
4. Mobile fallback: imagen estática o video único (KPR: `hasMobileFallback`).

## Ver también

- [`docs/reference-analysis/kpr-engine.md`](reference-analysis/kpr-engine.md) — qué extraímos de kprverse.com
- [`docs/motion-cookbook.md`](motion-cookbook.md) — pin, scrub, overlap
- [`docs/scrolllab-beat.md`](scrolllab-beat.md) — riel DOM, no WebGL
