# Readymag motion — cómo clavar un port (método, no producto)

Referencia viva: https://grids.obys.agency/  
**Producto** (usar esto en secciones nuevas): [`scrolllab-beat.md`](scrolllab-beat.md) · `src/lib/beat/`  
Este archivo es **cómo se aprendió** de una modelo Readymag. No copies el viewer. Extraé recetas y alimentá Beat.

HeroTools sigue importando `./readymag` (reexport del motor). No lo refactorices si el motion ya está clavado.

## Qué no es

El sitio **no** usa GSAP, MotionPathPlugin, anime.js ni Lottie.

| Archivo que alguien puede mandar | Sirve para |
|---|---|
| `viewer.css` | Chrome, `.animation-container`, sticky. **No** tiene paths ni timings. |
| HTML / árbol `article.page` | Layout y clases. Los paths van **inline** y los pinta el JS. |
| `base.js` / `www-widgetapi.js` | Player de YouTube. Ignorar. |
| `viewer.js` (loader ~12 KB) | Solo importa chunks. El motor está en `dist/c/c-*.js`. |

No copiar ni empaquetar el viewer de Readymag en el ZIP que vendemos: es código propietario. Se **porta** el compilador (`seek` / `createOffsetPath`) a `src/lib/beat/engine.js` y se extrae el JSON de cada widget.

## Stack real de la modelo

1. **CSS Motion Path** — `offset-path: path('M … C …')`, `offset-distance`, `offset-rotate: 0deg`.
2. **`transform: rotate() scale(1)`** aparte (no `offset-rotate: auto`). Con path activo, el translate lo hace el offset, no GSAP `x`/`y`.
3. **Viewer Readymag** (chunk típico `c-3UUYSFCD.js` en `st-p.rmcdn1.net/<hash>/dist/c/`):
   - `getNormalizedAnimation` — escala `dx`/`dy`, `calcedDelay`, `calcedDuration`
   - `createOffsetPath` — cúbicas (a menudo degeneradas = recta)
   - `generateFrameByFrameAnimation` — frames `{ ind, isDelay, params }`
   - `seek(scrollPx)` — interpola entre frames
4. **Easing del scroll** (no `power2` de GSAP):
   - `ease-in` → `t * t`
   - `ease-out` → `t * (2 - t)`
   - `none` → lineal
   - arrays de 4 números → `bezier-easing` (este hero no los usa)
5. **On Load** = `@keyframes` en segundos. **On Scroll** = `seek(scrollTop)` en px.

Widgets sticky/fixed: `timeline.seek(scrollTop)` en píxeles de pantalla.

## Cómo se logró (método, no a ojo)

### 1. Identificar el runtime

En la ref: `window.gsap === undefined`, `window.RM` existe, scripts `st-p.rmcdn1.net/.../dist/viewer.js`.  
Buscar en los chunks cargados: `offset-path`, `createOffsetPath`, `applyStepState`, `delay_px`. El que los tenga todos es el motor.

### 2. Extraer la receta, no el CSS

```js
RM.viewerRouter.mag.currentPage.widgets[i].model.attributes
// x, y, w, h, z  (x = centro del widget; y = CSS bottom en mag)
// animation[] → { type: 'scroll' | 'load', steps: [{ dx, dy, rotate, delay_px, speed, acceleration, use_move, use_rotate }] }
```

Canvas mag: **ancho 1024**. Escala `s = viewportWidth / 1024`.  
`dx`/`dy` de cada paso son **absolutos desde el reposo**, no deltas entre pasos.  
`delay_px` del primer paso = espera desde el start; en pasos siguientes = pausa **después** del anterior.

Duración de un paso (px de scroll, ya escalados):

```
hypot(Δdx, Δdy) / speed     // si se mueve
300 / speed                 // si dx/dy no cambian
```

después `Math.ceil`.

### 3. DOM como la modelo

Un wrapper por tipo de animación (load adentro, scroll afuera), clase tipo `.animation-container`:

- caja = tamaño mag del widget (`w×h * s`)
- `left: 50%`, `margin-left: x*s - (w*s)/2`, `bottom: y*s`
- path desde el **centro** de esa caja
- letras: widgets enormes que se solapan, un glifo left-aligned, no letras chicas en una línea

### 4. Reloj de scroll

GSAP ScrollTrigger **solo** pincha el pin. En `onUpdate`:

```js
const px = self.progress * MAG_SCROLL * s
players.forEach((p) => p.seek(px))
```

`scrub: true` (sin lag tipo `0.4`). No `gsap.to(el, { x, y, rotation })` sobre el mismo nodo que tiene `offset-path`.

### 5. Código reutilizable

El motor vive en **Beat**. Un template nuevo no copia `readymag.js` a su carpeta.

| Pieza | Archivo |
|---|---|
| Widgets | `src/lib/beat/widgets.jsx` (`BeatStage`, `Beat`) |
| API + hook | `src/lib/beat/` (`useBeatStage`, presets, engine) |
| Spec | [`scrolllab-beat.md`](scrolllab-beat.md) |
| Polyfill `offset-path` | `src/lib/beat/motionPath.js` |
| Hero que ya lo usa (no tocar) | `src/components/sections/ratio/HeroTools.jsx` |

Para un SKU nuevo: `<BeatStage>` + `<Beat>` y recetas extraídas. No reinventar tweens.

## Anti-patrones (ya los pagamos)

- Tween GSAP `x`/`y`/`rotation`/`autoAlpha` “parecido”
- `power2.in` / `power2.out` en vez del easing cuadrático de `seek`
- Un solo `animation-container` para load + scroll
- Letras en baseline con `font-bold` y cajas del tamaño del glifo
- `delay_px` de un paso tardío tratado como tiempo absoluto de página
- Fade de salida: en la ref la opacidad del tipo hero es 1; se van por el path
- Meter `viewer.js` en el ZIP del comprador

## Checklist en un template nuevo

1. `analyze:ref` como siempre.
2. Consola: ¿`window.RM`? ¿scripts `rmcdn`? Si sí → este doc, no solo P1–P14.
3. Dump `widgets[].animation` + `x,y,w,h`.
4. Confirmar mag width (casi siempre 1024) y page height.
5. Portar con Beat (`useBeatStage` o `attachScroll` + `playLoadPath`); verificar un beat contra DevTools: `offset-path` y `offset-distance` tienen que coincidir en magnitud con la ref al mismo `scrollY`.
6. Mundo / copy propios (no branding de la ref). Crazy mode u overlay aparte.
