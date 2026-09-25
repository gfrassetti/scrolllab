---
tags:
  - scrolllab
  - reference-analysis
  - pear
  - engine
source: https://pear.no/
analyzed: 2026-09-09
method: source-code + network scan (no guessing)
---

# pear.no — la esencia del motor (ingeniería inversa real)

> Método pedido por el dueño: **no alcanza con mirar capturas**. Para cada
> template que replicamos hay que escanear la página modelo, detectar qué
> tecnologías usa y **cómo** las usa: el HTML, el canvas, y qué pide la red en
> cada tick de scroll.

## 1. Qué es, en una línea

Un **único `<canvas>`** donde ocurre absolutamente todo, alimentado por una
**secuencia de imágenes `.webp`** que se piden a medida que scrolleás. Cada
tick de scroll = un frame nuevo. No hay cortes de escena porque **no son
escenas distintas**: es una sola cámara viajando por un mismo mundo pintado
(estilo "arte de zoom infinito").

## 2. El patrón de URL de los frames (extraído del bundle)

De `/assets/index-BhJdAf8K.js`, textual:

```js
let r = [{ name: 'v51', count: 121 }, { name: 'renaissance', count: 362 }]
let i = { N: r.reduce((a, b) => a + b.count, 0), frames: [], loaded: 0 }
mt.push({ name: 'reel', seq: i, get count() { return i.N } })

let s = e => {
  for (let n of r) {
    if (e < n.count)
      return `/films/model/${n.name}/${t}/f_${String(e + 1).padStart(3, '0')}.webp?r=13`
    e -= n.count
  }
  return ''
}
```

**Forma de la URL:**

```
/films/model/<secuencia>/<tier>/f_<NNN>.webp?r=<cacheBust>
```

- `<NNN>` → 1-based, padding a **3 dígitos** (`f_001` … `f_362`)
- `<tier>` → **768** o **1440** (ver punto 3)
- `?r=13` → cache-bust global de la release

Verificado en vivo (todos `200 image/webp`):

| URL | Peso |
|---|---|
| `/films/model/v51/1440/f_001.webp?r=13` | 59 KB |
| `/films/model/v51/1440/f_121.webp?r=13` | 67 KB |
| `/films/model/renaissance/1440/f_001.webp?r=13` | 73 KB |
| `/films/model/renaissance/1440/f_362.webp?r=13` | 46 KB |
| `/films/model/renaissance/768/f_001.webp?r=13` | 23 KB |

## 3. Manifest por secuencia (tiers responsive)

Cada secuencia publica su propio manifest, que solo declara **cuántos frames
tiene por tier de resolución**:

```
GET /films/model/v51/manifest.json?r=13
→ {"tiers":{"768":{"count":121},"1440":{"count":121}}}

GET /films/model/renaissance/manifest.json?r=13
→ {"tiers":{"768":{"count":362},"1440":{"count":362}}}
```

El cliente elige el tier según el viewport y **recién ahí** sabe el `count`
real; el código hace `fetch(manifest).then(n => e.count = n.tiers[tier].count)`
antes de armar el carrete. Es decir: **el conteo de frames no está hardcodeado
en el bundle**, viene del manifest.

## 4. Las secuencias se concatenan en UN carrete continuo

Esto es lo central y lo que hace que nunca haya "cambio de escena":

- `v51` (121) + `renaissance` (362) = **483 frames**, expuestos como un solo
  objeto llamado **`reel`** con `N = 483`.
- La función de URL recibe un **índice global** y va restando `count` hasta caer
  en la secuencia correcta. Para el resto del sistema **existe un solo film
  continuo**, no dos.

## 5. Carga y decodificación

- `i.aim(frameIdx)` fija el frame objetivo; `Et(frames, idx, N)` prioriza la
  descarga alrededor del playhead (ventana móvil, igual que Plum).
- `i.frameNear(idx)` busca el frame cargado más cercano si el exacto todavía no
  llegó → nunca queda en negro (Plum ya tiene el mismo `nearest()`).
- Al aterrizar cada imagen usa **`img.decode()`** antes de marcarla como lista:
  `t.decode ? t.decode().then(n, n) : n()`.
- `c.hot = () => performance.now() - o < 500` → marca "scroll caliente" (los
  últimos 500 ms) para priorizar distinto mientras el usuario scrollea rápido.

## 6. Videos aparte (no son el film del scroll)

Además del carrete de webp hay `<video>` sueltos para momentos puntuales:

- `/films/colossus.mp4` + `/films/colossus-poster.jpg` → el **hero** (autoplay)
- `/films/signal.mp4` → carga recién a `scrollY ≈ 20400` (lazy, por sección)
- `/films/footer-loop.mp4` → loop del footer

O sea: **hero y footer = `<video>`; el cuerpo del scroll = secuencia de webp en
canvas.**

## 7. Otros datos del scan

- Alto del documento: **41.088 px** (~53 viewports a 768 de alto).
- Fuentes propias: `GTStandardL`, `GTStandardMono`, `FlechaL/M/S` (serif de
  display + mono).
- Bundle único de ~324 KB (`/assets/index-BhJdAf8K.js`), sin framework detectado
  por heurística (no React/Vue en el bundle público).
- Un `/art/scaffold_expand.jpg` suelto para una sección.

## 8. Qué le falta a PLUM para ser esto

La arquitectura de Plum **ya coincide** en lo esencial: un canvas, secuencia de
webp, carga progresiva por ventana, fallback al frame más cercano.

Lo que **no** coincide, y es lo único que importa visualmente:

| | pear.no | PLUM |
|---|---|---|
| Contenido | **un solo mundo pintado**, cámara continua | 6 clips de stock distintos (Canva, con marca de agua) |
| Continuidad | nunca corta | corta en cada cambio de capítulo |
| Frames | 483 de una misma pieza | 481 de piezas inconexas |
| Tiers | 768 / 1440 con manifest | un solo tamaño, count hardcodeado |

**El gap no es de código: es de material.** Para que Plum no corte nunca hacen
falta ~480 frames de *una sola* travesía continua (un mundo, una cámara), no
clips separados. Eso es producción de assets, no configuración.

## 9. Pendiente para Plum (orden sugerido)

1. Producir la secuencia continua (un mundo, una cámara). Es el único cambio
   que resuelve "sin cambio de escena".
2. Adoptar el manifest + tiers `768/1440` y el naming `f_NNN.webp` (barato, ya
   está el resto del motor).
3. Sacar el footage de Canva con marca de agua (no es licenciable para vender).
