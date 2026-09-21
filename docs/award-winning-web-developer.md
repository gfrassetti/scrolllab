# The Award-Winning Web Developer — notas del curso

> Curso pago del usuario, no público. Los conceptos se pegan en el chat a medida
> que se cursan y se documentan acá: es el espejo en el repo que alimenta
> templates nuevos y la revisión de los existentes contra el estándar Awwwards
> (ver "Qué vendemos" en `AGENTS.md`).

> **Regla del usuario (2026-09-21, no negociable):** todo lo que diga el curso
> se documenta y **se implementa tal cual**, de ahora en adelante, sin debate.
> Si un concepto del curso contradice una convención ya escrita en el repo
> (ej. `docs/scroll-media.md`), la convención existente es la que se revisa —
> no se cuestiona el concepto del curso. Por ahora la fase activa es
> **solo documentar**; la implementación arranca cuando el usuario lo pida
> explícitamente, pero en ese momento se hace sin reabrir la discusión.

## Cómo se usa

1. El usuario pega un concepto/lección del curso en el chat (texto, snippet,
   captura descripta, lo que sea).
2. Se agrega una fila a la tabla de log de abajo: principio, por qué importa
   para el estándar award-level, y dónde pega en SCROLLLAB (Beat, WebGL,
   cookbook de motion, UI/UX Pro Max, chrome del builder, etc.).
3. Cuando el usuario pida implementarlo, se aplica **tal cual lo dice el
   curso**. Si choca con una convención existente (ej. un anti-patrón
   documentado), se actualiza esa doc/convención para reflejar la nueva regla
   del curso — no se propone una alternativa "más segura" ni se pausa a
   pedir confirmación por el choque. Se ejecuta como tarea aparte del dump de
   notas (no se mezcla en el mismo commit) salvo que el usuario pida lo
   contrario.
4. Si el concepto es un primitivo de motion nuevo, referenciar/promover a
   `docs/motion-cookbook.md` en vez de duplicarlo acá.

## ⚡ Checklist de acción — Award-level vs. genérico (Lesson 1)

Comparación fija, siempre a mano. Usar en **cualquier** `Impeccable
critique`/`audit`/`polish` de un template (nuevo o existente), antes de
darlo por cerrado — es la aplicación directa de "Qué vendemos" en
`AGENTS.md`. Detalle completo y fuente de cada punto: Detalle #2 y #3 más
abajo.

**Tiene que cumplir (para pasar la barra award-level):**

- [ ] Paleta acotada y deliberada — un sistema completo, no "lo que vino
      por default" (`UI/UX Pro Max` + Design Read de `taste-skill`).
