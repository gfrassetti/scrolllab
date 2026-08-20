# SCROLLLAB Beat

Nuestra plusvalía, junto con el builder: **widgets de motion propios**. No es Readymag. Readymag fue la modelo (lienzo 1024, widget + `animation[]`, `seek` al scroll). El producto se llama **Beat**.

Texto simple: un **Beat** es una pieza en el escenario (cubo, letra, placa). Cada una tiene reposo (`mag`) y un **riel** (`recipe`). El escenario (`BeatStage`) pincha la pantalla y el scroll **busca el fotograma** (`seek`). GSAP no mueve x/y.

| Capa | Qué es | Dónde |
|---|---|---|
| Widget | `<BeatStage>` + `<Beat>` | `src/lib/beat/widgets.jsx` |
| Receta | lista de pasos (a dónde ir) | `presets.js` o al lado del JSX |
| Motor | riel CSS `offset-path` + seek | `src/lib/beat/engine.js` |
| Reloj | el scroll | GSAP pin; **no** mueve x/y |

Cómo se portó una ref Readymag (solo para clonar sitios así): [`readymag-motion.md`](readymag-motion.md).

## Palabras en criollo

| Si leés | Quiere decir |
|---|---|
| Widget | una pieza: cubo, letra, palabra — `<Beat>` |
| `mag` | reposo en el lienzo 1024 (`x y w h z`). El cubo **no** persigue las letras |
| Receta / steps | “Desde este `mag`, andá a estos puntos mientras baja la página” |
| `dx` / `dy` | cuánto se corre en X e Y **desde el mag**, no desde el vecino |
| Riel (`offset-path`) | la línea que sigue la pieza; no es “deslizala 20 px” |
| Seek | como arrastrar la barra de un video: el scroll elige el fotograma |
| Ease | si arranca rápido y frena, o al revés. El nuestro no es el de GSAP |

## Cómo se usa en un JSX (widgets)

Esto es nuestro Readymag: escenario + piezas. Cada `<Beat>` es un widget.

```jsx
import { BeatStage, Beat, BEAT_PRESETS } from '../../../lib/beat'

export default function MiSeccion() {
  return (
    <section className="relative bg-[#f3f1eb]">
      <BeatStage className="relative h-svh overflow-visible">
        <Beat
          id="cube"
          mag={{ x: -385, y: 20, w: 191, h: 191, z: 200 }}
          recipe={BEAT_PRESETS['tumble-cube']}
          className="bg-[#111]"
        />
        <Beat
          id="word"
          mag={{ x: 1328, y: -101, w: 797, h: 433, z: 420 }}
          recipe={BEAT_PRESETS['slide-across']}
        >
          ARE
        </Beat>
      </BeatStage>
    </section>
  )
}
```

`mag` es el reposo en el lienzo **1024**. `recipe.scroll` es el riel: `dx`/`dy` **absolutos desde ese reposo**. Si compactás `mag` y dejás los `dx` de otra escena, el cubo salta a la nada.

Hook equivalente (markup a mano): `useBeatStage` + `data-beat`. HeroTools (RATIO) sigue por ese camino; no lo reescribas si el motion ya está clavado.

Tres formas de marcar una pieza si no usás `<Beat>` (la receta se busca por **id**):

| Markup | Ejemplo | Cuándo |
|---|---|---|
| `data-beat="<id>"` | `<div data-beat="cube" />` | Markup a mano (o lo que pinta `<Beat>`) |
| `id="<id>"` | `<div id="cube" />` | Si el nodo ya tiene ese id. |
| `class="beat-<id>"` | `<div className="beat-cube" />` | Si preferís class. La class de estilo (`text-white`, etc.) no anima sola. |

Reglas:

- El escenario (pantalla que se clava al scrollear) lleva `data-beat-stage`.
- El id del markup tiene que existir en `recipes`.
- Si hay hop al cargar, el nodo interno puede ser `data-beat-load` (si no, se usa el mismo nodo).
- No animes la misma pieza con `gsap.to({ x, y })` y Beat a la vez.
- Una class suelta (`hop`, `animate-bounce`) **no** dispara Beat. Hace falta el marcador + la receta.

Referencia que ya está en producción (recetas a mano, mismo motor): `src/components/sections/ratio/HeroTools.jsx`. Las secciones **nuevas** entran por `<BeatStage>` + `<Beat>`. No reescribir HeroTools “para unificar” si el motion ya está clavado.

## Receta (el JSON)

Cada paso es un destino **desde el reposo**, no “sumale 10 al anterior”:

