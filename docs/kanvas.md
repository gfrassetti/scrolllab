# Kanvas — «todo en un canvas» (estudio de kprverse.com)

**VESPER**, pieza propia del Estudio, en `/estudio/vesper` (`/templates/vesper` y `/proto/kanvas` llevan ahí). No se vende ni entra al builder ni a LAB. **No está linkeada en el sitio y está fuera de los buscadores** (`noindex` en `site.js` y en `vercel.json`): no es un trabajo para un cliente, así que no se presenta como tal; se muestra a mano, en una conversación (dueño, 2026-10-19). **Kanvas** es el nombre del motor y de la carpeta (`src/proto/kanvas/`).
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
  (`sdRoundBox`, Inigo Quilez). Las cartas son **rectángulos con las puntas apenas redondeadas**
  (`CARD_SHAPE`; el dueño descartó los arcos: «haceme todo cuadrado»); con todos los radios en medio
  alto es una píldora (el ojo que se abre en la carga). Como es un número, **la forma se anima**.
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
(`data-rot="-5"` da el giro final), las puntas que se redondean y su ventana de recorte. El destino
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
- Es provisoria: el dueño la rehace con imágenes generadas (los dos viajeros de espaldas que había
  se quitaron: eran demasiado la referencia).
- **Transición a pantalla completa** (`WIPE_FRAG`): una grilla de rombos (la estrella del atlas)
  crece de abajo hacia arriba hasta tapar todo y se abre desde adentro en el mismo orden, con el filo
  ámbar. Con todo tapado, debajo cambia de sección.

### 2.11 La reliquia (`relic.js`)

La sección que sigue: a la izquierda, la ficha del objeto (como el inventario de un juego: barras y
pips que se llenan al entrar, dial con los grados de giro); al centro, una carta con **el último
farol** (3D en código: jaula de bronce, vidrio, llama con halo y luz interior, chispas) que **gira
con el scroll** en perspectiva (`uTurn` / `uPersp` del motor: el vertex shader rota el plano y lo
escala según la profundidad; la geometría va subdividida para que la imagen no se deforme); a la
derecha, el número vertical gigante (312 hojas) que cuenta al entrar. El HUD suma una barra de
progreso del scroll en el borde de abajo.
- Las láminas de la sección anterior ya no se mueven todas: la del hero sigue al mouse, la de la
  torre es un «video» (su cámara orbita sola) y la de los viajeros es una imagen quieta.

### 2.12 Los guardianes (`keepers.js`)

Como la referencia (que abre un abanico horizontal de cartas que pasa solo y después se cierra),
pero en vertical y de a dos: la carta de la reliquia se aleja mientras **un cuadrado violeta crece
desde el centro hasta llenar la pantalla**; se abren **dos abanicos verticales**, uno en cada mitad,
pegados a la línea del medio: la carta del centro grande y 4 arriba y 4 abajo, cada vez más chicas,
inclinadas hacia atrás (`uTurn.y`), más oscuras y encimadas. **Pasan solos** (`fan.phase` avanza con
el tiempo; el izquierdo sube y el derecho baja) **hasta cierto punto del scroll** (`T.rosterAuto`);
después se frenan, **se cierran hacia el centro** (`T.rosterFold`) y las dos cartas que quedan se
achican y se van. La izquierda muestra `k0 + j` y la derecha `k0 − j + 6`: los centros nunca
coinciden. El texto va en los cuatro cuadrantes del HUD, con la ficha del guardián que está al centro
(cambia mientras pasan). Las cartas se pintan con Canvas 2D (silueta, halo, luz, número, nombre y
oficio de 12 guardianes inventados) hasta tener los retratos generados.

### 2.14 El HUD cambia en cada sección

Pedido del dueño: «el HUD siempre debe cambiar en cada sección, es la gracia». Todas las líneas
existen en el marco (`.kv-hud`); el bucle pone `data-hud` en el marco según la sección y el CSS prende
las suyas, que se trazan desde un extremo (y las anteriores se recogen): láminas → una regla bajo el
titular; cordillera → la grilla con el texto 004; reliquia → dos columnas alrededor de la carta;
guardianes → **cuatro cuadrantes** con una mira al centro (A1 / B1 / A2 / B2); Faro → la columna del
título vertical y una regla del lado de los datos; juramentos → la columna del título y una regla
abajo. Mientras se mantiene HOLD (`data-hold` en el marco) se suma una regla al medio y se va la del
Faro que cruzaría los paneles. Una sección nueva suma su modo ahí.

