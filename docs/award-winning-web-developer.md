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
- [ ] Elementos clave (CTA, marcadores de nav) con espacio de sobra
      **a propósito**, para que nada compita por atención.
- [ ] Un foco claro por sección/viewport — el whitespace dirige la mirada,
      no solo "hay aire".
- [ ] Jerarquía tipográfica de mínimo 3 niveles, con contraste de estilo
      entre ellos (no todo el mismo peso).
- [ ] Cada sección tiene su propia composición — **el layout nunca se
      repite** entre dos secciones consecutivas (grid, ritmo, peso
      imagen/texto distintos).
- [ ] Secciones marcadas por combo color + tipografía + márgenes, no por
      un divider/borde — página larga sin sensación de estar perdido.
- [ ] Micro-interacciones **dentro del template** (hover, click feedback en
      cards/paneles/CTAs propios del SKU), no solo en el chrome del market.
- [ ] Sensación de progresión "capítulo a capítulo" al scrollear, no de
      folleto — si hay nav/índice lateral, evaluar P11 (rail numérico) /
      Beat en vez de un nav estático.

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