```js
{ delay_px: 1174, dx: 70, dy: -241, rot: 90, acc: 'ease-out', speed: 1 }
```

- `delay_px` — esperar estos px de scroll (en el primer paso: desde el inicio; después: pausa).
- `speed` — 1 = un px de riel por un px de scroll; 0.5 = hace falta más scroll.
- `acc` — `none` | `ease-in` | `ease-out` (cuadrático del motor, no `power2` de GSAP).

Lienzo: ancho **1024**. En pantalla se multiplica por `viewport / 1024`.

Presets reutilizables: `BEAT_PRESETS` en `src/lib/beat/presets.js`. Coreografía de una sola escena: objeto local al lado del JSX.

**RATIO hero (guardar para otro template):** `RATIO_HERO_BEAT` en el mismo archivo. Cubo `tumble-cube` + losa que crece en `width` (no `scaleX`) hacia PLATE y SCALE, tope a 24px de la palabra. Ref clavada: `HeroTools.jsx`.

## ¿Hay que “compilar” un bundle aparte?

No. No hay plugin de webpack ni un `.beat` que se compile a JS.

1. Escribís JSX + receta.
2. En el browser el motor **arma el riel y los fotogramas** (`attachScroll` / `playLoadPath`).
3. Al empaquetar el ZIP, `server/packaging.js` copia `src/lib/beat/*` en **SHARED** (todo template y toda composición del builder). El comprador se lleva **nuestro** JS, no el viewer de Readymag.

El “bundle” es el ZIP: React + Vite + `lib/beat` + la sección. `npm install && npm run dev` como siempre.

Más adelante se puede publicar `@scrolllab/beat` en npm; hoy vive en el repo y viaja en el ZIP.

## Builder

El builder **ya vende Beat**: arrastrás `ratio/HeroTools` (badge Beat) a la composición. El preview corre el riel. El ZIP lleva `src/lib/beat`.

El panel edita **copy** (`word1`, etc.). **No** hay un campo de recetas JSON en v1.

1. **Ahora** — `beat: true` en el registry, badge en la paleta, hint en el editor. RATIO está en venta; modelos en obra siguen en `BUILDER_HIDDEN_SKUS` + `COMING_SOON_SKUS`.
2. **Después** — un tipo de campo `beat` en `SECTION_FIELDS`.
3. **No** en v1 — arrays complejos en el editor.

Precio: RATIO lista USD 269. La base del builder (USD 279) tiene que quedar arriba de ese techo.

No pongas Beat en el chrome del marketplace (nav, carrito): eso es Emil / Impeccable.

## Cómo agregar un Beat a una sección nueva

1. Inventar el mundo; elegir la escena firma.
2. `<BeatStage>` + un `<Beat>` por pieza, cada uno con `mag` propio y receta propia (no copiar el cubo de RATIO).
3. ¿El riel se reusa? → `BEAT_PRESETS`. ¿Es de esta escena? → receta local.
4. Probar ida y vuelta y `prefers-reduced-motion`.
5. `beat: true` en el registry. El motor **no** viaja en el ZIP vendido (solo marketplace).

## Qué no hacer

- Copiar `viewer.js` de Readymag al ZIP.
- Inventar tweens `x/y` “parecidos” si el beat es de riel.
- Esperar que una class CSS de Tailwind anime el riel.
- Meter el motor otra vez adentro de `sections/<sku>/` — vive en `src/lib/beat/`.
- Refactorizar un hero que ya está clavado solo para cambiar el import.
- **Empaquetar** `src/lib/beat/*` al comprador — es plusvalía del builder/demo; ver `server/packaging.js`.

## Archivos

| Archivo | Rol |
|---|---|
| `docs/scrolllab-beat.md` | este spec (producto) |
| `src/lib/beat/index.js` | API pública |
| `src/lib/beat/widgets.jsx` | `<BeatStage>` + `<Beat>` (nuestros widgets) |
| `src/lib/beat/useBeatStage.js` | reloj + bind receta ↔ nodo |
| `src/lib/beat/engine.js` | seek + riel |
| `src/lib/beat/motionPath.js` | polyfill `offset-path` |
| `src/lib/beat/presets.js` | biblioteca de recetas |
| `src/lib/beat/layout.js` | pack de letras + `dx` desde reposo (palabras editables) |
| `server/packaging.js` → `SHARED` | **no** incluye `lib/beat` en ZIPs vendidos |
| `src/components/sections/ratio/HeroTools.jsx` | primer consumidor (referencia; no unificar) |
| `src/components/sections/ratio/readymag.js` | reexport (compat. HeroTools) |