### 2.13 El Faro

- **Fondo:** la isla del hero vista por otra cámara que **baja con el scroll** (de la punta de la torre
  a la panza de la isla) y se corre con el mouse; oscurecida mientras hay cartas delante. El mundo
  está vivo: un haz de luz baja por la torre cada tanto, el cristal late y hay luces flotando.
- **Tres cartas que se dan vuelta** (de a una): el frente es un emblema (Gate / Tower / Harbor); el
  dorso, el mundo visto desde otra cámara. La del centro es **una ventana al mundo**: su dorso es la
  misma imagen del fondo, sin oscurecer, y se abre a pantalla completa. El motor dibuja los planos de
  las dos caras (`DoubleSide`) y `uFlip` lee la imagen sin espejar.
- **HUD:** título vertical, datos del lugar y el **escaneo de la torre** (la isla con un material que la
  pinta en grises según la altura, con bandas que suben, girando; `overrideMaterial`, sin cielo).
- **HOLD:** la película de la sección (ver 2.15).
- **Salida:** el mundo a pantalla completa se achica a una carta inclinada (teñida de violeta) y sale
  volando hacia arriba, sobre un fondo claro; mientras tanto, desde abajo, sube la carta de los
  juramentos (`T.beaconOut` / `T.oathsIn`, lineales, con una curva por etapa: si se suavizan dos veces
  la primera carta se va antes de que llegue la segunda y queda la pantalla vacía).

### 2.15 HOLD: una película mientras se mantiene apretado

Cómo lo hace la referencia (mirado cuadro por cuadro, 2026-10-17): al apretar, la escena se oscurece,
el título vertical se arma y aparecen **tres paneles** con piezas del mundo (objetos 3D girando y una
imagen o video); cada un par de segundos la tanda cambia, con otros paneles en otro lugar; al soltar,
todo se apaga y vuelve la sección.

Acá: `FILMS[zona]` es una lista de tandas de tres paneles (`REEL` = 2,8 s cada una), con su lugar en la
ventana del HUD (`at`, en fracciones; en el teléfono, `FILM_PHONE`). `hold.v` es cuánto se ve (sube en
0,3 s, baja en 0,4 s); `hold.t` es el reloj de la película (corre mientras se aprieta y vuelve a cero
cuando se apagó). `runFilm()` acomoda los paneles DOM cuando cambia la tanda y dibuja cada contenido
en su lugar con un plano del canvas, que se revela de arriba hacia abajo. Tipos de panel: `view` (la
isla en vivo, cámara que orbita), `art` (una pieza 3D de `film.js`: astilla de lumen, astrolabio,
llave, campana, sello, garfio; `scan: true` la pinta en grises), `scan` (la torre escaneada), `topo`,
`relic` y `paint` (la pintura de un guardián). Cada panel se traza (el marco SVG con `pathLength`),
después entra el texto, y la barrita de abajo carga mientras dure la tanda; el anillo del cursor
también. El título vertical de la sección se pinta letra por letra con muestras de pintura de los
guardianes (`drawSwatch`, `.kv-paint-l`) y el mundo se oscurece (`uTintMix`). Con mouse el anillo es
el cursor; en pantalla táctil es un botón al centro.

### 2.16 Los juramentos (`oaths.js`)

Dos personajes en capas delante del mundo (2.5D, como la sección de facciones de la referencia): una
escena propia con planos a distintas profundidades —la isla en vivo al fondo (otra cámara, lejos),
una bruma, un parapeto, la farolera de cuerpo entero (los vértices de abajo se mecen con el viento) y
el busto del navegante de la marea bien adelante— y una cámara que se corre con el mouse: el frente se
mueve mucho y el fondo casi nada. El scroll la acerca un poco. Se dibuja en una textura que muestra una
carta: sube inclinada desde abajo y crece a pantalla completa. Tiene su propio HOLD («Two oaths»).
Los personajes están pintados con Canvas 2D: son provisorios hasta tener el arte generado. Lore: los
**Faroleros** llevan la luz hacia adelante; los de la **Marea** cuidan que la oscuridad no se cierre
detrás.

### 2.17 El mundo (`world.js`) y el cierre

Como la referencia termina («The World» y la marca gigante con un collage), con lo nuestro:

