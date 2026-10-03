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

Límites del emulador: **WebKit no existe en este entorno**. Los perfiles iPhone e
iPad emulan pantalla, DPR, táctil y user agent, pero el motor es Chromium: lo que
dependa de Safari (barra de direcciones, `svh`, rubber-banding) hay que mirarlo en
un iPhone de verdad.

Si Chromium no baja Google Fonts (proxy, sin red), el texto se mide con la fuente de
reemplazo: ver `CHROMIUM_ARGS` en `scripts/check-mobile.mjs`.

## Estado por template

Alto de la página en un Pixel 7 (390×844), en px: normal → calma.

| Template | Normal → calma | Estado |
|---|---|---|
| COMIC | 22085 → 5404 | Calma sin huecos (tira vertical), ChapterWorlds sin superposición. `check:motion` y `check:mobile` limpios |
| UNITY | 14583 → 6966 | Mosaico como fila deslizable, stats visibles, fotos a tamaño normal. 0 hallazgos con fuentes reales |
| ATRIUM | 17735 → 14532 | Escenarios pegados colapsados, contadores que cuentan, ProcessPin con rama mobile. Limpio en teléfono y tablet |
| MERIDIAN | 13868 → 13868 | El hero sigue el scroll 1:1 también en calma (decisión del dueño: el scrub es del visitante, no movimiento autónomo), así que el alto no cambia. Link del footer que quedaba invisible (transición CSS de opacity vs GSAP), zonas de toque ≥ 44 px, rótulos de 11 px. `check:mobile` 40 → 3 grupos (contador que rueda, recorte del mapa a 320, dos pines pegados en tablet); `check:motion` limpio en teléfono y tablet |
| CHAPTERS | 12834 → 12834 | Calma con fundidos (`calmReveal`) y contadores que cuentan (`calmCount`). `HorizontalPanels` (también en el home, «cómo funciona») dejaba los paneles 2 a 4 fuera de pantalla en tablet: pasa a pila vertical en calma. `StickyImageStory`: en calma sin columna pegada (las fotos B y C no se veían) y en completo gana rama < 768 (zoom + texto que sube). Nuevo chequeo `unreachable` que lo detecta. `check:motion` y `check:builder` limpios |
| NOCTURNE | 9882 → 6575 | `StickyWordCycle` en calma pasa de pila de palabras a lista con índice (01 CRAFT, 02 MOTION…): la palabra que cruza el medio de la pantalla se enciende y las otras se apagan con un fundido. `ZoomPortal` sin alto de scrub (`calm:h-auto`) con la foto y el pie entrando con fundido; el resto con `calmReveal`; la vista previa de `WorkIndex` sigue al cursor sin rezago (antes quedaba clavada arriba a la izquierda). `check:motion` (teléfono y tablet) y `check:mobile` en los dos modos: 0 hallazgos |
| FIZZ | — | Pendiente |
| MONOLITH, VELOCITY, ATELIER | — | Pendiente |
