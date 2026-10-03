# QA en el teléfono: movimiento, versión calma y emulador

Por qué en un celular muchas demos «no se animan», cómo lo resolvimos y cómo se
verifica. Complementa a `AGENTS.md` (reglas) y a `docs/motion-cookbook.md` (cómo
se hace el scroll).

## Por qué no se animaba

El navegador del teléfono le avisa a la página que el usuario pidió **reducir el
movimiento** (`prefers-reduced-motion: reduce`):

- **iPhone:** Ajustes › Accesibilidad › Movimiento › Reducir movimiento.
- **Android:** Ajustes › Accesibilidad › Quitar animaciones. Algunos modos de
  ahorro de batería también lo prenden sin que el dueño lo note.
- **Escritorio:** «Reducir movimiento» en macOS, «Mostrar animaciones» apagado en
  Windows.

La web solo **lee** ese ajuste, no puede cambiarlo. Antes, con reduce, ~72
secciones cortaban su animación y las que quedaban rotas dejaban bloques altos
vacíos, escenarios pegados y palabras apiladas.

## Dos versiones, las dos completas

| | Movimiento completo | Versión calma (reduce) |
|---|---|---|
| Entrada de contenido | Pin, scrub, parallax, zoom | Fundido corto, una vez (`calmReveal`) |
| Contadores | Cuentan al entrar | Cuentan igual (`calmCount`): cambia el contenido, no se mueve nada |
| Carruseles / recorridos horizontales | Atados al scroll | Fila que se desliza con el dedo, con snap |
| 3D | Gira / sigue el scroll | Quieto, responde al dedo |
| Alto de la página | El del scrub | Colapsa por CSS (`calm:h-auto`), sin huecos |

Regla: la calma **nunca** deja un contenedor alto vacío ni contenido oculto. Cómo se
escribe: variante `calm:` de Tailwind (`src/styles/tpl.css`), `src/lib/motion.js`
(`calmReveal`, `calmCount`, `prefersReducedMotion()`) y `useReducedMotion()`.

## «Ver con animaciones»

Es chrome del market (no viaja en el ZIP): `MotionNotice` + `MotionToggle`.

- Se pregunta **una sola vez, en total**, y solo si el dispositivo pide reducir el
  movimiento. La respuesta y el «ya te lo mostré» viven en `localStorage`
  (`scrolllab-motion`, `scrolllab-motion-notice`): no vuelve por pestaña, por
  template, al navegar ni al recargar, aunque se lo ignore.
- No cambia ningún ajuste del dispositivo: guarda una preferencia de ScrollLab en
  ese navegador.
- Para cambiar de idea: `MotionToggle`, en el header (visible solo con reduce).
- Con `full`, `src/lib/motionOverride.js` marca `<html data-motion="full">` y
  reescribe `window.matchMedia`: `prefers-reduced-motion` da «sin preferencia» para
  todo lo que corre en el market (las secciones que leen el ajuste directo y
  `gsap.matchMedia`). El CSS no pasa por `matchMedia`: las reglas
  `@media (prefers-reduced-motion: reduce)` escritas a mano llevan
  `:where(:root:not([data-motion='full']))` adelante.
- Para saber qué pide el dispositivo de verdad: `deviceWantsLessMotion()`.

## Cómo se verifica

| Comando | Qué mide |
|---|---|
| `npm run check:motion` | Emulador de teléfono: gestos táctiles reales (CDP), CPU ×4, Pixel 7 / iPhone 13 / iPad Mini. Por sección: scroll trabado, huecos (`frozen`), texto oculto, pantalla que se ensancha, salto por la barra del navegador, carruseles que no responden |
| `MOTION=forced npm run check:motion` | Con «reducir movimiento» + el botón, cada página queda **igual que sin reducir** (alto del documento y `ScrollTrigger` vivos). Una sección que ignora el botón sale como `override-ignored` |
| `npm run check:motion-notice` | El aviso en un navegador real: una sola vez, «Dejarlo así» sin recargar, «Ver con animaciones» en todo ScrollLab, el toggle, storage bloqueado |
| `npm run check:mobile` | Layout por sección de 320 a 1280 px, normal y reduce: desbordes, texto, toque, imágenes |
| `npm run check:parity` | PC ↔ teléfono ↔ tablet con el movimiento completo: ScrollTriggers y tamaño del efecto por pieza, canvas, listeners de puntero, peso del blur animado (ver «Paridad PC ↔ teléfono») |

