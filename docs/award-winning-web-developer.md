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

## Log de conceptos

| # | Concepto | Principio / por qué | Dónde aplica en SCROLLLAB | Estado |
|---|---|---|---|---|
| 1 | Hero de video controlado por scroll ("Make the hero move with scroll", Module 6) | Scroll adelante = avanza la escena, parar = congela, scroll atrás = rebobina. Pipeline: brief beginning/middle/end → imagen IA → imagen-a-video (Higgsfield) → still del primer frame como poster → wire al scroll | Toca `docs/scroll-media.md` — ver detalle abajo | Documentado — implementación pendiente de que el usuario la pida |
| 2 | Básico vs. high-end: white space, tipografía, jerarquía, imaginería y **micro-interacciones** (Lesson 1) | Lo que separa un sitio "de template" de uno premium no es la herramienta ni la complejidad técnica, es la ejecución intencional de esos 5 elementos + crear una experiencia memorable | Transversal a **todos** los templates — Design craft (Impeccable/Emil/taste-skill/UI-UX Pro Max) en `AGENTS.md`, ver detalle abajo | Documentado — es un lente de evaluación, no una tarea puntual |

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