- **Las cartas que unen secciones** (`cardMove('out' | 'in', t, W, H)`): la sección a pantalla completa
  se achica a una carta inclinada y sale volando hacia arriba; desde abajo sube la carta de la
  siguiente y se abre a pantalla completa. Faro → juramentos → mundo → cierre usan la misma función;
  `placeCard` la aplica a un plano (y lo oscurece mientras dura HOLD).
- **El mundo:** el archipiélago visto desde lo alto de un acantilado: islas flotantes sobre un mar de
  nubes, rutas punteadas con botes-linterna que van y vienen, y la isla del hero al centro (una copia
  del GLB sin sus nubes: vistas desde arriba eran discos; se separan por color, la torre es apenas más
  oscura). El primer plano va pegado a la cámara: dos acantilados y alguien escalando con la bufanda
  al viento; con el mouse se corre más que el fondo. En vertical los acantilados se angostan. Tiene
  su HOLD («The world», paneles `world`: el archipiélago en vivo desde otra cámara).
- **El cierre:** «VESPER» gigante —dibujado en el canvas, así la carta del mundo le pasa por encima al
  irse— y tres cartas: el archipiélago de costado (la única que se inclina con el mouse), la torre
  (quieta) y un primer plano del navegante (se acerca despacio; se dibuja con el formato de la carta
  para que el encuadre sea el mismo en el teléfono). Abajo, «Begin the crossing» (vuelve al principio)
  y los links a cada hoja. «Get the atlas», arriba, lleva acá.
- **Las cartas del cierre** (como la referencia, mirado con el mouse encima de cada una): lo de adentro
  está quieto; la carta que tiene el mouse crece un 6 %, se endereza, se tiñe de lila y muestra su
  rótulo («■ The world»). Son botones que llevan a su hoja. Las tres se dibujan una sola vez.
- **El footer no tapa la página: la página lo descubre** (medido en la referencia: la marca gigante queda
  fija abajo mientras todo lo de arriba sube). «VESPER» de lado a lado y los avisos legales (se abren
  en un panel, `LegalSheet`) están fijos abajo, detrás de todo (`z-0`; el canvas va en `z-[1]`). Cuando
  el recorrido termina, el bucle corre hacia arriba el canvas, la capa de secciones y el HUD lo mismo
  que se pasó el scroll (`over`), y pegada debajo sube la franja de cuatro columnas (el registro del
  atlas, las hojas, «Join the crossing» y el contacto), que va en el flujo; detrás de la franja, un
  hueco transparente del alto de la marca. El borde de la franja corta las letras mientras pasa.
- **Las letras del footer se decodifican al entrar** (`useScrambleIn` en `ui.jsx`, como la referencia):
  cada texto marcado con `data-scramble` se escribe letra por letra y cada letra pasa unos cuadros por
  caracteres al azar antes de quedar; escalonado por columna (`data-delay`) y el registro más lento
  (`data-speed`). La marca está fija y siempre «en pantalla», así que su texto arranca cuando entra la
  franja. Al salir se rearma. Funciona sobre los nodos de texto: en un `RollLink` cada letra es su
  nodo y el hover sigue igual. Columnas: una en el teléfono, dos por fila entre 640 y 1023, cuatro desde
  1024 (a ~950 px cuatro columnas cortaban el mail y partían el botón).

### 2.18 El largo del scroll

El dueño (2026-10-18): en la referencia «scrolleás un poquito y avanza un montón»; acá había que
scrollear mucho. La referencia recorre todo en ~16 pantallas reales (13 687 px a 900 de alto; el footer
va aparte). El guion sigue escrito en pantallas (`S(a, b)`, 40 en total), pero cada una mide
`SCREEN_SVH` svh. Con 44 (~17 pantallas, como la referencia) el dueño lo sintió apurado («sucede todo
un poco muy rápido»); quedó en 58 (~23 pantallas). Para acelerar o frenar todo, se cambia ese número;
el guion no se toca.

### 2.10 Sonido (`audio.js`): la música y el menú, nada más

Suenan dos cosas (dueño, 2026-10-18: «la música on debe ser solo música, no todo el sonido de la
página»):

- **La música**, que prende y apaga el botón de la onda («Music on / off»): la pista tal cual, al mismo
  volumen y sin filtros en toda la página. Se descarga recién cuando se prende.
- **El cajón del menú** (`drawer()`), que suena siempre, con la música prendida o apagada: va por su
  propia salida, por fuera del volumen de la música.