Límites del emulador: **WebKit no existe en este entorno**. Los perfiles iPhone e
iPad emulan pantalla, DPR, táctil y user agent, pero el motor es Chromium: lo que
dependa de Safari (barra de direcciones, `svh`, rubber-banding) hay que mirarlo en
un iPhone de verdad.

Si Chromium no baja Google Fonts (un proxy cuyo CA no reconoce, sin red), el texto se
mide con la fuente de reemplazo y salen recortes por ancho que en un teléfono no
existen (y se pueden esconder otros). Con `FONTS_VIA_CURL=1` (`check:mobile`,
`check:motion` y `check:parity`) las baja `curl`, que sí usa el CA del entorno, y se las
entrega al navegador (`routeGoogleFonts` en `scripts/lib/servers.mjs`): no se toca la
verificación TLS. Medido así, los recortes de ATRIUM `FooterAtrium`, NOCTURNE
`ZoomPortal`, UNITY `FooterTrophy`, CHAPTERS `ParallaxEditorial`, MERIDIAN
`GallerySlider`, MONOLITH y ATELIER desaparecen: eran de la fuente de reemplazo.

## Estado por template

Alto de la página en un Pixel 7 (390×844), en px: normal → calma.

| Template | Normal → calma | Estado |
|---|---|---|
| COMIC | 22085 → 5404 | Calma sin huecos (tira vertical), ChapterWorlds sin superposición. `check:motion` y `check:mobile` limpios (la página que entra en `ChapterBond:mid` queda cortada por el borde del escenario, declarada en `ALLOW`; en reposo el texto entra con 48 px o más de margen de 320 a 834) |
| UNITY | 14583 → 6966 | Mosaico como fila deslizable, stats visibles, fotos a tamaño normal. 0 hallazgos con fuentes reales |
| ATRIUM | 17735 → 14532 | Escenarios pegados colapsados, contadores que cuentan, ProcessPin con rama mobile. Limpio en teléfono y tablet |
| MERIDIAN | 13868 → 13868 | El hero sigue el scroll 1:1 también en calma (decisión del dueño: el scrub es del visitante, no movimiento autónomo), así que el alto no cambia. Link del footer que quedaba invisible (transición CSS de opacity vs GSAP), zonas de toque ≥ 44 px, rótulos de 11 px. `check:mobile` 40 → 0 grupos con las fuentes reales: el recorte del mapa a 320 y los dos pines vecinos que se pisan la zona de toque en tablet están declarados en `ALLOW` con el motivo; `check:motion` limpio en teléfono y tablet |
| CHAPTERS | 12834 → 12834 | Calma con fundidos (`calmReveal`) y contadores que cuentan (`calmCount`). `HorizontalPanels` (también en el home, «cómo funciona») dejaba los paneles 2 a 4 fuera de pantalla en tablet: pasa a pila vertical en calma. `StickyImageStory`: en calma sin columna pegada (las fotos B y C no se veían) y en completo gana rama < 768 (zoom + texto que sube). Nuevo chequeo `unreachable` que lo detecta. `check:motion` y `check:builder` limpios; `check:mobile` con las fuentes reales solo marca la cita de `QuoteBreak` a mitad de su reveal (máscara de SplitText en movimiento, declarada en `ALLOW`; en reposo las líneas están enteras) |
| NOCTURNE | 9882 → 6575 | `StickyWordCycle` en calma pasa de pila de palabras a lista con índice (01 CRAFT, 02 MOTION…): la palabra que cruza el medio de la pantalla se enciende y las otras se apagan con un fundido. `ZoomPortal` sin alto de scrub (`calm:h-auto`) con la foto y el pie entrando con fundido; el resto con `calmReveal`; la vista previa de `WorkIndex` sigue al cursor sin rezago (antes quedaba clavada arriba a la izquierda). `check:motion` (teléfono y tablet) y `check:mobile` en los dos modos: 0 hallazgos |
| FIZZ | 11220 → 9123 | La botella sigue al dedo como al mouse (`trackPointer`: antes ignoraba todo puntero que no fuera mouse). `BubbleBenefits`, `CanCarousel`, `PopManifesto` y `FooterSplash` cortaban con reducir movimiento y quedaban sin entrada: ahora fundidos (`calmReveal`). `check:builder`: `canLabel` y `canImage` se imprimen en la botella (canvas), no llegan al DOM (`NOT_IN_DOM`). `check:motion`, `check:parity` y `check:mobile` limpios |
| MONOLITH | 4904 → 4904 | El objeto 3D responde al dedo (`trackPointer`), con el movimiento completo y en calma (en calma sin giro automático ni zoom: queda quieto y solo se mueve con el mouse o el dedo, y se dibuja mientras se mueve). `SkewScroller`, `SpecSheet`, `ExhibitGrid` y `FooterBrutal` cortaban con reducir movimiento: ahora fundidos. `check:motion`, `check:parity` y `check:mobile` limpios (el título «MONOLITH» a 320/390 salía cortado solo con la fuente de reemplazo; con Anton entra). El objeto se encuadra por proporción de pantalla (`fitCameraDistance`): en un teléfono (390×844) ocupaba el 237 % del ancho y ahora el 90 %; en PC no cambia |
| VELOCITY | 8280 → 3749 | `HeroStrike` (280/320vh) en calma pasa a una pantalla (`calm:h-auto`) con los títulos entrando con un fundido; en el teléfono con movimiento completo el disuelto final ya no desenfoca (`blur(18px)` con scrub sobre tres fotos con `mix-blend` y máscara): el mismo beat con opacidad y escala, y en PC queda el blur. `ParallaxRise` y `HelmetGrid` cortaban con reducir movimiento: ahora fundidos. `TrackMerge` ya traía sus tres ramas. `check:motion` y `check:parity` limpios; `check:mobile` solo marca las fotos del hero que necesitan masters de más resolución (`image-master`, necesita créditos de Higgsfield) |
| ATELIER | 19546 → 13695 | El emblema 3D del hero responde al dedo (`trackPointer`) y las letras del titular entran sin desenfoque en el teléfono (veinte capas con `filter` animado mientras arranca el 3D). `SelectedWork` en calma: fila que se desliza con el dedo y snap, que entra con un fundido (antes las tarjetas 2 a 4 quedaban fuera de pantalla y no había forma de traerlas). `AboutClarity`, `KeyFacts` y `StudioCards` cortaban con reducir movimiento: ahora fundidos. `VisionShutter`, `WordStripe` y `ServicesStone` ya tenían su versión atenuada y se mantienen (la cinta de palabras lleva `data-scrub-tail`: corre de lado con el scroll a propósito). `check:motion`, `check:parity` y `check:mobile` limpios (el texto de las tarjetas de `SelectedWork` a 320 de ancho se cortaba 13 px solo con la fuente de reemplazo). El emblema del hero también se encuadra por proporción de pantalla: ocupaba el 121–152 % del ancho en un teléfono y ahora el 90 % |

