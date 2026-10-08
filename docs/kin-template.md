# KIN — cómo se hizo

> Template de galería brutalista (`/templates/kin`, USD 379). Este documento cuenta
> **cómo se desarmó la referencia, qué técnica usa cada parte y qué se cambió para
> que el resultado sea propio**. Sirve como receta para el próximo template que
> salga de un sitio hecho en Webflow + Lottie.
>
> - Plan y decisiones fecha por fecha: [`template-plans/kin.txt`](template-plans/kin.txt)
> - Política de referencias: [`reference-ip-brief.md`](reference-ip-brief.md)
> - Código: `src/components/sections/kin/` · página: `src/pages/KinPage.jsx`

---

## 1. La referencia y lo que se tomó

Referencia: un sitio minimalista y brutalista hecho en **Webflow**, cuyo hero es una
palabra gigante armada con rectángulos que, con el scroll, se desarma girando en una
pirámide y termina tapando la pantalla. Se tomó **la idea** (una marca hecha de
barras que se arma, se desarma y cuenta la página) y **el tono** (papel, negro, una
grotesca, cero decoración). No se tomó su código, su animación exportada, sus textos,
sus imágenes ni su tipografía (comercial, en versión de prueba).

En la ficha de venta y en el marketing **no se menciona** la referencia.

---

## 2. Cómo se desarmó (método reusable para Webflow + Lottie)

Las herramientas, en este orden. Todo lo descargado vive en el scratchpad de la
sesión o en `docs/reference-analysis/kin/`, que está en `.gitignore`: **nada de la
referencia entra al repo ni al ZIP**.

1. **`npm run analyze:ref -- <url> --sku kin`** — capturas de los beats donde
   cambia la firma (fondo, sticky, transforms). Detectó `lenis`, `lottie` y
   `webflow`. La nota quedó en `docs/reference-analysis/kin.md`.
2. **El HTML de la página** — en el hero hay un `<div class="lottie-animation"
   data-src="…/Scroll-new.json" data-autoplay="0">`: la animación es un **Lottie**
   que no se reproduce solo, lo maneja el scroll. Los `data-w-id` son los ids que
   usa el motor de interacciones de Webflow (**IX2**).
3. **El Lottie (JSON)** — se bajó solo para leerlo. Script de una línea que lista
   cada capa con sus keyframes de posición, rotación y escala. Datos útiles: 60 fps,
   340 cuadros, barras de proporción 183×340, tres tramos (palabra → pirámide → 3
   barras que crecen).
4. **Render cuadro por cuadro** — una página local con `lottie-web` desde cdnjs que
   dibuja N instancias del Lottie en grilla, cada una en `goToAndStop(f, true)`, y
   Playwright que la fotografía. Ojo: el cuadro de `goToAndStop` es **relativo al
   `ip`** del Lottie (el primer render salió mal por eso).
5. **El mapeo scroll → cuadro (IX2)** — el `init({events, actionLists})` de Webflow
   está en uno de los `webflow.schunk.*.js`. Se extrae el objeto con un escaneo de
   llaves balanceadas y se listan las acciones que tocan el Lottie: un evento
   `SCROLLING_IN_VIEW` sobre el `<body>` con `smoothing: 70` y keyframes del tipo
   «0–10 % de la página → 0–37 % del Lottie». También trae la coreografía del loader
   (delays y curvas exactas de cada elemento).
6. **El CSS** — fuentes (`@font-face`), escala tipográfica en `vw` y layout del hero.

Con eso alcanza para entender **qué** hace y **cuándo**. A partir de acá no se usa
nada de la referencia: se reconstruye con código propio.

---

## 3. Técnicas de KIN

### 3.1 La marca es data — `barGlyphs.js`

- Cada letra es un puñado de la **misma barra** (1 de ancho × `BAR_H` = 1.86 de alto)
  con centro, ángulo y largo (`sy`). Helpers: `V` (vertical), `HZ` (horizontal),
  `arm` (sale de un punto con un ángulo), `strut` (diagonal entre dos puntos que se
  pasa de largo).
- Las diagonales se pasan de la banda a propósito y la banda las **corta plano** con
  `clip-path` (efecto stencil). Para medir el ancho real de cada letra se recorta el
  polígono de cada barra contra la banda (`clippedXRange`, Sutherland–Hodgman).
- `layoutWord(word)` devuelve barras, ancho, alto, el rango de cada letra (para los
  pedestales) y el índice de letra (para separarlas).
- **Letras ideales: A H I K L M N T V W X Y 1 7** — el set con el que se diseñó la marca
  (todas barras gruesas). La palabra del template queda **KIN**.
- **Además se dibuja cualquier letra A–Z, número 0–9, espacio y `. - !`**, pero con
  horizontales finas y curvas cuadradas pueden verse menos limpias: probar la palabra en
  local con `/templates/kin?word=…` (solo `npm run dev`). Los acentos se sacan (Á → A,
  Ñ → N), Æ/Œ/Ø/ß se escriben (AE, OE, O, SS) y lo que no tiene dibujo se omite; si no
  queda nada dibujable se usa la palabra por defecto.
