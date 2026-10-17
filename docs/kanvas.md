# Kanvas — «todo en un canvas» (estudio de kprverse.com)

Prototipo local en `/proto/kanvas` (solo en desarrollo; en producción la ruta redirige a la home).
Recrea la técnica de [kprverse.com](https://kprverse.com) con identidad propia: **VESPER**, un atlas
ilustrado (nombre provisorio). Hubo dos intentos anteriores que fallaron; `docs/kprverse-handoff.md` se
descartó. Este documento es la referencia.

## 1. Cómo está armada la referencia (verificado en vivo, 2026-10-16)

```
#layout
├─ #canvas-container          position: fixed, pantalla completa
│   ├─ <canvas data-engine="three.js r150">
│   └─ section.homeLaunch     (oculta: la de compra)
├─ #ui-container              position: fixed, encima del canvas
│   ├─ section.homeLanding        ← la única con visibility: visible
│   ├─ section.homeProjectIntro   (oculta)
│   ├─ section.homeProjectStory   (oculta)
│   ├─ section.homeCollection…    (ocultas)
│   ├─ section.tableauFactions    (oculta)
│   ├─ section.homeUniverse       (oculta)
│   └─ section.homeKeep           (oculta)
├─ .smooth-wrapper            position: fixed (GSAP ScrollSmoother)
│   └─ .smooth-content        13 687 px de alto: el marco + el LARGO del scroll, nada más
└─ menú, preloader, consola, avisos…   capas fijas que se prenden cuando hacen falta
```

Lo que eso significa:

- **No hay página que scrollee.** Todo es `position: fixed`. `.smooth-content` solo aporta altura
  para que exista la barra de scroll; el número de scroll se convierte en **un progreso 0 → 1** que
  mueve todo.
- **Las secciones no están dentro del canvas.** Están en `#ui-container`, todas a pantalla completa en
  `top: 0`, **apiladas**. Solo la activa tiene `visibility: visible`; el progreso decide cuál se ve y
  cómo entra o sale (opacidad, desplazamiento).
- **El canvas dibuja lo que es imagen**: el personaje 3D del hero (un GLB por tramo, con texturas
  pintadas y una cámara animada horneada), las cards con forma de carpeta y las escenas de cada tramo.
  Si borrás el canvas desaparecen las imágenes y queda el texto.
- **Cómo coinciden canvas y HTML:** cada sección tiene `div` vacíos donde va una card. Cada cuadro, el
  canvas lee el rectángulo de ese `div` (`getBoundingClientRect`) y dibuja la imagen exactamente
  encima. Por eso parece una sola página.
- `data-engine="three.js r150"` lo agrega Three.js solo; no hace nada.
- En el teléfono el canvas se dibuja al ~90 % de la pantalla y con densidad 1 (393 px css → 353 px).
  Es buena parte de su liviandad.
- Medir la red con `read_network_requests` del panel: el buffer de recursos del navegador se corta en
  250 entradas.

## 2. Cómo funciona Kanvas

Archivos:

| Archivo | Qué hace |
|---|---|
| `src/proto/kanvas/engine.js` | El motor: un `<canvas>` fijo, un bucle `requestAnimationFrame`, cámara ortográfica en píxeles de pantalla y `plane()`: un plano que se dibuja sobre un rectángulo de pantalla, recortado por el shader. |
| `src/proto/kanvas/KanvasPage.jsx` | La página: el reloj, la carga, la escena 3D del hero, las láminas y la capa UI apilada. |
| `src/proto/kanvas/ui.jsx` | HUD, links con efecto, onda del sonido, menú en cajón, tipografías a comparar. |
| `src/proto/kanvas/audio.js` | Sonido sintetizado con Web Audio (música de fondo y efecto del menú), sin archivos. |
| `design/masters/kanvas/build-isle.py` | La escena de prueba en Blender (isla, torre, tres viajeros, mar, nubes) con la cámara animada → `public/proto/kanvas/isle.glb`. |

### 2.1 Las tres capas (igual que la referencia)

```
<div spacer style="height: 600svh">     ← el largo del scroll y nada más
<canvas fixed z-0>                      ← todo lo que es imagen o 3D
<div ui fixed z-10>                     ← secciones apiladas (carga, hero, láminas…)
<div hud fixed z-20>                    ← esquinas, barra, altímetro, sonido
<Menu fixed z-50>
```

### 2.2 Un reloj

`progress = scrollY / (alto del spacer − alto de pantalla)`, de 0 a 1. Lenis suaviza el scroll; el
bucle del motor lee `window.scrollY` en cada cuadro. El guion vive en `T` (tramos de progreso):

```js
const T = {
  heroOut: [0.06, 0.16], // el texto del hero se desvanece
  morph:   [0.14, 0.46], // el hero se aleja y queda como lámina
  tableIn: [0.28, 0.46], // la sección siguiente sube a su lugar
  ink:     [0.4, 0.56],  // su titular se entinta
}
seg(p, T.morph) // → 0..1 dentro del tramo
```

Nada se monta ni se desmonta: cada cuadro, cada pieza calcula su estado desde el progreso. Por eso
no hay saltos entre tramos, y scrollear hacia atrás rebobina todo.

### 2.3 Los planos del canvas (`engine.plane`)

Un `PlaneGeometry` con un `ShaderMaterial` propio. Por cuadro se le fija:

- `rect(x, y, w, h, rot)`: rectángulo en píxeles de pantalla y giro (las láminas inclinadas).
- `shape({ top, bottom })`: radio de cada esquina, recortado en el shader con una distancia firmada
  (`sdRoundBox`, Inigo Quilez). Con los radios de arriba en medio ancho es un arco (la lámina); con
  todos en medio alto, una píldora (el ojo que se abre). Como es un número, **la forma se anima**:
  un rectángulo a pantalla completa se convierte en lámina sin cortes.
- `clip(x, y, w, h)`: ventana fuera de la cual no se dibuja (`gl_FragCoord`). Es la ventana del HUD:
  lo que sube más allá de la barra se corta en su línea. La capa UI hace lo mismo con `clip-path`.
- Uniforms de imagen: cover-fit (`uMapSize`), zoom y corrimiento (`uZoom`, `uShift`, el parallax
  interno), `uAlpha`, tinte.

### 2.4 La escena 3D del hero

- `GLTFLoader` carga `isle.glb`: la escena y **su cámara con la animación horneada en Blender**.
- La escena se renderiza a un `WebGLRenderTarget` (MSAA ×4) y esa textura se muestra en un plano.
  Así la escena 3D se comporta como una imagen más: se recorta, se encoge y se gira como lámina.
- `AnimationMixer.setTime(progreso × duración)` reproduce **todos** los clips (la cámara y su punto
  de mira `Camera_Target` vienen en clips separados) atados al scroll.
- **Inclinación al mouse:** el contenido (todo menos la cámara y su punto de mira) va a un grupo
  aparte que gira en los ejes de la cámara (`matrixWorld` columnas 0 y 1) alrededor de la posición de
  `Camera_Target`. Si se gira la escena entera, la cámara gira con ella y no se nota nada.
- Materiales `MeshToonMaterial` con rampa de 3 tonos y colores por vértice; cielo en `CanvasTexture`
  y niebla. Faroles y cristal se detectan por el color de vértice y se encienden con `emissive`.

### 2.5 Del hero a la lámina

El plano del hero interpola su rectángulo de pantalla completa al del `div` destino
(`data-rot="-5"` da el giro final), su forma de rectángulo a arco y su ventana de recorte. El destino
es un slot de la sección siguiente: al terminar, el hero **es** una de sus tres láminas.

### 2.6 Las otras láminas: escenas vivas

No son fotos: son la **misma escena** vista por otras cámaras (`VIEWS`), cada una a su propio
render target del tamaño del slot. Solo se renderizan mientras se ven. Se inclinan con el mouse
igual que el hero.

### 2.7 La carga

`THREE.LoadingManager` cuenta el GLB y las tipografías (progreso real). Al llegar a 100 %:

1. **form** — el nombre se arma con un shader propio (`WORD_FRAG`): cada fila de píxeles es una
   veta que entra desde un costado, estirada (lee una sola línea del glifo) y parpadeando, y se
   acomoda en su lugar.
2. **hold** — el nombre se sostiene.
3. **fold** — todas las filas leen la línea del medio y el plano se aplasta hasta una raya: el
   nombre se pliega en el horizonte.
4. **reveal** — el horizonte se abre como un ojo (radios en medio alto que se aplanan) sobre la
   escena.

El nombre se dibuja con Canvas 2D a una textura. **Trampa:** una `CanvasTexture` que cambia de tamaño
después de subir a la GPU no se re-sube (queda reservada con el tamaño viejo y no dibuja nada): hay
que crear una textura nueva en cada redibujo.

### 2.8 UI encima

- **HUD** (`.kv-frame`): esquinas de mira, barra de arriba, altímetro que baja con el progreso,
  rótulo vertical, sonido. `data-theme` pasa de claro sobre el hero a oscuro sobre el crema.
- **Links** (`RollLink`): cada letra rueda hacia arriba con un retraso por letra (`--i`) y la que
  entra viene en el color de acento (es su `text-shadow`); dos esquinas se cierran como mira. Solo
  CSS; en pantallas táctiles no se activa por hover.
- **Menú**: el contenedor se desliza de `-ancho` a `0` mientras el panel interior hace lo inverso
  (la máscara se mueve, el contenido queda quieto); una línea de acento barre con el borde. WAAPI,
  `Esc` y clic afuera cierran.
- **Sonido** (`audio.js`): arranca apagado (el navegador no deja sonar sin un gesto). Loop phonk
  sintetizado (bombo 808, bajo saturado, cencerro con melodía, palmas, hats) y un «whoosh» para el
  menú. Se silencia con la pestaña oculta. La pista real sería un archivo con licencia.

### 2.9 La lámina se da vuelta: la cordillera (`ridge.js`)

Después de las láminas, la del hero **gira** (el ancho se cierra con `cos`, de canto se oscurece) y del
otro lado ya está otra escena, que crece a pantalla completa. Es el mismo plano: a mitad del giro
cambia su textura del render target de la isla al de la cordillera.

- La cordillera es **todo código**: un cielo, nubes y crestas dibujadas por shaders en planos a
  distintas profundidades. Al bajar y al seguir el mouse, las capas cercanas se corren más que las
  lejanas (parallax). Las crestas salen de ruido «crestado»; el color son facetas en diagonal en tres
  tonos y la nieve solo cerca de los picos. Si la luz depende solo de la x, salen columnas verticales.
- Dos textos grandes flotan (003 y 004). Con el segundo, el HUD dibuja una grilla (`.kv-grid`, CSS) y
  aparece una pantalla chica con un relieve de puntos que gira (`createTopo`), sobre su slot.
- **Transición a pantalla completa** (`WIPE_FRAG`): franjas de tinta con el filo ámbar entran desde
  los costados, tapan todo y siguen de largo. Debajo, la cámara baja a los viajeros.
- **Los viajeros**: dos figuras de espaldas hechas con primitivas; el pelo, la bufanda y el ruedo de
  la capa se mueven en el vertex shader según `uv.y` (raíz quieta, punta al viento). En pantallas
  verticales la cámara se aleja y se juntan.
- Las láminas de la sección anterior ya no se mueven todas: la del hero sigue al mouse, la de la
  torre es un «video» (su cámara orbita sola) y la de los viajeros es una imagen quieta.

### 2.10 Sonido por tramos (`audio.js`)

Como la referencia (que carga una canción de intro, un loop después, una por sección, viento,
transición y sonidos de hover), no un tema único: `audio.scene('intro' | 'hero' | 'tableau' |
'ridge' | 'wayfarers')` cambia la mezcla con fundido (pad, batería, 808, cencerro, viento, filtro);
`sweep()` suena con la transición, `tick()` al pasar por un link, `drawer()` con el menú. Todo
sintetizado; las pistas definitivas serían archivos con licencia.

## 3. Recetas

**Sumar una sección**

1. Un `<section>` más dentro de la capa UI, `absolute inset-0`, oculto.
2. Su tramo en `T` y, en `update`, `show(r.miSeccion, visibilidad, desplazamiento)`.
3. Si lleva imágenes: `div` vacíos (slots) con `ref` y un `k.plane()` por slot que copie su rect cada
   cuadro. El alto del recorrido se ajusta con `SCROLL_SCREENS`.

**Sumar una escena 3D**

1. En Blender: la escena, una cámara con `TRACK_TO` hacia un vacío `Camera_Target`, claves de
   cámara y objetivo, y `nla.bake` (glTF no exporta constraints). Exportar con cámaras, animaciones
   y colores por vértice. Ver `build-isle.py`; se corre con
   `blender -b --python build-isle.py -- <salida.glb>`.
2. En la página: otro render target + plano, y su `mixer.setTime` atado a su tramo.

## 4. Trampas que ya costaron tiempo

- La cámara viene dentro del GLB: para inclinar con el mouse, separar el contenido en un grupo.
- `Camera_Target` también está animado: reproducir todos los clips, no solo el de la cámara.
- `half` es palabra reservada en GLSL.
- No anidar `<button>` (la onda del sonido dentro del botón de la carga): usar la variante `icon`.
- En el panel del navegador de la app, `requestAnimationFrame` puede ir a ~10 cuadros por segundo:
  para mirar la animación de verdad, Chrome. Las láminas de prueba se sacan con Playwright
  (`--use-angle=swiftshader`).
- **Color:** el plano final del motor no pasa a sRGB, así que lo que se dibuja en un render target
  se ve con sus números tal cual. Los `ShaderMaterial` propios cargan sus colores como están escritos
  (`setStyle(hex, LinearSRGBColorSpace)`); con `new THREE.Color(hex)` salen mucho más oscuros.
- Lo que sube detrás de la barra del HUD se recorta dos veces: el canvas con `clip()` y la capa UI con
  `clip-path`, con los mismos números (`--pad`, `--bar`).

## 5. Estado

Hecho: carga con el nombre, hero 3D con cámara al scroll e inclinación al mouse, hero → lámina
inclinada, tres láminas vivas, HUD, menú, hover, sonido, teléfono.

Tipografía (elegida por el dueño entre 12 opciones, 2026-10-16): **Big Shoulders Display** en negra para
titulares, el nombre de la carga y el menú (`DISPLAY` en `ui.jsx`); **Barlow Semi Condensed** en
mayúsculas espaciadas para la UI y **Barlow** para el texto corrido. Se descartaron Fraunces
(«falta videojuego»), Tektur / Unbounded / Oxanium / Michroma («muy Fortnite») y Cinzel / Spectral SC /
Alegreya SC / Marcellus SC.

Pendiente: shader pintado,
más secciones (facciones, mundo), personajes pintados originales estilo serie animada (con créditos de
Higgsfield o Meshy), giroscopio en el teléfono, nombre definitivo.