## Paridad PC ↔ teléfono

La calma resuelve «reducir movimiento». Esto es lo otro: con el movimiento
completo (sin el ajuste, o con «Ver con animaciones»), un template tiene que verse
y animarse en un teléfono como en PC. `npm run check:parity` lo mide.

Compara cada sección entre PC (1440×900, mouse), teléfono (Pixel 7) y tablet (iPad
Mini):

- **ScrollTriggers** (cuántos, con pin, con scrub, recorrido) y el **tamaño del
  efecto** de cada uno: se lleva `animation.progress` a 0 y a 1 y se mide, en lo
  que anima, el desplazamiento (en tamaños del propio elemento: una máscara que
  sube 1,2 alturas es el mismo gesto con una letra de 230 px que de 60 px), la
  escala, la opacidad y el blur.
- **CSS** corriendo, **canvas** que cambia solo, **listeners de puntero** (qué
  sección escucha mouse y nada táctil) y **peso** (blur animado sobre media
  pantalla con scrub o sobre fotos, `mix-blend` y `backdrop-filter` grandes).

La comparación es **por pieza** (su camino en el DOM: el DOM es el mismo en las tres
vistas, cambia el CSS). De PC cuentan las piezas que se mueven y que también se dibujan
en el teléfono (un adorno `hidden md:block` no cuenta contra él); en el teléfono, esas
mismas piezas (quietas = cero: es la brecha) y las que anima por su cuenta, porque
adaptar un beat es moverlo en otras piezas (el recorrido horizontal de CHAPTERS
`HorizontalPanels` pasa a una pila vertical con zoom por panel). Es la forma de no
marcar un adorno de PC como brecha y de no perder una escena que se quedó quieta.