- [ ] Imágenes de alta resolución que cuentan una historia, no relleno
      decorativo (Higgsfield, nunca picsum — Detalle #4.9).
- [ ] Elementos clave (CTA, marcadores de nav) con espacio de sobra
      **a propósito**, para que nada compita por atención.
- [ ] Un foco claro por sección/viewport — el whitespace dirige la mirada,
      no solo "hay aire".
- [ ] Jerarquía tipográfica de mínimo 3 niveles, con contraste de estilo
      entre ellos (no todo el mismo peso).
- [ ] Cada sección tiene su propia composición — **el layout nunca se
      repite** entre dos secciones consecutivas (grid, ritmo, peso
      imagen/texto distintos). Dentro de un mismo listado/carrusel de ítems
      del mismo tipo, sí repetir el patrón deliberadamente (Detalle #4.3) —
      no confundir las dos escalas.
- [ ] Una sola acción primaria por sección — un CTA claro, no varios
      compitiendo (Detalle #4.2).
- [ ] Secciones marcadas por combo color + tipografía + márgenes, no por
      un divider/borde — página larga sin sensación de estar perdido.
- [ ] Micro-interacciones **dentro del template** (hover, click feedback en
      cards/paneles/CTAs propios del SKU), no solo en el chrome del market.
- [ ] Sensación de progresión "capítulo a capítulo" al scrollear, no de
      folleto — si hay nav/índice lateral, evaluar P11 (rail numérico) /
      Beat en vez de un nav estático.
- [ ] El hero evoca algo **antes de leer el copy** — abrirlo en silencio,
      sin leer el headline: si no se siente nada, no está terminado.
- [ ] Nav del hero mínima/discreta — el hero se destaca por sí solo, sin
      competir con la navegación (Detalle #4.8).
- [ ] Motion reusa el mismo vocabulario chico (2-3 tipos) en todo el
      template, no una animación de entrada distinta por sección
      (Detalle #5.2).
- [ ] Entrada de contenido en orden: headline → subtítulo → imagen, con
      pausa deliberada entre pasos, nunca todo junto (Detalle #5.3/5.5).
- [ ] Cada link/botón/form field/accordion del template tiene su
      micro-interacción correspondiente del catálogo (Detalle #6), y todas
      comparten el mismo lenguaje de feedback — no solo el chrome del
      market.
- [ ] (Evaluar por template, no obligatorio en todos) Header/nav con texto
      que refleja la sección activa del scroll — wayfinding extra en
      páginas largas con muchas secciones distintas (Detalle #7).

**Descartar / rehacer si cae en 2+ de estos (anti-patrón genérico):**

- [ ] Layout boxy/cramped, sin aire entre elementos.
- [ ] Iconos genéricos (stock, sin dirección propia).
- [ ] Tipografía uniforme, sin jerarquía real.
- [ ] Layout repetitivo, poca variación de ritmo/tono entre secciones.
- [ ] Cero micro-interacciones — nada responde a la acción del usuario.
- [ ] Whitespace mínimo — secciones se mezclan, nada resalta.
- [ ] CTAs compitiendo con otros elementos, fáciles de pasar por alto.
- [ ] Estructura intercambiable con "cientos de otros sitios" — el mismo
      test ThemeForest/Awwwards que ya define `AGENTS.md`.

## Log de conceptos

| # | Concepto | Principio / por qué | Dónde aplica en SCROLLLAB | Estado |
|---|---|---|---|---|
| 1 | Hero de video controlado por scroll ("Make the hero move with scroll", Module 6) | Scroll adelante = avanza la escena, parar = congela, scroll atrás = rebobina. Pipeline: brief beginning/middle/end → imagen IA → imagen-a-video (Higgsfield) → still del primer frame como poster → wire al scroll | Toca `docs/scroll-media.md` — ver detalle abajo | Documentado — implementación pendiente de que el usuario la pida |
| 2 | Básico vs. high-end: white space, tipografía, jerarquía, imaginería y **micro-interacciones** (Lesson 1) | Lo que separa un sitio "de template" de uno premium no es la herramienta ni la complejidad técnica, es la ejecución intencional de esos 5 elementos + crear una experiencia memorable | Transversal a **todos** los templates — Design craft (Impeccable/Emil/taste-skill/UI-UX Pro Max) en `AGENTS.md`, ver detalle abajo | Documentado — es un lente de evaluación, no una tarea puntual |
| 3 | Walkthrough comparado Shopify award-level vs. landscaping genérico (Lesson 1, video) | Mismo ejercicio del curso pero con técnicas puntuales identificables por sitio: paleta acotada + aislamiento de elementos, sección de cards con motion coordinado, jerarquía tipográfica de 3 niveles, nav vertical con numerales como "capítulos", vs. checklist de anti-patrones del sitio genérico | Toca taste-skill, Emil, motion-cookbook (P11/P13), Impeccable audit — ver detalle abajo | Documentado — checklist listo para usar en audits |
| 4 | Anatomía de un sitio premium por módulos repetibles (Lesson 2, walkthrough de un real-estate site) | Un sitio sofisticado no es 100 componentes únicos: es un vocabulario chico de módulos (hero, content block, transición, closing) ejecutados con disciplina — macro white space, una acción primaria por sección, repetición **deliberada** dentro de listados del mismo tipo, jerarquía por tamaño/peso/espacio, cierre grácil | Valida la filosofía de secciones componibles del builder (`sectionRegistry.jsx`); toca taste-skill, Emil, P13 — ver detalle abajo | Documentado |
| 5 | **Motion como cornerstone** (Lesson 3, ref. YK Produce) | El motion award-level no es sobre complejidad, es sobre **vocabulario reducido + consistencia + control del timing**: mismos tipos de movimiento reusados en todo el sitio, orden de aparición deliberado (texto antes que imagen), pausas que generan anticipación, cero motion decorativo sin propósito | Toca `docs/motion-cookbook.md` (P2/P8), tokens de easing en `src/index.css`, Beat/P11 (progress rail) — ver detalle abajo | Documentado — trae 2 candidatos a primitivo/token nuevo |
| 6 | **Catálogo de micro-interacciones** (Lesson 4, walkthrough de un sitio de agencia) | 14 micro-interacciones puntuales (hover de botón/link, drawer de nav, stagger de texto, underline variable, expand de cards, blur→clear en hero, parallax sutil, accordion, floating label de form, ícono que se rellena) + el meta-principio de que la **consistencia total** entre todas ellas es lo que las hace sumar a algo premium | **Cierra el gap señalado desde Detalle #2**: Emil hoy solo cubre chrome del market — este catálogo es el "cómo" concreto para extenderlo a micro-interacciones dentro de cada template | Documentado — catálogo listo para portar cuando se implemente |
| 7 | Animaciones puntuales desarmadas + principios de timing (Lesson 5) | 7 animaciones nombradas (fade/slide, stagger de listas, cross-fade de color entre secciones, forma grande señalando transición, label lateral que se desliza a posición, hover mínimo, **header que cambia de texto según la sección activa**) + 4 takeaways de timing citados textualmente | El header dinámico es candidato a técnica nueva — toca P1/P3/P4/P8/P13 para el resto — ver detalle abajo | Documentado — desarmado punto por punto como pidió el usuario |
| 8 | Blueprint de página narrativa de 5 beats (Lesson 6, "build a plan") | Estructura completa: Hook (hero) → Introduce (collage) → Offer (grid 3 cards) → Explain (two-column de valores) → Invite (CTA de cierre) — con reglas puntuales por sección y la disciplina de **excluir** lo que no sirve a la historia | Blueprint reusable para un template nuevo tipo "landing narrativa" **o** checklist de estructura a transpolar a templates existentes — ver detalle abajo y "Templates nuevos" | Documentado — candidato a template nuevo o a checklist de estructura |

### Detalle #1 — Hero de video scrubeado (Module 6)

**Fuente:** PDF del curso *"Scroll-Driven AI Video Heroes"* (The Award-Winning
Web Developer Program), usado después del Module 5 (Building the hero
section).

**Lo que enseña, resumido:**

1. Planear la escena como beginning/middle/end de un solo movimiento de
   cámara continuo (no varios cortes), con un prompt de imagen que **deja un
   tercio del frame muerto** para headline/botón — regla de composición
   directamente reusable en los prompts de Higgsfield (`generate_image`) de
   `template-image-designer`.
2. Imagen → imagen-a-video en Higgsfield (clip corto, ~5s), con frases de
   corrección reutilizables cuando el objeto se deforma o la cámara se mueve
   de más ("mantené la cámara casi quieta, con un leve acercamiento; el
   objeto no cambia de forma en todo el clip").
3. Extraer un still del primer frame del video como poster/loading state.
4. Wirear el video al scroll: forward al bajar, **hold exacto** al parar
   (nada de inercia/momentum propio), reverse al subir, handoff suave a la
   siguiente sección (mismo principio que **P13**, overlap sin hard cut).
5. Mobile / `prefers-reduced-motion`: imagen estática, nunca el scrub.
6. Variante "reveal por texto": una palabra grande (ej. `CONFIDENCE`) actúa
   de máscara que crece con el scroll revelando la escena detrás — técnica
   de mask/clip-path distinta a P4 (que es un disco circular), candidata a
   primitivo nuevo si se usa en más de un template.
7. Checklist de cierre reusable: alguien de afuera entiende la oferta sin
   que se la expliquen, forward/stop/reverse se comportan como se espera,
   headline legible todo el scrub, next section alcanzable, versión mobile
   deliberada, la página tiene sentido sin motion.

**Ampliación — por qué white space en el hero (fragmento pegado por el
usuario, probable Module 5 "Building the hero section", previo al Module
6 de arriba):**

> "...because the designer values the white space. Researchers point out
> that giving elements room to breathe improves readability and reduces
> cognitive load for visitors. So a great hero should evoke a feeling
> before you even read anything."

Dos puntos nuevos, específicos de hero (no genéricos de página larga como
el white space ya logueado en Detalle #2):

1. **Justificación research-backed, no solo estética**: el white space no
   es gusto, reduce carga cognitiva y mejora legibilidad — argumento útil
   para el "Design Read" de una línea que pide `taste-skill` cuando alguien
   cuestione por qué un hero "tiene mucho espacio vacío".
2. **El hero tiene que evocar antes de leerse**: la primera impresión es
   pre-verbal — atmósfera/composición/movimiento antes que el copy. Esto es
   un criterio de aceptación concreto para cualquier hero (incluido el de
   Module 6): si al abrir la página en silencio, sin leer el headline, no
   se siente nada — el hero no está terminado. Sumar como pregunta a la
   checklist de cierre del Module 6 (punto 7 de la lista de arriba) y al
   checklist de acción de Lesson 1 (arriba del todo del doc).

**Nota técnica — toca una convención existente:**

El curso conecta el scroll directo a `<video currentTime = progress *
duration>`. Hoy `docs/scroll-media.md` (sección "Por qué canvas 2D y no `<img
src>` ni `<video>`", líneas 119–127) documenta el scrub de `<video>` como
anti-patrón en SCROLLLAB (seek asíncrono, no frame-exacto, se rompe en
Safari) a favor de la Familia B: extraer fotogramas con `ffmpeg` y pintarlos
en canvas 2D según `progress`.

Por la regla de arriba, esto **no es una decisión pendiente**: cuando se
implemente, se sigue el guion del curso tal cual (Higgsfield img2video → wire
del `<video>` al scroll) y `docs/scroll-media.md` se actualiza para dejar de
marcarlo como anti-patrón — o para acotar en qué casos sigue aplicando el
anti-patrón viejo (ej. secuencias renderizadas a mano vs. clips cortos de
IA). Esa actualización de `scroll-media.md` se hace en el mismo trabajo que
implemente el primer hero de este tipo, no antes.

Piezas del guion del curso a llevar igual, sin ambigüedad:

1. Brief de escena beginning/middle/end + regla del tercio muerto en el
   prompt de imagen (Higgsfield `generate_image`, via `template-image-designer`).
2. Imagen → Higgsfield img2video, con las frases de corrección del curso
   para deformación/exceso de movimiento de cámara.
3. Still del primer frame como poster/loading state.
4. Wire al scroll: forward al bajar, hold exacto al parar, reverse al subir,
   handoff sin hard cut a la siguiente sección (mismo espíritu que P13).
5. Mobile / `prefers-reduced-motion`: imagen estática, nunca el scrub.
6. Variante "reveal por texto" (máscara que crece revelando la escena) —
   candidata a primitivo nuevo en `docs/motion-cookbook.md` la primera vez
   que un template la use.
7. Checklist de cierre del curso (oferta entendible sin explicación,
   forward/stop/reverse, legibilidad, mobile deliberado, degrada sin motion).

### Detalle #2 — Básico vs. high-end (Lesson 1)

**Fuente:** Lesson 1 del curso. Compara un sitio genérico "de template" contra
uno premium, experience-driven, para establecer la diferencia central que
recorre todo el programa.

**Lo que enseña, resumido (pegado por el usuario):**

> This lesson establishes the core difference between basic and high-end
> websites by comparing a generic template-style site with a premium,
> experience-driven one. It highlights how elements like white space,
> typography, hierarchy, imagery, and micro-interactions shape how a site
> feels. The key takeaway is that high-end design is not about tools or
> complexity, but about intentional execution and crafting a memorable user
> experience.

**Los 5 elementos que marca la lección** — y dónde ya vive cada uno en
SCROLLLAB:

| Elemento | Dónde pega hoy en el repo |
|---|---|
| White space | `UI/UX Pro Max` (sistemas/checklist), taste-skill (anti-slop) |
| Tipografía | `UI/UX Pro Max`, P8 (SplitText reveal) en `docs/motion-cookbook.md` |
| Jerarquía | Impeccable `critique`/`audit`, taste-skill |
| Imaginería | Higgsfield (`generate_image`/`remove_background`), `template-image-designer` — nunca picsum |
| **Micro-interacciones** | **Emil Kowalski / emil-design-eng** — hoy acotado a chrome del market (nav, botones, popovers, toasts) en `AGENTS.md` regla #2 |

**Por qué importa esta lección puntualmente — micro-interacciones:**

Es el elemento de los 5 donde el repo tiene **menos cobertura hoy**. La regla
actual de `AGENTS.md` (Design craft, regla #2) limita Emil al chrome del
market/builder ("nav, botones, popovers, toasts") y dice explícitamente que
el "scrollytelling cinematográfico... no se reemplaza por micro-UI". La
lección del curso pone micro-interacciones al mismo nivel que white
space/tipografía/jerarquía/imaginería como diferenciador high-end — no solo
en el chrome del market, sino **dentro de cada template vendible** (hover
states, feedback de click, transiciones entre estados de UI propia del
template: CTAs, cards, nav del template, form de contacto, etc.), que hoy no
tiene una regla explícita.

**Acción pendiente (no implementada, solo señalada):** cuando se pida
aplicar esto, extender el alcance de Emil/`emil-design-eng` más allá del
chrome del market para cubrir también la UI no-cinemática **dentro** de cada
template (botones, cards, nav, forms del propio SKU) — sin tocar el
scrollytelling GSAP, que sigue siendo dominio del cookbook. Esto es una
ampliación de regla existente, no un anti-patrón a revertir como el
Detalle #1.

**Ampliación — técnica concreta de white space (misma Lesson 1, ejemplo de
video walkthrough de un e-commerce de skate):**

> "Aunque la página es larga, no te sientes perdido porque cada sección está
> claramente definida por cambios de color, cambios de tipografía y
> márgenes generosos." / "the layout never feels crowded — the whitespace
> distribution directs the eye to focus on one thing at a time."

Dos reglas puntuales, no solo el principio genérico de "dejar aire":

1. **Wayfinding en páginas largas**: cada sección se marca como un bloque
   distinto por *combinación* de cambio de color de fondo + cambio de
   tipografía + márgenes generosos — no por un divider o borde. Es el mismo
   handoff que ya pide **P13** (overlap sin hard cut) pero aplicado a
   secciones de contenido/comercio normales, no solo a beats con pin/scrub.
2. **Un foco por vez**: la distribución del whitespace no es solo estética,
   es jerarquía — dirige la mirada a *una* cosa por sección/viewport en vez
   de competir por atención. Reforzar en Impeccable `critique`/`audit` como
   chequeo explícito ("¿esta sección tiene un solo foco claro?"), no solo
   "hay aire de sobra".

Relevancia directa para **commerce** (el ejemplo del curso es justo un grid
de e-commerce) y para cualquier template con secciones largas tipo catálogo
(listados, grids de producto, index pages).

**Regla adicional (misma Lesson 1):** *"el layout NO debe ser repetitivo
para nada"* — cada sección tiene que tener su propia composición (grid
distinto, ritmo distinto, peso de imagen vs. texto distinto), no la misma
estructura de columnas repetida con contenido diferente. Es la versión
"layout" del mismo anti-patrón que ya cubre `design-taste-frontend`
(taste-skill) para look genérico — pero acá aplicado específicamente a
**estructura/composición**, no a paleta/tipografía. Chequeo concreto para
Impeccable `audit`/`critique`: mirar el wireframe de la página completa y
preguntar si dos secciones consecutivas comparten el mismo layout — si sí,
variar (columna → full-bleed → grid asimétrico → texto centrado, etc.), el
mismo criterio que ya aplica RATIO/MONOLITH/FIZZ al alternar pin/scrub,
WebGL y contenido estático en vez de repetir un patrón.

### Detalle #3 — Walkthrough comparado: Shopify award-level vs. landscaping genérico (Lesson 1)

**Fuente:** mismo video de Lesson 1, tramo donde el instructor navega dos
sitios reales en vivo y va señalando técnicas puntuales en cada uno. Acá van
separadas la técnica (accionable) de la comparación (narrativa) — solo se
loguea lo primero.

#### A. Técnicas del sitio award-level (Shopify)

1. **Paleta acotada + negative space como default**: blacks, golds, creams.
   No es "poco color" porque falte trabajo, es la paleta completa del sitio.
   Mapea a `UI/UX Pro Max` (sistema de color) y al Design Read de una línea
   que pide `taste-skill` antes de inventar look.
2. **Aislamiento intencional de elementos clave**: el CTA y los numerales
   romanos de navegación tienen espacio de sobra alrededor **a propósito**,
   para que nada compita por atención — no es espacio "que sobró", es una
   decisión de foco. Mismo principio que "un foco por vez" ya logueado en
   Detalle #2, pero aplicado a elementos puntuales (CTA, marcadores de nav),
   no solo a secciones completas.
3. **Sección "Complexity Delegated" — motion coordinado**: texto en script
   ornamentado que atraviesa la pantalla + cards que entran en slide/pop
   mostrando ejemplos, paneles rectangulares que **se superponen entre sí**
   generando profundidad (no solo capas planas). Es composición tipo P6/P7
   (piezas que entran coordinadas) + superposición para profundidad, que hoy
   el cookbook no tiene como primitivo explícito de "cards apiladas con
   depth" — candidato a evaluar como variante de P7 o primitivo nuevo cuando
   se porte a un template concreto.
4. **Hover micro-interaction**: al pasar el mouse sobre un panel, reacciona
   con un scale o shift suave — "da la impresión de que la página está
   viva". Es exactamente el gap de micro-interacciones **dentro del
   template** que señala el Detalle #2 (hoy Emil solo cubre chrome del
   market) — este es un ejemplo concreto de dónde aplicarlo primero: cards/
   paneles interactivos de secciones tipo features/servicios.
5. **Jerarquía tipográfica de 3 niveles**: headline grande, subheading
   mediano, body chico, cada uno con weight/estilo propio; serif delicado
   contrastado con serif bold para guiar la narrativa. Mapea a `UI/UX Pro
   Max` + P8 (SplitText reveal) para el headline.
6. **Progresión tipo revista, no folleto**: el layout cambia a medida que
   se scrollea — nav vertical con **numerales romanos marcando "capítulos"**,
   imágenes full-bleed que llegan a los bordes, el fondo cambia para marcar
   secciones nuevas. El nav vertical con numeral/índice **ya tiene primitivo
   base en el repo: P11 (rail numérico, `docs/motion-cookbook.md`)** y
   emparenta con P7 (lista índice que crece) — evaluar portarlo como widget
   Beat (riel + seek) si un template lo pide, en vez de reinventar con
   tweens sueltos.
7. **Whitespace dirigido al CTA**: espacio amplio alrededor de cada botón de
   CTA hace obvio dónde hacer click — refuerza el punto 2, pero puntualizado
   en CTAs específicamente (no solo "elementos clave" en general).

#### B. Checklist de anti-patrones (sitio genérico tipo landscaping)

Útil como checklist negativo para Impeccable `audit`/`critique` — si un
template cae en 2+ de estos puntos, no pasa el estándar Awwwards ya descrito
en "Qué vendemos" (`AGENTS.md`):

- [ ] Layout boxy/cramped, sin aire entre elementos.
- [ ] Iconos genéricos (stock icon sets, sin dirección propia).
- [ ] Tipografía uniforme — sin jerarquía real de tamaños/pesos.
- [ ] Layout repetitivo, poca variación de ritmo/tono entre secciones (ver
      regla "layout NO repetitivo" arriba).
- [ ] Cero micro-interacciones — nada responde a la acción del usuario.
- [ ] Whitespace mínimo — las secciones se mezclan entre sí, nada resalta.
- [ ] CTAs compitiendo con otros elementos, fáciles de pasar por alto.
- [ ] Estructura idéntica a "cientos de otros sitios de negocios" — **esto
      es literalmente el mismo test que ya escribe `AGENTS.md` en "Qué
      vendemos"** ("¿esto podría estar en Awwwards... o es interchangeable
      con ThemeForest?"). El curso valida de forma independiente un
      criterio que el repo ya usaba — no hay conflicto acá, es la misma
      barra dicha con otras palabras.

#### Cierre de Lesson 1 (mismo video, tramo final)

Dos ideas puntuales del cierre que valen la pena fijar aparte porque son
citables tal cual, no solo repetición del principio general:

1. **Framing de "capítulo"**: el sitio cuenta una historia scrolleando,
   cada sección es su propio capítulo — el instructor lo compara con hojear
   una novela (Romeo and Juliet), y el nav lateral con numerales romanos
   **refuerza ese framing narrativo**, no es solo navegación. Esto sube de
   nivel el punto 6 del Detalle #3 (P11/rail numérico como "capítulos"): no
   es solo un patrón visual a portar, es la excusa narrativa completa para
   justificar por qué una página larga con secciones muy distintas entre sí
   se siente coherente en vez de desarmada — conecta directo con la regla
   "layout NO repetitivo" y con "wayfinding en páginas largas" ya logueadas.
2. **La cita que cierra el argumento del curso** (útil para no relitigar
   esto de vuelta si alguna vez se cuestiona el approach):
   > "The high-end site isn't using exotic technology. It's built with the
   > same tools you have access to. But every detail is considered... The
   > difference lies in the execution, not the technology... Cheap sites
   > cut corners and feel generic because they don't tell a story and guide
   > the user."

   Confirma explícitamente lo que ya es el principio rector de este doc
   (Detalle #2): no hace falta tooling exótico para subir de nivel un SKU
   existente, alcanza con aplicar con disciplina lo que ya está disponible
   en el repo (Impeccable, Emil, taste-skill, UI/UX Pro Max, cookbook,
   Beat) — el gap nunca fue de herramientas, es de ejecución consistente.

### Detalle #4 — Anatomía de un sitio premium por módulos repetibles (Lesson 2)

**Fuente:** Lesson 2 del curso, walkthrough de un real-estate site. Por
pedido explícito del usuario, acá van **solo los principios extraídos**, sin
nada del ejemplo puntual de la página (fotos de living, "flats"/townhouses,
etc.) — eso no se documenta, no aporta nada reusable.

1. **Macro white space ≠ micro white space**: el white space "macro" (entre
   bloques grandes de la página) dirige el ojo y ayuda a escanear, setea
   mood, invita curiosidad — es un rol distinto al white space "micro" ya
   logueado en Detalle #2/#3 (aislar un CTA puntual). Los dos hacen falta,
   en escalas distintas.
2. **Una acción primaria por sección** (citado como design best practice):
   cada sección/bloque de contenido tiene **un solo** CTA claro, no varios
   compitiendo. El botón se distingue por contraste + padding generoso; el
   hover confirma que es interactivo con un cambio sutil (color/estado) —
   ejemplo concreto más de micro-interacción **dentro del template** (mismo
   gap señalado en Detalle #2).
3. **Repetición deliberada de estructura *dentro* de un listado de mismo
   tipo — no confundir con "layout no repetitivo"**: cuando un módulo
   presenta varios ítems de la misma categoría (ej. distintas unidades de
   una misma tipología), reusar exactamente el mismo patrón (imagen grande +
   label corto + descripción + un CTA) en cada ítem **es la técnica
   correcta** — construye familiaridad y ritmo, el usuario deja de
   adivinar dónde mirar. Esto **no contradice** la regla de Lesson 1 ("el
   layout NO debe ser repetitivo") — esa regla aplica entre **secciones de
   tipo distinto** (hero vs. features vs. galería vs. footer); esta aplica
   **dentro** de un mismo módulo repetido para variar contenido, no
   composición. Los dos principios conviven: variar entre secciones, repetir
   dentro de un carrusel/listado.
4. **Jerarquía = tamaño + peso + espacio, asignados a propósito**: decidir
   qué tiene que verse primero y darle el mayor espacio y contraste;
   elementos secundarios (ej. thumbnails) pueden solo **insinuar** que hay
   más contenido sin necesitar que se haga click — profundidad por
   presencia, no por interacción obligatoria.
5. **Cierre grácil, no hard-sell**: la sección de cierre vuelve a un fondo
   sobrio, restablece la marca (wordmark/script grande), un único CTA
   discreto (ya visto antes en la nav, no uno nuevo insistente), y
   detalles/links secundarios en tipografía chica que no compiten porque
   están posicionados con sutileza, no porque estén escondidos.
6. **Transiciones y micro-interacciones usadas con moderación**: guían y
   confirman acciones, no reemplazan al contenido ni se usan por default en
   todo — refuerza (no contradice) "el scrollytelling no se reemplaza por
   micro-UI" ya escrito en `AGENTS.md`.
7. **El sitio completo es un vocabulario chico de módulos repetibles**:
   hero, content block (imagen + texto + CTA), pantalla de transición,
   cierre. La sofisticación percibida viene de **ejecutar bien pocos
   módulos**, no de tener cientos de piezas únicas — **esto valida
   directamente la filosofía de secciones componibles de SCROLLLAB**
   (`sectionRegistry.jsx`, el builder armando composiciones a partir de
   secciones independientes) ya existente en el repo.
8. **El hero se destaca por sí solo con navegación mínima**: del resumen de
   la lección — "the hero welcomed us with a strong visual and minimal
   navigation. It set the mood and hinted at the brand's promise." La nav
   discreta/mínima en el hero **no es un detalle menor**, es lo que le deja
   espacio al visual para pararse solo sin competir por atención — mismo
   principio de "aislamiento intencional" ya logueado (Detalle #3.2) pero
   aplicado puntualmente a la relación hero↔nav. Complementa (no reemplaza)
   el criterio ya anotado en Detalle #1 de que el hero tiene que evocar
   antes de leerse — acá el punto es *cómo* se logra ese protagonismo: sacando
   de encima todo lo que no sea el hero mismo, empezando por el nav.
9. **Imágenes de alta resolución que cuentan una historia**: de la lección
   — "these images are high quality, like extremely high quality, and tell
   a story." No es solo un requisito técnico de nitidez: la foto tiene que
   aportar narrativa, no ser relleno decorativo. Refuerza (no agrega regla
   nueva, pero la hace explícita) lo ya escrito en `AGENTS.md` sobre
   Higgsfield como default para piezas de imagen y la prohibición de picsum
   — y es motivo extra para no bajar la calidad de generación/upscale
   (`upscale_image`) en ningún SKU, incluso en placeholders.
10. **Receta de cierre de la lección** (checklist reusable):
   - Setear el mood con un hero fuerte.
   - Dividir la historia en secciones digeribles.
   - Transiciones + micro-interacciones para guiar, sin distraer.
   - Cerrar con un CTA simple y contundente.
   - Ingredientes: espaciado intencional, jerarquía clara, patrones
     consistentes, motion restringido — nada de esto requiere tooling caro.

### Detalle #5 — Motion como cornerstone (Lesson 3, ref. YK Produce)

**Fuente:** Lesson 3 del curso, walkthrough de un site (YK Produce) centrado
puntualmente en motion. Principios extraídos, mínima referencia al ejemplo.

1. **Zoom lento sobre foto estática = cinematográfico**: un gentle zoom
   (tipo Ken Burns) sobre una imagen fija. Ya tiene primitivo en el repo —
   **P2** (zoom/parallax con UI fija) en `docs/motion-cookbook.md` — no hace
   falta nada nuevo, solo aplicarlo con esta intención puntual en heroes/
   imágenes estáticas.
2. **Vocabulario de motion consistente y reducido — la regla central de la
   lección**: el headline "desliza hacia arriba" al scrollear, y el
   *siguiente* headline aparece con el **mismo** estilo — misma entrada,
   mismo timing. Los loaders y reveals de otras secciones/páginas del sitio
   reusan el mismo tipo de motion aunque la imaginería cambie. Consistencia
   en la animación **construye confianza**: el usuario aprende cómo se
   comporta la interfaz y se siente cómodo explorando. Cita textual: *"it's
   almost easier to implement than custom animation on every single page.
   Simplicity and repetition lead to quality."*
   - **Acción concreta cuando se implemente**: cada template debería
     declarar su propio vocabulario chico de motion (2-3 tipos: ej. fade +
     slide + tiny zoom) y reusarlo en todas las secciones, en vez de una
     animación de entrada distinta por sección. Es la versión "motion" del
     mismo principio de vocabulario reducido de módulos ya logueado en
     Detalle #4.7.
3. **Orden de aparición deliberado — texto antes que imagen**: en cada
   página, el texto más grande aparece primero, el texto secundario
   después, y las **imágenes entran después del texto** — le da al cerebro
   un momento para leer antes de mirar lo visual. Es una secuencia
   específica a respetar en los timelines GSAP de entrada (headline → sub →
   imagen), no solo "todo hace stagger junto".
4. **Micro-detalles conectores + progress rail**: puntos/líneas sutiles que
   atan la composición, y una **barra vertical delgada a un costado que
   trackea el progreso de scroll silenciosamente**. Esto es un widget
   nuevo a considerar — no es lo mismo que el nav de numerales romanos de
   Detalle #3.6 (que marca "capítulos"), es un **indicador continuo de
   progreso** (0→100% del scroll). Candidato a primitivo o a extensión de
   Beat/P11 cuando se implemente; evaluar si un mismo widget puede cumplir
   las dos funciones (capítulo + progreso) o si conviene separarlos.
5. **Timing deliberado genera anticipación — no instantáneo**: una pausa
   breve entre que el loader termina y aparece la imagen del hero crea
   anticipación; una pausa de **medio segundo** entre el heading y el
   subtítulo deja absorber las palabras antes de seguir. No es lentitud porque
   sí, es tiempo suficiente para apreciar el contenido.
   - **Candidato a token nuevo**: hoy `src/index.css` tiene tokens de
     *easing* (`--ease-out`, `--ease-in-out`, `--ease-drawer`) pero no un
     token de *delay* estándar para este patrón heading→subtítulo. Evaluar
     un delay convencional (~0.4–0.6s) cuando se implemente, en vez de
     valores sueltos por sección.
6. **Cero motion sin propósito**: nada rebota porque sí, no hay animaciones
   de fondo que distraigan del mensaje, el motion siempre está atado al
   contenido — invita, ordena la información, y **se quita del medio**.
   Extiende (no reemplaza) la regla ya escrita en `AGENTS.md` ("el
   scrollytelling... no se reemplaza por micro-UI") a **todo** motion
   decorativo del template, no solo al chrome del market.
7. **Cita de cierre, citable tal cual**: *"Good motion design is like good
   typography. If it's doing its job, you don't notice it, but you feel
   the effect."* Y la definición explícita de award-level motion de esta
   lección: *"not about complexity. It's about intention and control"* —
   movimientos lo más simples posible (fades, slides, tiny zooms) aplicados
   con consistencia, decidiendo cuándo mostrar y cuándo contener, movimiento
   pareado con quietud para que cada transición tenga sentido.
8. **Método práctico de arranque** (checklist reusable): decidir qué tiene
   que notarse primero → decidir el orden → sumar motion simple que guíe
   ese orden. Nada más. Mismo espíritu que la Receta de cierre de Detalle
   #4, aplicado específicamente a motion.

### Detalle #6 — Catálogo de micro-interacciones (Lesson 4)

**Fuente:** Lesson 4 del curso, walkthrough de un sitio de agencia. Por
pedido del usuario, acá va **solo el catálogo de micro-interacciones**
generalizado — qué es, cómo se construye, dónde aplica y por qué es
must-have — sin nada del sitio de ejemplo puntual.

**Por qué importa esta lección como conjunto:** cada micro-interacción
individual "puede parecer trivial vista sola" (cita del curso), pero el
efecto acumulado de aplicar el **mismo lenguaje de feedback en absolutamente
todo** (menú, botones, links, forms) es lo que reafirma la personalidad de
marca. Esto es la pieza que faltaba desde Detalle #2: ahí se señaló que
Emil/`emil-design-eng` hoy solo cubre chrome del market y que la UI *dentro*
de cada template no tenía regla explícita — este catálogo es el "cómo"
concreto para esa extensión pendiente.

| # | Micro-interacción | Trigger | Cómo se construye | Dónde en SCROLLLAB | Por qué es must-have |
|---|---|---|---|---|---|
| 1 | Botón con glow/outline sutil | hover | CSS transition en `box-shadow`/`outline`, sin JS | Botón de menú, cualquier botón icon-only (chrome **y** templates) | Señala interactividad sin gritar — el mínimo indispensable en cualquier elemento clickeable |
| 2 | Panel/drawer que entra deslizando | click | `translateX` + easing — el repo ya tiene el token `--ease-drawer` en `src/index.css`, usar ese | Nav lateral de templates con menú propio, no solo el chrome del market | Ya hay infraestructura lista, es gratis implementarlo bien |
| 3 | Underline que aparece en hover sobre links | hover | `::after` con `scaleX` 0→1 y `transform-origin`, o Motion for React | Nav, CTAs, "learn more" dentro de cualquier sección | El más barato de implementar y el más faltante hoy — mínimo viable de micro-interacción "dentro del template" |
| 4 | Stagger de líneas/párrafos al entrar en viewport | scroll into view | Ya existe **P8** (SplitText) en `motion-cookbook.md` — aplicar con delay entre líneas para dar "ritmo de lectura" | Bloques de texto largo en cualquier sección | No es primitivo nuevo, es una aplicación puntual de uno que ya está |
| 5 | Underline con variación de estilo por sección | hover | Mismo mecanismo que #3, con curva/origen distinto por sección (dentro del vocabulario chico de Detalle #5.2) | Secciones con "personalidad" propia (features vs. servicios vs. galería) | Da variedad sin salirse del sistema — variar la ejecución, no inventar un patrón nuevo por sección |
| 6 | Expand + zoom/glow sutil en items de lista | hover | `transform: scale()` + `box-shadow` transition; GSAP solo si hay overlap/depth | Grids de casos, portfolio, testimonios, catálogo (`commerce`) | Evita que listas largas se sientan planas — mismo espíritu que "un foco por vez" de Detalle #2 |
| 7 | Hero con blur→clear al cargar | load | CSS `filter: blur()` animado a `0`, o GSAP si hay más control de timing | Heroes con texto grande como elemento central | Alternativa de entrada dentro del vocabulario de Detalle #5.2 (no reemplaza fade/slide, es una tercera opción) |
| 8 | Parallax sutil (imagen se mueve distinto que el scroll) | scroll | Ya existe: **P2** en `motion-cookbook.md`. La clave del curso: "casi imperceptible" — no exagerar el ratio de desplazamiento | Imágenes junto a texto en secciones de contenido | No es primitivo nuevo — el matiz nuevo es la **intensidad**: sutil, no un parallax agresivo |
| 9 | Underline + rotación de ícono combinados en un mismo hover | hover | Dos transiciones CSS sincronizadas (underline `scaleX` + `rotate` del ícono/SVG) en el mismo `:hover` | CTAs principales tipo "empezar proyecto" / botones de cierre de sección | Combinar dos señales en un solo hover refuerza el CTA sin agregar texto ni peso visual |
| 10 | Fade-in de sección con timing individual (no uniforme) | scroll into view | GSAP ScrollTrigger — cada sección con su propia duración/delay, no un valor global copiado | Todas las secciones del template | Matiz sobre P13/Detalle #3.6: la progresión "revista" pide timing propio por sección, no una sola curva repetida |
| 11 | Hover en headings/subheadings (underline que se dibuja o cambio de weight) | hover | `::after` con `width` animado, o `font-variation-settings` transition si la tipografía es variable | Headings dentro del cuerpo de contenido (no solo el H1 del hero) | Decorativo pero refuerza la jerarquía tipográfica de forma interactiva, no solo estática |
| 12 | Accordion: ícono +/− que rota + expand/collapse suave | click | Ícono con `rotate(45deg)` transition; contenido con `grid-template-rows: 0fr → 1fr` (o GSAP `height: auto`) | FAQ, specs colapsables — cualquier sección con contenido opcional (`contact`, `commerce`) | Patrón estándar de la industria — su ausencia en un FAQ se nota como genérico/desactualizado |
| 13 | Floating label + underline en foco de campo de formulario | focus | CSS `:focus` + `:not(:placeholder-shown)` para mover el label; `border-color`/`width` transition en la línea inferior | Cualquier form (`contact`, checkout) — **la misma animación exacta en todos los campos**, sin excepción | Guía sin instrucciones — mínimo viable de un form que se sienta cuidado, no un `<input>` default del browser |
| 14 | Ícono que se rellena (stroke→fill) en botón de submit/CTA final | hover | SVG con `fill`/`stroke` animado vía CSS o GSAP | Botón de envío de cualquier form, CTA de cierre de sección | Consistencia con el resto de botones del sitio — mismo lenguaje visual de principio a fin |
| — | **Consistencia total entre todas las anteriores** (meta-principio, no una técnica en sí) | — | No es una técnica nueva: es reusar exactamente los mismos patrones 1–14 en cada instancia del sitio, sin variar la firma de cada una | Todo el SKU, de punta a punta | Es lo que convierte 14 detalles "triviales vistos uno por uno" en una sensación de marca coherente — mismo argumento del vocabulario reducido de Detalle #4.7 y #5.2, aplicado a micro-interacciones |

**Acción pendiente cuando se implemente** (cierra el gap de Detalle #2):
extender `AGENTS.md` regla #2 (hoy: "Emil... chrome del market + micro-
interacciones de templates: nav, botones, popovers, toasts") para que
explícitamente cubra este catálogo dentro de cualquier sección vendible, no
solo el chrome — usando los tokens de easing ya existentes (`--ease-out`,
`--ease-drawer`) como base común para que el catálogo completo comparta
timing, no solo estilo visual.

#### Cierre de Lesson 4

Citas de cierre que vale la pena fijar tal cual, complementan (no repiten)
el catálogo de arriba:

> "Interaction isn't just clicking a button. It's how the button reacts
> when you hover, how the page transitions when you scroll, and how the
> form responds when you type."

Redefine "interacción" para el estándar award-level: no es el evento click,
es la suma de reacciones en cada punto de contacto (hover, scroll, type).
Ningún ítem del catálogo #6 es opcional bajo esta definición — cada uno es
una de esas reacciones.

> "A polished site is not built with one big effect. It's crafted from
> countless small moments... Treat every hover and every scroll as an
> opportunity to delight the user and reinforce your brand."

Confirma explícitamente el meta-principio ya logueado arriba (consistencia
antes que cantidad de efectos): no hay una sola micro-interacción "hero" que
salve el resto, es la suma prolija de todas.

> "Every time you move your cursor, the site acknowledges your presence.
> Small animations give you a sense of control and connection, making the
> experience feel personal."

Framing psicológico nuevo, no solo estético: el feedback constante
(incluido el feedback *ambiente*, no solo en elementos puntuales) genera
sensación de control — argumento extra para no dejar ningún link/botón/
campo del catálogo sin su reacción correspondiente.

### Detalle #7 — Animaciones puntuales desarmadas + principios de timing (Lesson 5)

**Fuente:** Lesson 5 del curso. Acá van las animaciones nombradas por el
instructor, **desarmadas una por una** (pedido explícito del usuario), sin
la narrativa del sitio de ejemplo.

**Las 7 animaciones, desarmadas:**

- **Fade in / slide up de elementos**: transform básico (`translateY` +
  `opacity`) al entrar en viewport. No es primitivo nuevo — es la base más
  simple del vocabulario chico ya logueado en Detalle #5.2. El punto del
  curso acá no es la técnica (trivial), es que se **reusa igual en todo el
  sitio** sin variarla porque sí.
- **Listas que aparecen con delay leve entre ítems**: stagger clásico. Ya
  cubierto por **P8** (SplitText) y por el punto #6.4 del catálogo de
  micro-interacciones — mismo primitivo, tercera vez que aparece en el
  curso, confirma que es un básico no-negociable.
- **Cross-fade de *color* entre secciones** (no de imagen): a diferencia de
  **P3** (que es crossfade de capas/imagen), esto es específicamente el
  **fondo de la sección** transicionando de color en vez de cortar en seco
  al cambiar de sección — técnica concreta para el handoff de **P13**
  (overlap sin hard cut): animar `background-color` durante el scroll de
  transición, no solo superponer contenido.
- **Forma grande señalando una transición** (el instructor menciona un
  anillo/círculo azul): esto **ya es P4** (disco / zoom-through circular,
  `rounded-full` `scale 0→1`, bg = color de la sección siguiente) tal cual
  está documentado en `motion-cookbook.md` — no hay nada nuevo que anotar,
  es confirmación de que P4 es exactamente esta técnica vista "en la
  vida real" en otro sitio de referencia.
- **Label lateral que se desliza a su posición** (ej. un tag/kicker tipo
  "Everlasting Story"): un elemento chico de contexto (etiqueta, categoría,
  nombre de proyecto) que entra con un translate corto hasta anclarse en un
  costado de la sección. No es un primitivo nuevo (es P1/fade-slide básico
  aplicado a un elemento pequeño), pero vale la pena nombrarlo como patrón
  reconocible — "kicker label" — para no reinventar el nombre cada vez que
  aparezca en un template.
- **Hover effects mínimos y restringidos**: refuerza (tercera vez en el
  curso) el principio de "cero motion sin propósito" ya logueado en
  Detalle #5.6 — hover discreto, no un festival de efectos por elemento.
- **Header/nav con texto que cambia según la sección activa** (⭐ el punto
  que el usuario pidió destacar en detalle): en algún momento de la
  lección, un texto en el header **cambia** cuando el scroll llega a una
  sección nueva — el header no es estático, refleja "dónde estás" en la
  página. Es distinto a todo lo ya logueado:
  - No es el nav de numerales romanos de Detalle #3.6 (eso marca
    "capítulos" con un índice fijo).
  - No es la progress rail de Detalle #5.4 (eso es un indicador continuo
    0→100%, no texto).
  - Esto es un **label de texto en el header que se actualiza por
    sección** — ej. el header podría decir "Inicio" en el hero y cambiar a
    "Nuestro trabajo" al entrar a la sección de portfolio, sin que el
    usuario haga click en nada.
  - **Cómo se construiría** (no implementado, solo el approach): un
    `ScrollTrigger` por sección con `onEnter`/`onEnterBack` que actualiza
    un único nodo de texto en el header (mismo mecanismo que ya usa **P11**
    para el proxy numérico, pero con un string en vez de un número) — o,
    si el header ya vive en React, un `IntersectionObserver`/`ScrollTrigger`
    que setea qué sección está "activa" y el header renderiza el label
    correspondiente. Transición del texto: swap simple con fade, o
    SplitText (P8) si se quiere que el cambio de label tenga su propio
    micro-momento.
  - **Por qué es valioso**: es wayfinding activo, no pasivo — profundiza el
    principio de "página larga sin sentirse perdido" ya logueado en
    Detalle #2 (ahí era color+tipografía+márgenes marcando la sección;
    esto es el header mismo confirmando en qué parte de la historia estás).
    Combina bien con el framing de "capítulo a capítulo" de Detalle #3.6.
  - **Candidato a primitivo nuevo** en `docs/motion-cookbook.md` cuando se
    implemente — no encaja limpio en ninguno de los P1–P14 existentes.

**Principios de timing citados textualmente** (los 4 takeaways de cierre de
la lección, útiles como criterio de aceptación, no solo inspiración):

> "Motion is not random decoration. It guides the eye and supports the
> story."

> "Timing creates the premium feel."

> "Delays and staggered sequences make simple animations feel elegant."

> "Flow connects sections through consistent patterns and soft transitions."

Y el método práctico de cierre: para cada elemento nuevo que se anima,
preguntarse **cómo entra y sale, qué tan rápido se mueve, y cómo se
relaciona con los elementos de alrededor** — no animar aislado, animar en
relación al resto de la escena.

### Detalle #8 — Blueprint de página narrativa de 5 beats (Lesson 6)

**Fuente:** Lesson 6, ejercicio de "armar un plan" combinando piezas de
varias referencias reales del curso (menciona "demo", "Singer" y
"Portland" como fuentes de cada sección puntual). Es un blueprint completo
de página, no una técnica aislada — por eso además de logueado acá va
referenciado en "Templates nuevos" más abajo.

**El framework narrativo (5 beats):** Hook → Introduce → Offer → Explain →
Invite. Cada sección de la página cumple **un solo** rol narrativo — mismo
principio de "una acción/foco por sección" ya logueado en Detalle #4.2,
aplicado acá al nivel de la página completa, no de un módulo individual.

**Las 5 secciones, desarmadas:**

1. **Hero (Hook)**: video o foto que capture el mood de marca, logo chico y
   discreto, una sola línea de valor, **un solo botón** a la acción
   primaria (ej. "Contact us"). No sobrecargar — el hero solo setea mood y
   enfoca atención, no vende. Medio y copy tienen que matchear la emoción
   que se sostiene en el resto de la página. Coincide con todo lo ya
   logueado en Detalle #1 (evocar antes de leer) y #4.8 (nav mínima,
   protagonismo del hero) — nada nuevo acá, es la misma regla aplicada al
   punto de partida del plan.
2. **Introducción estilo collage (Introduce)**: una sola oración sobre
   quién sos y por qué existís, rodeada de fotos chicas que **se
   superponen levemente al texto** — la lección lo nombra explícitamente:
   "that imperfection makes it human and unique." Transición de lo general
   (hero) a lo personal (historia). Técnica nueva no logueada antes: el
   overlap deliberado imagen↔texto como recurso de humanización, distinto
   del overlap de profundidad entre paneles de Detalle #3.3.
3. **Grid de ofrecimientos, 3 cards (Offer)**: cada card = imagen + título
   + descripción concisa. Reglas puntuales:
   - Si la foto del producto es "ruidosa", agregar un **overlay oscuro con
     transparencia** para que el texto siga siendo legible — a la vez
     agrega profundidad a la foto. Técnica concreta y simple, aplicable a
     cualquier card con imagen de fondo + texto encima en el catálogo.
   - Si hay más de 3 ítems: agregar otra fila, o pasar a un layout de 4
     cards — nunca forzar todo en una fila.
   - **Nunca autoplay de sliders** — la meta es claridad, que el visitante
     entienda la oferta de un vistazo. Es una prohibición explícita, no una
     preferencia.
   - Si hay muchos ítems, agruparlos para que **cada fila cuente algo**, no
     una lista plana.
   - Tamaños de imagen consistentes entre cards — evita "caos visual".
4. **Sección de valor, dos columnas (Explain)**: columna izquierda =
   statement contundente sobre filosofía/proceso; columna derecha = imagen
   que lo ilustra; párrafo corto debajo del headline para profundidad.
   Botón opcional — **solo si aporta un propósito real**, nunca obligatorio,
   y si existe debe quedar secundario (no compite con el CTA de cierre).
   Es sobre **conexión, no conversión** — un respiro después del grid
   cargado de la sección anterior, para "dejar que el visitante respire".
   Construye confianza, no vende. Statement memorable, imagen que se sienta
   real (no stock genérico — reconecta con Detalle #4.9, imágenes que
   cuentan una historia).
5. **CTA de cierre (Invite)**: fondo full-width (foto fija o video si la
   marca lo permite), invitación fuerte tipo "start your journey today" o
   "let's build something together", una oración de apoyo debajo, **un
   solo botón** al objetivo de conversión. Todo centrado, simple. Es lo
   último que ve el visitante — tiene que dejar una **elección clara**, no
   varias opciones compitiendo (mismo principio de Detalle #4.2/#4.5
   aplicado al cierre de toda la página, no solo de una sección).

**El principio más valioso de la lección — exclusión deliberada:** el plan
final **deja afuera a propósito** videos extra, sliders complejos y
secciones redundantes. Cita textual: *"By choosing only what supports the
story, you make the build easier and the site more premium and clearer."*
Es el mismo principio de vocabulario reducido ya logueado en Detalle #4.7 y
#5.2 (módulos y motion), pero llevado un nivel más arriba: acá aplica a la
**decisión de qué secciones incluye la página entera**, no solo a qué
módulos o qué tipos de motion se repiten dentro de ella.

**Pregunta de cierre para usar cualquier referencia** (método reusable, no
solo para esta página puntual):

> "When you pull from references, ask yourself: why does each element work,
> and does it fit your story?"

Es una versión operacionalizada del Design Read de una línea que ya pide
`taste-skill` — antes de copiar un elemento de una referencia, justificar
por qué funciona y si encaja en el plan, no copiarlo porque se ve bien
aislado.

**Cómo usar esto en SCROLLLAB** (sin implementar todavía, quedan dos
caminos abiertos, a decidir cuando se pida):

- **Como template nuevo**: un SKU "landing narrativa" completo con estas 5
  secciones como base — candidato anotado en "Templates nuevos" abajo.
- **Como checklist de estructura transpolable**: aplicar el framework de 5
  beats (Hook/Introduce/Offer/Explain/Invite) como lente de revisión sobre
  templates existentes que ya tengan una intención similar (ej. `atelier`,
  `signal`, cualquier landing de servicios) — sin necesariamente adoptar el
  layout exacto de cada sección, solo el criterio de "cada sección cumple
  un rol narrativo, y lo que no sirve a la historia se saca".

## Aplicación a templates existentes

Checklist de templates a revisar contra los conceptos del curso una vez que
haya contenido cargado (`src/components/sections/<sku>/`):

- [ ] atelier
- [ ] atrium
- [ ] chapters
- [ ] comic
- [ ] commerce
- [ ] constellation
- [ ] contact
- [ ] fizz
- [ ] monolith
- [ ] nocturne
- [ ] plum
- [ ] ratio
- [ ] signal
- [ ] unity
- [ ] velocity

## Templates nuevos

Conceptos que ameritan un SKU nuevo (no un ajuste a uno existente) van acá,
con el flujo estándar de `AGENTS.md` (`analyze:ref`, template-image-designer,
Beat/WebGL según corresponda) una vez que haya una referencia concreta.

- **Tres direcciones de escena para el hero de Module 6** (pág. 11 del PDF,
  "Try a different direction" — referencias reales usadas en el curso):
  - **Wider reveal** (ref. Naveera) — arranca cerca de un vehículo/objeto
    único y al hacer scroll se aleja revelando una red más amplia (rutas,
    sistema, conexiones). Sirve para logística, transporte, infraestructura.
  - **Camera journey** (ref. Delphi Markets) — recorrido de cámara entre
    edificios hacia un skyline abierto; el headline explica la oferta
    mientras el setting construye el mood. Sirve cuando el lugar/ciudad es
    parte de la historia (fintech, real estate, city-focused).
  - **Object reveal** (ref. Georgie's Aesthetics) — un objeto con buena luz
    es el foco, arranca en plano abierto y cierra en un detalle; puede
    combinarse con la variante "reveal por texto" (palabra grande detrás de
    la que se ve la escena). Sirve para producto único / aesthetics /
    e-commerce premium.
  - Las tres son variaciones del mismo motor (hero de Module 6, ver Detalle
    #1); no son SKUs nuevos por sí solas sino **briefs de escena** para
    aplicar el mismo hero a rubros distintos. Evaluar si alguna amerita un
    SKU dedicado cuando se implemente el primero y se vea qué tan
    reusable/parametrizable queda el componente.

- **Landing narrativa de 5 secciones** (Lesson 6, ver Detalle #8 arriba) —
  candidato a SKU nuevo, distinto de los templates scrollytelling
  cinematográficos que ya tiene el catálogo (RATIO/MONOLITH/FIZZ, etc.):
  este es más cercano a una **landing de servicios/agencia**, con foco en
  estructura narrativa clara y disciplina de contenido (nada de pin/scrub
  pesado obligatorio). Hero → collage intro → grid de 3 ofrecimientos →
  valor de dos columnas → CTA de cierre. Encaja bien como SKU "entry-level"
  del catálogo (o como base del builder para quien arma un sitio de
  servicios) precisamente porque **no** depende de Beat/WebGL para verse
  premium — la calidad viene de estructura + motion vocabulario chico +
  micro-interacciones (Detalle #4–#7), no de una escena firme 3D. Sirve
  también como caso de prueba para el filtro "¿de verdad hace falta Canvas/
  WebGL acá?" de `AGENTS.md` ("Qué vendemos") — este template pasaría la
  barra Awwwards sin esa capa.