- La regla que lo hace posible: **verticales y diagonales gruesas, horizontales finas**
  (`sx = THIN`, 0.3 del ancho). Con barras todas iguales y gruesas, dos horizontales
  apiladas no entraban en el alto de la letra (la primera Z era un bloque); con las
  horizontales finas entran tres (E, B, S, 8…). Las curvas van cuadradas, tipo stencil
  (la D lleva esquinas en diagonal para no confundirse con la O). Cada barra tiene su
  grosor (`sx`) y el hero/footer lo respetan; en la puerta todas se igualan.
- La barra roja es siempre una barra gruesa parada (un fuste): un trazo fino rojo se
  leía como un punto. El loader reparte las caídas en ~2,4 s aunque la palabra tenga
  muchas barras.
- `doorSlots(n)` arma la puerta para cualquier cantidad de barras; `accentBar` elige
  la barra roja (la más cercana al centro).

### 3.2 Hero

- **Capa fija de barras** (`position: fixed`, `pointer-events: none`) arriba de la
  página; la banda del hero solo reserva el lugar. Las posiciones se miden del DOM
  real (`getBoundingClientRect`), así el mismo beat corre en cualquier pantalla y se
  reconstruye al redimensionar.
- **50/50**: la banda nunca pasa de media pantalla (`min(ancho×ratio, 50svh − …)`);
  si sobra ancho, las letras se separan (`extra` por letra) para seguir de borde a
  borde.
- **Loader (timeline de GSAP, ~4,5 s; 60 % si ya se vio en la sesión)**: la línea de
  base se dibuja → las barras caen de a una (`power3.in`) y se clavan con un aplastón
  (`scaleY 0.86` → `back.out(3)`, origen abajo) — la roja última → se prende el
  recorte de la banda y las diagonales se inclinan → pedestales de a uno → reglas →
  titular línea por línea (`yPercent 110 → 0`) → el resto. El scroll queda bloqueado
  mientras dura (Lenis `stop()` + `wheel`/`touchmove` en pasivo falso).
- **Scroll (un timeline con `scrub: 1`, duraciones en píxeles de scroll)**: la banda
  suelta el recorte → cada barra sale hacia afuera con casi todo el giro y cae a su
  lugar en la **puerta** (dos pilares de barras paradas + dintel de barras acostadas,
  la roja de clave) → el vano se oscurece desde el piso → la vista **atraviesa la
  puerta**: todo escala alrededor del centro del vano hasta que el negro llena la
  pantalla. La sala oscura siguiente (`data-kin-dark`, z más alto, mismo negro) entra
  por encima y otro ScrollTrigger esconde la capa cuando la sala llega arriba.
- **Texto sobre barras**: la intro usa `mix-blend-mode: difference` (blanco): oscuro
  sobre papel, claro sobre negro. La barra roja va en **otra capa fija por encima** del
  texto: con difference el rojo se volvía celeste.
- **Nav en caja → header**: una caja con borde fino (marca, links numerados, CTA
  sólido, hora local) armada igual que el header fijo. Cuando la caja toca el borde de
  arriba, el header la reemplaza en los mismos píxeles y sus líneas se transforman (la
  de arriba se recoge, los costados suben, la de abajo se estira de borde a borde).
  Subiendo, el cambio es instantáneo y **la caja** redibuja sus líneas mientras se mueve
  con la página (redibujarlas en el header fijo lo dejaba quieto y daba un salto).
- **Teléfono**: composición propia — titular y lista arriba, la palabra apoyada abajo,
  «Menu» en una barra al pie y el menú que sube desde abajo.
- **En el builder**: si el hero no es la primera sección, no hay loader (saltaría al
  principio de la página) y la capa de barras viaja con el hero hasta que llega arriba.

### 3.3 Intro, Rooms, Collection y Footer

- **Intro**: frase corta en Archivo ancho + tres notas numeradas escalonadas (cartelas
  de sala). Líneas que suben enmascaradas con scrub; notas que entran al llegar.
- **Rooms**: índice oscuro; al pasar el mouse el resto se atenúa y aparece una barrita
  roja (la misma barra de la marca). El `transform` del hover y el de GSAP van en
  **spans distintos** (pelean si comparten nodo).
- **Collection**: tríptico a alto completo que entra escalonado → pin → los dos
  paneles de la derecha se meten **detrás** del primero, que se ensancha a la mitad →
  titular → pila en profundidad (cada obra sube con un barrido de `clip-path` y la
  anterior se achica y se oscurece con una capa negra, no con `filter`, por costo en
  teléfonos). Contador de barritas (la activa roja y más alta) y marcador rojo en el
  nombre activo, actualizados en `onUpdate` sin re-render de React. Grano animado con
  `feTurbulence` en un `::after`. Las obras son SVG propios (`artworks.jsx`, dos citan
  la marca); cada ítem acepta `src` para fotos reales.
