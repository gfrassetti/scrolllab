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

- *(pendiente)*