Cada marca es una decisión. Una que no se arregla se declara en `ACCEPTED`
(`scripts/check-parity.mjs`), con el motivo; hoy no hay ninguna, y la corrida avisa si
una declarada ya no se marca. Control negativo: con «reducir movimiento» forzado en el
teléfono, UNITY da 9 `sin-trigger`.

### Por qué unas demos se veían bien en el teléfono y otras no

1. **El 3D que sigue al mouse.** FIZZ (la botella), MONOLITH y ATELIER mueven la
   escena con `pointermove`. Un dedo que scrollea cancela esos eventos: en el
   teléfono quedaban apagadas aunque el movimiento estuviera completo.
2. **Efectos baratos en PC, caros en un teléfono real.** VELOCITY `HeroStrike`
   desenfoca 18 px, con scrub, una pila de tres fotos con `mix-blend` y máscara.
3. **Coreografía de PC sin su rama móvil.** En el home, la lista de modelos tiene
   un escenario pegado que cambia de póster solo en ≥ 768 px: en el teléfono no
   había animación. (La línea base también marcó a COMIC `ChapterFork` y
   `ChapterWorlds`, pero era un falso positivo: ver abajo.)
4. **El botón no cubría el CSS.** `motion-reduce:` de Tailwind compila a un
   `@media` pelado que no pasa por el reemplazo de `matchMedia`. Ahora es `calm:`.
5. **Lo que medíamos no comparaba con PC.** `check:motion` mide huecos, trabas y
   texto oculto dentro de un modo; no ve una animación que en PC recorre 400 px y
   en el teléfono 20.

### Línea base (2026-10-03, antes de esta ronda)

| Página | Marca | Qué pasa | Estado |
|---|---|---|---|
| Home | `sin-trigger` · lista «Los modelos» | PC: 10 ScrollTriggers (el escenario pegado cambia de póster al scrollear la lista). Teléfono: 0 (cada fila trae su póster, sin animación) | Resuelto: rama < 768 (el póster de la fila se «enciende» con un zoom atado al scroll y el texto sube al cruzar) |
| Home | `quieta` · «O armá la tuya» | La marca de fondo del CTA del builder es solo desktop a propósito (en mobile choca con el precio) | Ya no se marca: `check:parity` compara solo las piezas que se dibujan en las dos vistas (la marca es `hidden md:block`) |
| COMIC | `quieta` · `ChapterFork` y `ChapterWorlds` | Efecto de PC 57,7 → teléfono 1,4 y 51,4 → 9,6 | Falso positivo: lo que inflaba el número de PC eran una línea de 1 px y un punto (`data-split-line`, `data-crack`) que son solo de PC (`hidden md:block`). `check:parity` ahora compara por pieza (su camino en el DOM) solo las que se dibujan en las dos vistas; el beat de las cards es el mismo |
| MONOLITH | `solo-mouse` · `HeroThree` | Escucha `pointermove` y nada táctil | Resuelto: `trackPointer` |
| FIZZ | `solo-mouse` · `HeroBubbles` | Ignora todo puntero que no sea mouse | Resuelto: `trackPointer` |
| ATELIER | `solo-mouse` · `HeroMeaning` | Escucha `pointermove` y nada táctil | Resuelto: `trackPointer` |
| VELOCITY | `blur-pesado` · `HeroStrike` | `blur(18px)` con scrub sobre las capas a pantalla completa | Resuelto: opacidad y escala en táctil |

CHAPTERS, NOCTURNE, UNITY, ATRIUM y MERIDIAN salieron sin marcas: mismas
secciones, mismos efectos, en los tres anchos.

### Por qué un emulador no es un teléfono

El emulador es Chromium con perfil de teléfono (Pixel 7, iPhone 13, iPad Mini), DPR
3, gestos táctiles por CDP y CPU ×4: el mismo motor que el «modo móvil» de Chrome,
con scroll táctil real y la CPU frenada. **No prueba la GPU ni Safari (WebKit no
existe en este entorno)**: el blur animado, el vidrio con transmisión de FIZZ o el
límite de memoria de un iPhone no se ven acá. Por eso las reglas de arriba arreglan
lo que se sabe que falla en teléfonos reales aunque el emulador no lo vea.