- **Footer** (100 svh, negro): las barras **vuelven** — entran desde los dos costados
  girando y se rearman en la palabra, papel sobre negro, la roja última. Cierra la
  historia: marca → puerta → adentro → marca otra vez.

### 3.4 Vocabulario de motion

Tres tipos, nada más: **barra** (x/y/rotación/escala), **línea que sube
enmascarada** (titulares) y **regla que se dibuja** (`scaleX`/`scaleY`). Micro-
interacciones con la capa `tpl-*` (subrayado de links, zonas de toque de 44 px) y
propias (CTA sólido que se invierte, «Learn more» con línea que se retira y flecha que
sale y vuelve a entrar, cajita de scroll que flota).

### 3.5 Reducir movimiento

Sin loader ni scrub: la palabra queda armada en el hero (capa `absolute` en vez de
`fixed`), los textos entran con fundido, la colección es una grilla con todas las obras,
el footer trae la palabra armada. La colección decide el modo **antes del primer
render**: cambiar de layout después de que GSAP envolvió el pin en su spacer rompía el
DOM de React.

---

## 4. Qué se cambió para no copiar

La primera versión se parecía demasiado. Se cambiaron varias capas **a la vez** (una
sola no alcanza):

| Capa | Referencia | KIN |
|---|---|---|
| Coreografía | palabra → pirámide → 3 barras que tapan la pantalla | palabra → **puerta** que se atraviesa → sala oscura; rearmado en el footer |
| Loader | cuadrado que se arma sobre negro y se parte | **tipos de imprenta**: barras que caen de a una sobre una línea de base |
| Color | monocromo | papel frío + negro + **un rojo** (la barra clave) |
| Tipografía | grotesca neutra | **Archivo al 125 %** en mayúsculas para titulares; Inter Tight para lo chico |
| Medidas | su escala en `vw` | **grilla de 12 columnas** y medidas propias |
| Bajo la palabra | una barra gruesa | **pedestales**, uno por letra |
| Nav | fila de 4 columnas con barras y corchetes | **caja** que se transforma en header, links numerados, CTA sólido, hora local |
| Teléfono | Menu arriba, lista, título | palabra **apoyada abajo**, menú en una barra al pie |
| Intro | párrafo enorme | frase corta + **notas numeradas** |
| Galería | fotos en fila a la derecha | tríptico que **se pliega** en una pila **en profundidad** a la izquierda |

**Lección**: medir la referencia para calibrar está bien; **copiar sus números tal
cual** (0.97vw, 5.69vw, 32.8 %…) deja una huella que delata. Se pasaron a un sistema
propio.

---

## 5. Cómo se registró (checklist para un template nuevo)

Precio en `src/domain/catalog.js` · tarjeta en `src/features/home/templateMeta.js` ·
ruta en `src/App.jsx` · copy de Checkout Pro en `server/catalog.js` · ZIP en
`server/packaging.js` (y las fuentes en el `index.html` del ZIP) · miniatura
(`ProductThumbnail`), póster (`TemplateBuyPill`), tema de contacto (`ContactForm`),
`modelWrappers`, `sectionTheme`, `shop/theme`, `server/sectionFields` (presets) ·
i18n (`templates.kin`, `builder.sections.kin`) · `sitemap.xml`, `llms.txt` e ItemList
de `index.html` · builder: `src/domain/sections.js`, `sectionRegistry.jsx`,
`sectionFields.js`, `server/__tests__/sections.test.js` · `check-mobile/motion/parity`
· imágenes `public/catalog/kin.{jpg,webp}` y `public/og/kin.jpg`.

El wrapper del builder lleva la fuente (`font-['Inter_Tight',…]`): en una composición
no hay página que la ponga.

## 6. Cómo se verificó

- `npm run verify` (lint, tipos, 930 tests, invariantes).
- `npm run check:visual -- kin`: el ZIP suelto instala, compila y renderiza.
- Composición del builder con las cinco secciones y textos editados (palabra cambiada
  a MINT): `validateRecipe` acepta todo, el ZIP compila y los 16 textos y las 10
  barras aparecen.
- `npm run check:builder`: las secciones de KIN aplican los cambios del panel.
- Capturas con Playwright a 1920/1440/1280/390, versión calma, y muestreo cuadro a
  cuadro del traspaso caja → header.

## 7. Tropiezos que vale la pena recordar

- `goToAndStop(f, true)` de lottie-web cuenta desde el `ip` del Lottie.
- Un `fromTo` con `pin` + un cambio de layout posterior (modo calma decidido en un
  efecto) rompe React: decidir el modo antes del primer render.
- `mix-blend-mode: difference` vuelve celeste al rojo: lo que tenga color va en una
  capa aparte por encima.
- Dos `transform` (CSS hover + GSAP) en el mismo nodo pelean: separarlos en spans.
- Un elemento fijo que se «despide» con una animación mientras la página sigue
  scrolleando da un salto: que la animación la haga el elemento que se mueve.
- En una composición del builder un hero con capa fija puede no ser la primera
  sección: la capa tiene que seguirlo hasta que llegue arriba.
