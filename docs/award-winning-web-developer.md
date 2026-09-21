# The Award-Winning Web Developer — notas del curso

> Curso pago del usuario, no público. Los conceptos se pegan en el chat a medida
> que se cursan y se documentan acá: es el espejo en el repo que alimenta
> templates nuevos y la revisión de los existentes contra el estándar Awwwards
> (ver "Qué vendemos" en `AGENTS.md`).

## Cómo se usa

1. El usuario pega un concepto/lección del curso en el chat (texto, snippet,
   captura descripta, lo que sea).
2. Se agrega una fila a la tabla de log de abajo: principio, por qué importa
   para el estándar award-level, y dónde pega en SCROLLLAB (Beat, WebGL,
   cookbook de motion, UI/UX Pro Max, chrome del builder, etc.).
3. Si el concepto es accionable sobre un template existente, se anota en
   "Aplicación a templates existentes" y se ejecuta como tarea aparte (no se
   mezcla el dump de notas con el refactor de código en el mismo commit salvo
   que el usuario lo pida así).
4. Si el concepto es un primitivo de motion nuevo, referenciar/promover a
   `docs/motion-cookbook.md` en vez de duplicarlo acá.

## Log de conceptos

| # | Concepto | Principio / por qué | Dónde aplica en SCROLLLAB | Estado |
|---|---|---|---|---|
| 1 | Hero de video controlado por scroll ("Make the hero move with scroll", Module 6) | Scroll adelante = avanza la escena, parar = congela, scroll atrás = rebobina. Pipeline: brief beginning/middle/end → imagen IA → imagen-a-video (Higgsfield) → still del primer frame como poster → wire al scroll | **Conflicto con `docs/scroll-media.md`** — ver detalle abajo | ⚠️ pendiente de reconciliar antes de aplicar |

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

**⚠️ Conflicto a resolver antes de portarlo a un template:**

El curso conecta el scroll directo a `<video currentTime = progress *
duration>`. `docs/scroll-media.md` (sección "Por qué canvas 2D y no `<img
src>` ni `<video>`", líneas 119–127) marca esto como **anti-patrón** en
SCROLLLAB: seek asíncrono, no frame-exacto, se rompe en Safari. La Familia B
del repo (estilo pear.no) exige extraer fotogramas del clip con `ffmpeg` y
pintarlos en canvas 2D según `progress` (P1 + `drawImage`), no scrubear el
elemento `<video>` en vivo.

**Reconciliación propuesta** (no implementada todavía, queda para cuando se
aplique a un template real):

1. Usar el pipeline del curso tal cual para el **arte**: brief de escena →
   imagen IA (con la regla del tercio muerto) → Higgsfield img2video →
   aprobar el clip.
2. En vez de servir el `.mp4` al `<video>` y scrubear `currentTime`,
   extraerlo a WebP con `ffmpeg` (mismo pipeline que ya documenta
   `scroll-media.md`: `ffmpeg -i clip.mp4 -vf "fps=24,scale=…" frame-%04d.png`
   → `cwebp`) y montarlo como Familia B: canvas 2D + `drawImage` por
   `frameIndex`.
3. El resto del guion del curso (poster del primer frame, hold exacto al
   parar, reverse, mobile estático, reduced motion, checklist de cierre) se
   aplica **igual**, es agnóstico a si el medio final es `<video>` o canvas
   2D — de hecho ya coincide con las reglas de performance de
   `scroll-media.md` (frame estático en reduced motion, primer frame con
   `fetchPriority: high`).
4. La variante "reveal por texto" (mask que crece) es la única pieza sin
   home todavía — evaluar como candidato a primitivo nuevo en
   `docs/motion-cookbook.md` cuando haya un template concreto que lo pida.

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