Para mirar un teléfono de verdad: `?motion-debug` en cualquier URL del market. Dura
la pestaña (`?motion-debug=0` lo apaga) y muestra el modo de movimiento (dispositivo
/ botón), el puntero, la pantalla y el DPR, `normalizeScroll` y Lenis, ScrollTriggers
y pines activos, cuadros por segundo, canvas y contextos WebGL perdidos. Una captura
alcanza para saber por qué una demo se ve distinta que en PC.

### Presupuesto de GPU del teléfono

El emulador dibuja por software, así que no dice cuántos cuadros por segundo da un
teléfono real. Las escenas con WebGL (FIZZ, MONOLITH, ATELIER) traen una red de
seguridad: `createFrameBudget` (`src/lib/motion.js`). Tras 15 cuadros de
calentamiento mide cuánto tarda cada cuadro dibujado (en 30 cuadros o 2,5 s, lo que
llegue primero) y, si el promedio pasa de 34 ms (menos de ~30 cuadros por segundo),
baja el pixel ratio un escalón (×0,75, hasta 1) y vuelve a medir, hasta 3 veces. Si
anda bien deja de medir. En un equipo rápido no cambia nada. Con un navegador
automatizado (`navigator.webdriver`) no actúa, para que las capturas salgan siempre
a la misma resolución.

### Encuadre del 3D: la cámara mira la proporción de la pantalla

Con la cámara fija el objeto llena el **alto** de la pantalla. En PC sobra ancho, pero
en un teléfono en vertical no: el hero de MONOLITH ocupaba el 237 % del ancho a 390×844
(195 % a 320, 146–157 % en tablet vertical) y el emblema de ATELIER el 121–152 %. No lo
vio ningún chequeo: `check:motion` y `check:parity` miden movimiento, no cuánto ocupa
el objeto (lo marcó el dueño con una captura).

`fitCameraDistance({ fov, aspect, radius, base, fill })` (`src/lib/motion.js`, viaja en
el ZIP) devuelve `max(base, radius / sin(mitadFovHorizontal · fill))`: aleja la cámara
solo cuando la pantalla es angosta, hasta que la esfera que envuelve al objeto ocupa
`fill` (0,9) del ancho. En pantallas anchas devuelve `base`, así que PC queda igual, y es
continua (sin saltos entre anchos). Lo llaman `HeroThree` (MONOLITH) y `HeroMeaning`
(ATELIER) en cada `resize()`; FIZZ resuelve el caso angosto a mano (`narrow` en `layout()`).
En MONOLITH los nodos azules se compensan a medias con la distancia
(`POINT_SIZE · (distancia / CAMERA_Z)^0,4`) para que el acento siga leyéndose.

Una escena 3D nueva con `PerspectiveCamera` encuadra con esa función. Se verifica con
una hoja de contacto a 320, 390, 430, 768 y 1440 de ancho.

### Lo que encontró la corrida completa del cierre

`check:motion` en los 10 templates y el home (Pixel 7 + iPad Mini, normal / calma /
forzado: 66 corridas) encontró cuatro cosas que los pases por template no veían
(el chequeo `unreachable` y el perfil de tablet en calma llegaron después de
COMIC, ATRIUM y MERIDIAN):

- **COMIC `ChapterFork`, calma, tablet:** las dos cards usaban el ancho por defecto
  de `PaperFrame` (`min(94vw, 1180px)`) dentro de una grilla de dos columnas: la
  de la derecha se salía y el teléfono ensanchaba la pantalla a 1122 px (y de
  rebote, `ScrollTrigger` se re-medía al subir y bajar la barra). Con el pin, el
  `overflow-hidden` lo tapaba; en calma no. `calm:w-full`.
- **ATRIUM `OrbitRing`, calma:** quieto, el aro de fotos no está centrado (cada
  foto gira sobre su propio centro) y una foto quedaba 50 a 65 % fuera del
  escenario a cualquier ancho. En calma el aro se achica a 0,7 y entra entero.
- **MERIDIAN `Location`:** el mapa es más ancho que la pantalla y se desplaza al
  tocar una tarjeta o un pin (`panToPin`), no con el scroll: `data-pan`.
- **ATRIUM `PeopleScatter`:** las fotos se salen del borde a propósito
  (composición editorial): `data-bleed`.

`data-scrub-tail`, `data-pan` y `data-bleed` son las tres marcas con que una
sección le dice a `check:motion` «esto no se ve entero a propósito».
