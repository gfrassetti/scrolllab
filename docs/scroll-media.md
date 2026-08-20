# Scroll + “3D”: WebGL vs secuencia de imágenes

Dos familias de sites que **se ven 3D al scrollear** usan el **mismo truco de tiempo**, no la misma tecnología.

El scroll no “anima para atrás” milagrosamente. Convierte la posición del usuario en un número `progress` entre `0` y `1`. Ese número es el **playhead**. Scrollear hacia abajo avanza; hacia arriba **rebobina** porque `progress` baja.

En SCROLLLAB ese playhead casi siempre sale de **GSAP ScrollTrigger** con `scrub` + `pin` (primitivo **P1**). Lenis solo suaviza el scroll; el motor de escena lee `progress`.

```
scrollY  →  progress 0…1  →  “tiempo” de la escena
   ↑ atrás                    ↓ adelante
```

| Familia | Qué hay en pantalla | Cómo se mueve con el scroll | Referencia típica |
|---|---|---|---|
| **A. Tiempo real 3D** | Un canvas WebGL (Three.js) + meshes / cámara / shaders | Cada frame interpolás cámara, rotación, morph, etc. según `progress` | kprverse, MONOLITH, FIZZ (`docs/scrolllab-webgl.md`) |
| **B. Película en fotogramas** | Un canvas **2D** (o a veces un `<img>`) + **cientos de WebP** | `progress` elige el **índice de frame** y lo pintás | [pear.no](https://pear.no/), product pages de Apple |

No confundir con **Beat** (`docs/scrolllab-beat.md`): Beat mueve **DOM** en un riel. WebGL mueve meshes. La secuencia mueve un **fotograma pre-renderizado**.

---

## 1. WebGL / Three.js — escena viva

### Idea

El GPU dibuja el objeto **ahora**. No hay “clip” grabado. Si scrolleás, el JS **no rebobina un video**: vuelve a calcular pose + cámara y renderiza de nuevo.

Patrón kprverse-like: canvas fijo + DOM encima (`pointer-events-none`). El retrato no es un `<img>` hero.

### Cómo el scroll mueve “para adelante y atrás”

1. Sección alta (`min-h-[300svh]` o `end: '+=300%'`).
2. `ScrollTrigger` pincha el canvas (o un wrapper).
3. `scrub: true` (o `scrub: 0.5`) liga el tween al scroll.
4. En `onUpdate` / `onUpdate` del tween:

```js
// progress 0 → 1 es el playhead
mesh.rotation.y = progress * Math.PI * 2
camera.position.z = gsap.utils.interpolate(2.4, 1.1, progress)
```

Si el usuario scrollea **arriba**, `progress` baja y esas mismas propiedades **vuelven** al valor anterior. No hay cola de animación que “deshacer”: el estado es una función de `progress`.

Otras entradas (pointer, Lenis) se **mezclan** con damp, no reemplazan el playhead:

```js
stage.start((dt) => {
  orbit.update(dt)          // look-at suave al mouse
  // la rotación de “capítulo” la manda ScrollTrigger, no el rAF
})
```

### Pros / contras

- **Pros:** iluminación real, orbit, GLB, interacción, un solo asset 3D.
- **Contras:** más JS, GPU, arte 3D (Meshy / Blender), hay que cuidar DPR y `prefers-reduced-motion`.
- **En el repo:** `src/lib/webgl/`, `docs/scrolllab-webgl.md`, secciones `monolith/*`, `fizz/*`, `atelier/*`.

### Anti-patrón

Tween GSAP de `rotation` **sin** `scrub` (play-once). Eso no rebobina con el scroll.

---

## 2. Secuencia de imágenes (estilo pear.no / Apple)

### Idea

Un artista o un DCC (Blender, Cinema, After Effects) **renderiza** un giro / morph a un video o a N fotogramas. El browser **no calcula 3D**: solo muestra el fotograma `N`.

Se ve “como 3D” porque los frames **ya son** renders 3D. Es cine, no simulación.

Sites como [pear.no](https://pear.no/) (y las landings de producto de Apple) usan esta familia: **muchas imágenes** (hoy casi siempre **WebP**), mapeadas al scroll. El canvas 2D es el player; el DOM (tipo, UI) va encima.

### Pipeline de arte

```
Blender / AE / captura  →  video o PNG sequence
                         →  FFmpeg / cwebp  →  frame-0001.webp … frame-0180.webp
```

Cantidad típica: **120–240 frames** por beat (más = más suave y más peso). WebP gana a JPEG en peso a misma calidad; alpha si el objeto flota sobre el fondo de la web.

Ejemplo de extracción:

```bash
ffmpeg -i turntable.mp4 -vf "fps=24,scale=1280:-1" frames/frame-%04d.png
# luego cwebp -q 70 frame-0001.png -o frame-0001.webp
```

### Cómo el scroll elige el frame

Misma `progress` que en WebGL:

```js
const frameIndex = Math.round(progress * (frames.length - 1))
ctx.clearRect(0, 0, canvas.width, canvas.height)
ctx.drawImage(frames[frameIndex], 0, 0, canvas.width, canvas.height)
```

GSAP equivalente (P1):

```js
const proxy = { n: 0 }
gsap.to(proxy, {
  n: frameCount - 1,
  ease: 'none',
  scrollTrigger: { trigger, pin: true, scrub: true, end: '+=280%' },
  onUpdate: () => drawFrame(Math.round(proxy.n)),
})
```

Scrollear atrás **baja `n`**. El “rewind” es cambiar de archivo, no interpolar geometría.

### Por qué canvas 2D y no `<img src>` ni `<video>`

| Medio | Problema en scrub |
|---|---|
| Cambiar `img.src` cada frame | Decode + layout; stutter; no cacheás el bitmap |
| `<video currentTime = progress * duration>` | Seek asíncrono, keyframes, Safari; no es frame-exacto |
| **Canvas 2D + `drawImage`** | Un bitmap ya decodificado; el índice es síncrono |

Por eso el método “se ve bien”: el arte ya está pre-luz / pre-material; el browser solo **blits**.

### Performance (obligatorio si un template lo usa)

1. Precargar con `Image` / `createImageBitmap`; no disparar 200 requests en el primer paint.
2. `IntersectionObserver` (margen ~800px) para arrancar el decode cerca del beat.
3. No redibujar si `frameIndex` no cambió.
4. Capar `devicePixelRatio` (~1.5); un 3× no se nota en footage en movimiento.
5. `fetchPriority = 'high'` solo en el primer frame del hero; el resto `low`.
6. Reduced motion: mostrar un frame estático (p. ej. el 0 o el del medio), no scrub de 200 files.

### Pros / contras

- **Pros:** look cinematográfico, control total de look, GPU liviana (2D blit), rewind perfecto.
- **Contras:** **peso** (varios MB), no hay orbit real al mouse (salvo otra secuencia), no hay un GLB editable en el ZIP, packaging tiene que **incluir todos los frames**.

### En SCROLLLAB

Todavía no hay un helper tipo `src/lib/webgl/` para secuencias. Si un SKU lo pide:

1. Assets locales en `src/components/sections/<sku>/assets/seq/` (regla de imágenes: no picsum).
2. Pin + scrub (P1) + canvas 2D.
3. El packaging ya hace walk recursivo: los WebP viajan en el ZIP.

---

## 3. Cómo elegir

| Pregunta | Usá |
|---|---|
| ¿El objeto tiene que **orbitar con el mouse** y ser un GLB? | **A — WebGL** |
| ¿El look es un **turntable / morph** ya renderizado y tiene que clavar el frame? | **B — secuencia WebP** |
| ¿Son letras / cubo en un path? | **Beat**, no esto |
| ¿Una foto que hace zoom? | **P2**, no 200 frames |

Regla de producto: si el promedio del marketplace resuelve con CSS, nosotros no bajamos el listón — pero **secuencia ≠ WebGL**. Elegí la API que el beat pide.

---

## 4. Mapa rápido en este repo

| Qué | Dónde |
|---|---|
| Pin + scrub (playhead) | `docs/motion-cookbook.md` P1 · `src/lib/gsap.js` |
| Canvas Three.js | `docs/scrolllab-webgl.md` · `src/lib/webgl/` |
| DOM en riel | `docs/scrolllab-beat.md` |
| Receta de arte fotográfico | `.cursor/skills/template-image-designer/` |