Se sacaron para siempre: el viento que entraba en la cordillera, el Faro y el mundo; el riser de la
intro; la pista que se apagaba detrás de un pasabajos según el tramo (al scrollear sonaba como un
efecto); y antes, los pitidos y clics de los links y las transiciones (2026-10-16: «queda horrible»).
`audio.scene()` solo cambia los instrumentos del loop sintetizado, que suena únicamente si no hay pista.

**La música de la demo** es «Phonk Reel» de Kulakovka (Pixabay, elegida por el dueño 2026-10-16):
`createAudio({ track: '/proto/kanvas/audio/phonk-reel.mp3' })`. Sin el archivo, o si no carga, suena
el loop sintetizado. El MP3 está en `.gitignore`: la Pixabay Content License permite usarlo en el
sitio, no redistribuirlo tal cual; el ZIP lleva el sintetizado y el lugar para la pista del comprador.
Para recuperarlo:
[pixabay.com/music/phonk-phonk-reel-614877](https://pixabay.com/music/phonk-phonk-reel-614877/) →
`public/proto/kanvas/audio/phonk-reel.mp3`.

### 2.19 Velocidades: arrancar lento, terminar rápido

El dueño (2026-10-18), sobre la referencia: hay movimientos que «arrancan lento y terminan más
rápido», y ese cambio de velocidad es la micro-interacción que hace la diferencia.

- **El cajón del menú**, medido en la referencia cuadro por cuadro: espera ~90 ms, recorre en ~410 ms y
  arranca suave en vez de salir disparado. Ajustado a sus muestras: `cubic-bezier(0.25, 0.2, 0.35, 1)`,
  430 ms con 80 ms de espera (`EASE_DRAWER` en `ui.jsx`); los ítems entran con la misma curva. Antes:
  820 ms con una curva que salía de golpe y tardaba en frenar.
- **Del mundo al footer**: la página no sube 1:1 con el scroll. Sube `travel × u^1.7`: los primeros
  ~120 px de scroll la mueven ~28 px y los últimos, ~190 px por tramo. La franja de columnas va en el
  flujo, así que el bucle la corre la diferencia (`raw − over`) para que siga pegada; al final coinciden.

### 2.20 El hero: un campo dibujado en 3D (`build-field.py`, `ink.js`)

El dueño (2026-10-18): el hero es un modelo 3D como kprverse, con personajes en una pose fuerte, y
**todo se ve como las ilustraciones generadas**: línea de tinta, color plano, claro. Nada oscuro ni con
filtro cálido, nada modelado a mano al lado de piezas generadas.

- **Piezas** (originales en `design/masters/kanvas/3d/`): cada una es una imagen de Nano Banana «in the art
  style of ARC Raiders, original design», sobre fondo gris, pasada a 3D. Objetos (ruina, auto, torre,
  piedras, arbusto, cerca) con **SAM 3D, 1 crédito**; personajes y la máquina con **Tripo H3.1, 9
  créditos** (SAM 3D Objects no acepta personas). Los GLB de Tripo vienen de ~45 MB / 1,4 M triángulos:
  se aligeran a ~50 k con textura de 1024 sin pérdida visible.
- **Escena**: `design/masters/kanvas/build-field.py` arma todo en Blender sin ventana (suelo con la
  textura dibujada repetida, el sendero, las piezas apoyadas en el suelo, el cielo pintado como telón
  curvo y la cámara horneada de las caras al lugar entero) y exporta `public/proto/kanvas/hero/field.glb`
  con Draco (~3,5 MB; el decodificador vive en `public/proto/kanvas/draco/`).
  `blender -b --python design/masters/kanvas/build-field.py -- public/proto/kanvas/hero/field.glb`
- **Personajes**: GLB aparte (`hero/raider.glb`, el protagonista con casco y el arma en la mano, adelante;
  `hero/man.glb`, el viejo, atrás) que la página para en el suelo (`HERO_CHARS`). El pasto que se mece es
  código (`grass.js`).
- **Cámara**: arranca en contrapicado con el protagonista en primer plano (de lejos y de arriba «no se
  aprecia nada») y termina en su visor, que es lo que muestra la lámina del medio. En pantallas anchas el
  cuadro se corre a la derecha del titular (`setViewOffset`) y vuelve al centro al hacerse lámina.
- **Las tres láminas** (como la referencia): a la izquierda una imagen quieta (un personaje), en el medio
  el hero, que gira apenas con el mouse, y a la derecha la del «trailer» con su botón de play. En el
  teléfono va solo la del hero.
- **Look**: `ink.js` pinta cada pieza con su textura casi sin luz y un contorno de tinta de grosor fijo
  en píxeles (casco invertido). Luz pareja y clara; bruma crema solo a lo lejos.
- **Dos escenas**: `field` es el hero (y sus dos láminas); `hero` sigue siendo la isla flotante que
  filman las secciones (el Faro, los juramentos, el cierre, el escaneo) con sus cámaras. Esas cámaras se
  pensaron para la isla: con el campo quedaban bajo el pasto.

### 2.21 El resto de las secciones, dibujado (2026-10-18)

Todo VESPER pasó al look de las ilustraciones (dueño: «todo se debe ver así»):

- **La isla flotante** de las secciones (el Faro, sus cartas, el escaneo, el fondo de los juramentos, la
  lámina del cierre y el centro del mundo) es `public/proto/kanvas/isle-drawn.glb`
  (`design/masters/kanvas/build-isle-drawn.py`): la isla generada (SAM 3D) con la torre, piedras, arbustos y
  una cerca, con las medidas de la de juguete para que las cámaras la encuadren igual.
- **El mundo**: las nueve islas del archipiélago son copias de la isla dibujada (sin la torre las impares),
  sobre un mar de nubes crema.
- **Los guardianes**: los 12 retratos salen de UNA imagen 4k con la grilla (3 créditos en vez de 24),
  recortada en `public/proto/kanvas/keepers/kNN.webp`; `drawKeeper(i, fonts, portrait)` pone el nombre
  encima.
- **La reliquia**: el farol es un GLB dibujado (`relic-lantern.glb`) con su halo y chispas en código.
- **Los juramentos**: el viejo de cuerpo entero y el protagonista de medio cuerpo (los GLB del hero).
- **La cordillera**: la misma geometría, con la paleta de la tarde (azul polvo, crema, oliva).
- **Colores**: los violetas que quedaban (fondo de los guardianes, tintes de las cartas, el Faro, el
  footer, la tinta) pasaron a tinta cálida; el hover del cierre tiñe de ámbar.
- Cada plano que muestra un render 3D lleva `uEncode = 1` (ver «Trampas»).

### 2.22 Un cuaderno de expedición, no kprverse (2026-10-18)

El dueño quiere VESPER como vitrina del Estudio y más lejos de la referencia. Se reemplazaron las firmas
que venían de kprverse por un lenguaje propio de cómic y storyboard (prueba aprobada antes de construir):

| Antes (de kprverse) | Ahora |
|---|---|
| Rayas que forman el nombre, se pliegan en el horizonte y se abren como un ojo | El nombre en contorno se llena de tinta con lo que baja; después la escena se dibuja **en línea de tinta** desde el visor del protagonista y atrás entra el color como acuarela (`uSketch` en `engine.js`: Sobel sobre el render, un umbral con ruido que crece desde `uOrigin`) |
| Láminas lisas que flotan | **Viñetas de cómic**: borde de tinta tembloroso, sombra corrida, el borde se traza alrededor (`uDraw`) y después entra el color (`uFill`); `plane.comic(ink, drop)` |
| Rótulos sueltos debajo de cada lámina | **Cajas de narración** (`.kv-cap`) montadas sobre el borde de la viñeta; «Live» como chip de tinta |
| Botón de play redondo, botones con esquinas cortadas | **Botones de tinta** (`.kv-btn`): papel, borde, sombra corrida, se hunden al apretarlos |
| Esquinas de mira, rótulo vertical, barra que se llena | La raya de la barra a pulso, el avance del scroll **trazado encima en ámbar**, «Leaf 02 / 08» abajo como número de página |
| Links que ruedan letra por letra y se enmarcan | **Trazo de pincel** que subraya (hover, foco y el activo) |
| Menú en cajón oscuro que barre desde el riel | **Hoja de cuaderno** (rayada, margen rojo) que se despliega desde arriba |
| Textos del footer que se decodifican con caracteres al azar | Se **escriben** letra por letra |

La página de las láminas es una hoja rayada (`PAPER_FRAG`, en el canvas para que quede debajo de las
viñetas), con un boceto pegado con cinta (`hero/rough.webp`, la línea de tinta de la misma escena) y una
nota al margen. En teléfono y tablet va una sola viñeta (la del hero); las tres, desde `lg`.

### 2.23 La vitrina, difícil de copiar (2026-10-18)

VESPER no se vende: se muestra en `/estudio/vesper` (link desde la zona Estudio del home). Lo que el
navegador muestra siempre se puede sacar de la memoria con herramientas especiales; la idea es que copiarlo
cueste mucho más que mirarlo:

- **Piezas selladas.** Los modelos y las imágenes no están en el repo ni en el build sin cifrar
  (`public/proto/kanvas/*` está en `.gitignore`, salvo `draco/` y `s/`; el build borra lo demás de
  `dist/proto/kanvas`). `node scripts/vesper-seal.mjs` los cifra (AES-256-GCM) en
  `public/proto/kanvas/s/<id>.bin` (el id sale del contenido) y escribe `src/proto/kanvas/seal.js` (clave y
  mapa). **Después de cambiar un modelo o una imagen hay que volver a correrlo** y commitear los `.bin`
  nuevos. Los sirve la CDN de Vercel con caché para siempre (`vercel.json`); un `.bin` suelto no sirve sin
  la clave. En `npm run dev`, Vite lista `public/` al arrancar: si el script generó archivos nuevos,
  reiniciar el servidor (si no, devuelve el HTML y el descifrado falla con `OperationError`).
- **No por la API (2026-10-18).** Primero se sirvieron por la API con un pase que vencía: en producción
  pasaban por Vercel → Railway sin caché y la carga quedaba trabada decenas de segundos en «Inking the
  atlas 033%» (3,5 MB tardaban 9,5 s). Se volvió a archivos estáticos.
- **Peso (2026-10-19).** En producción la carga tardaba ~50 s con una conexión de 4 Mbit/s: los
  personajes iban sin comprimir (1,8 MB cada uno) y el escenario pesaba 3,5 MB. Ahora todo sale con Draco
  cuantizado y texturas WebP, sin los mapas que el trazo de tinta no usa (relieve, rugosidad, metal):
  `build-field.py` y `build-isle-drawn.py` exportan así, y `design/masters/kanvas/compress-glb.py` comprime
  cualquier GLB suelto (los personajes, la reliquia). Hero ~3,1 MB (antes 7,5), todo sellado 5,1 MB (antes
  10,2). Con el build: la escena empieza a dibujarse a los 3,4 s a 25 Mbit/s y a los 14,7 s a 4 Mbit/s.
  Un GLB nuevo de Tripo: `lighten-glb.py` y después `compress-glb.py`.
- **Carga en dos tandas.** La carga espera solo lo del hero (escenario, personajes, láminas: ~7,5 MB, ~5 s
  a 25 Mbit/s); la isla, la reliquia, los juramentos y los retratos bajan de fondo (`later` en
  `KanvasPage.jsx`).
- **En memoria.** `src/proto/kanvas/sealed.js` descifra con WebCrypto: en la pestaña de red no hay ningún
  `.glb` ni `.webp`. Las imágenes pasan por una URL `blob:` que se revoca apenas cargan. WebCrypto pide
  contexto seguro: anda en localhost y en https, **no** por http con la IP de la red local (para probar en
  un teléfono, el sitio publicado).
- **Código ofuscado.** En el build de producción, los chunks con módulos de `src/proto/kanvas/` pasan por
  `javascript-obfuscator` (plugin `obfuscateShowcase` en `vite.config.js`): nombres en hexadecimal, textos
  en un arreglo codificado con envoltorios, claves de objetos transformadas, consola apagada y autodefensa
  (deja de andar si se lo «embellece»). Sin aplanar el flujo ni código muerto: el bucle corre a 60
  cuadros. Nada más del sitio se ofusca; los templates que se venden, nunca.
- **Clases codificadas.** En el mismo paso, las clases propias con guion (`kv-frame`, `kv-load`, `rl-u`…)
  pasan a nombres sin sentido (`x3f9a1c`) en el CSS y en el JSX a la vez. **Las pruebas sobre el build
  tienen que buscar atributos (`[data-stage]`, `[data-hud]`), no esas clases**: en desarrollo existen, en
  producción no.
- **Bots de IA.** `public/robots.txt` les cierra `/estudio/` y `/proto/` a los crawlers de entrenamiento
  (la lista que ya bloqueaba el catálogo); los buscadores comunes siguen indexando la página. Contra bots
  que no respetan `robots.txt`, el firewall de bots de Vercel (lo prende el dueño en el panel).
- **Firma.** Cada GLB lleva el copyright en `asset.copyright` y cada imagen en sus metadatos, más una marca
  casi invisible en una esquina; el SEO de la ruta pide `noai, noimageai`.


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

- **El render 3D a un render target sale en lineal.** El plano que lo muestra tiene que pasarlo a sRGB
  (`uEncode = 1`, `engine.js`); si no, todo se ve oscuro y saturado (el cielo del hero salía marrón).
- **SAM 3D Objects no hace personas** (falla sin cobrar); para personajes, Tripo.
- **Soldar vértices de un GLB de Tripo** (1,4 M triángulos) en Blender tarda minutos: solo se sueldan los
  de SAM, que vienen sin soldar.

## 5. Estado

Hecho: carga con el nombre, hero 3D con cámara al scroll e inclinación al mouse, hero → lámina
inclinada, tres láminas vivas, HUD, menú, hover, sonido, teléfono.

Tipografía (elegida por el dueño entre 12 opciones, 2026-10-16): **Big Shoulders Display** en negra para
titulares, el nombre de la carga y el menú (`DISPLAY` en `ui.jsx`); **Geist Mono** en mayúsculas para la
navegación, los rótulos y los botones (`LABEL`; la Barlow Semi Condensed de antes al dueño le pareció
«fea y tonta» en la barra) y **Barlow** para el texto corrido. El progreso del scroll es una línea ámbar
que se traza sobre la raya de la barra de arriba (2.22); el altímetro «ALT» se sacó (no tenía sentido).

**Estética elegida** (dueño, 2026-10-18), tras comparar imágenes de prueba (`design/masters/kanvas/style/`):
la del videojuego *Arc Raiders*, **del estilo de, no igual** (nada de sus personajes, nombres, números
ni marca). Retrofuturista y postapocalíptico: Tierra invadida por máquinas gigantes, pueblos abandonados
con vegetación, autos de los 70 oxidados, ropa retro de expedición (trajes acolchados crema y naranja,
cascos redondos, lona, antiparras, mochilas con cables), caras con carácter, nada de modelo; grano de
película, colores de los 70 (crema, naranja óxido, verde salvia, azul petróleo) y, en lo gráfico, las
franjas arcoíris de los 70. El tono de la película *Mickey 17*. Y **levemente caricaturesco**: menos
realista que una foto, como arte de videojuego estilizado (proporciones apenas exageradas, formas más
simples, terminación pintada), pero solo un poco. La prueba que más se acercó: `a3-retro-film-*.png`
(Nano Banana 2.1, brief de fotograma de 35 mm); le falta ese toque de caricatura. Las pruebas tipo
Arcane no convencieron (se veían «totalmente hechas por IA»).

**En los prompts de Higgsfield** (dueño, 2026-10-18): decir que es arte **inspirado en el estilo de ARC
Raiders** («in the art style of ARC Raiders») y, en la misma frase, que es un diseño original: sin sus
personajes, robots, logos ni números.

**3D** (prueba 2026-10-18, `design/masters/kanvas/3d/`): imagen de la pieza sola sobre fondo liso
(Nano Banana 2.1, 2 créditos) → GLB con **SAM 3D** (`sam_3_3d`, 1 crédito): la torre salió con buena
forma y textura en todas las caras, 1,5 MB y ~6 300 triángulos. Lo que flota o queda aparte en la
imagen (el cristal, la roca) no siempre entra. **Trampa:** el GLB viene con `metallicFactor` 1 (sin
decirlo): en Three.js sin mapa de entorno se ve negro; al cargarlo, `metalness = 0`. La alternativa de
más calidad es Meshy «Image to 3D» con texturas PBR (30 créditos).

**El mundo es un juego** (dueño, 2026-10-17): VESPER tiene su lore, sus mapas y sus historias, y los
textos tienen que leerse así. Con Higgsfield se van a generar videos e imágenes enteras (quizás
modelos 3D para el hero y el canvas) que reemplazan el arte provisorio. Se descartaron Fraunces
(«falta videojuego»), Tektur / Unbounded / Oxanium / Michroma («muy Fortnite») y Cinzel / Spectral SC /
Alegreya SC / Marcellus SC.

Pendiente: shader pintado, personajes pintados originales estilo serie animada (con créditos de
Higgsfield o Meshy), giroscopio en el teléfono, nombre definitivo.
