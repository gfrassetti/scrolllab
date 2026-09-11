# SIGNAL — análisis de referencia

**SKU:** `signal` (WIP — `LOCAL_ONLY_SKUS` + `BUILDER_HIDDEN_SKUS` en `src/lib/pricing.js`, mismo estado que `ratio`/`plum`. Sin registrar en `server/` todavía: no hay checkout, sigue el precedente de PLUM, no el de RATIO.)

**Ruta:** `/templates/signal` — reachable en prod por URL directa (a pedido del usuario, para dar feedback contra el deploy real), pero **sin listar**: no está en `TEMPLATE_META` de `TemplatesIndex.jsx`, no entra a la paleta del builder (`BUILDER_HIDDEN_SKUS`), no está en `public/sitemap.xml`, y `public/robots.txt` la desindexa explícitamente. Ver `src/App.jsx`.

## Referencia

- Awwwards: [Pixelated Image Reveal](https://www.awwwards.com/inspiration/pixelated-image-reveal-dolsten-co) — sitio real: Dolsten & Co (`dolsten.com`).
- El usuario pegó el `<body>` completo renderizado (DevTools) y el panel de red (assets); no hubo `analyze:ref` automático porque `www.awwwards.com` está bloqueado por el proxy de este entorno (egress policy) y `dolsten.com` no se navegó en vivo — todo el análisis sale del HTML/CSS/JS pegado.
- Referencia técnica del método canvas 2D dot-matrix que se consideró primero (descartada, ver abajo): <https://github.com/praveentewatia26/award-grade/blob/main/references/ascii-dot-matrix-art.md>.

## Corrección de rumbo (importante)

El pedido original era "un template nuevo usando `<canvas>`". Al inspeccionar el HTML real de Dolsten, el efecto de firma ("pixelated image reveal") **no usa canvas**: es una grilla de `<div>` (7×7, script "Cards Image Pixels") que GSAP hace desaparecer con `stagger: {each:0.01, from:'random'}` al entrar en viewport — DOM + GSAP puro, coherente con el cookbook P1–P14 (`docs/motion-cookbook.md`). Se abandonó la idea de un motor `src/lib/canvas/` porque la referencia real no lo pedía; en su lugar se portó la técnica tal cual (DOM, no canvas).

## Límite de IP (obligatorio, confirmado con el usuario)

SCROLLLAB vende demos **originales** (`AGENTS.md` → "Qué vendemos"). Dolsten & Co es una agencia real con clientes reales (BMW, Spotify, Volkswagen, Heineken, Autodesk) y premios reales (Emmy, Cannes Lions, D&AD) citados en su propio HTML. Se portó **la técnica de motion únicamente**:

- ✅ Mecánica del pixel-reveal (grilla de tiles, stagger random, `ScrollTrigger once`)
- ✅ Mecánica del word-cycle (SplitText chars, blur+yPercent in, hold, swap al siguiente)
- ❌ Nombre de marca, copy verbatim, logos de cliente (son marcas registradas), conteo de premios reales

Mundo propio para SIGNAL: estudio de motion & sound design (no "agencia de IA" — evita pisar el positioning textual de Dolsten). Copy placeholder en inglés, sin logos de clientes reales ni afirmaciones de premios.

## Beats portados

| Beat Dolsten | Técnica | Dónde en SIGNAL |
|---|---|---|
| Hero "We make AI ___" — swap-title con SplitText chars, timeline `+=1.5` entre palabras, `ScrollTrigger once` | Word-cycle kinético, timed (no scrub) | `src/components/sections/signal/HeroSignal.jsx` |
| `section_intro` — heading con blur-reveal por palabra + marquee de logos de cliente | Blur-reveal por palabra (SplitText `words`) + marquee en loop, logos → chips de texto genéricos (sin marcas de terceros) | `src/components/sections/signal/ManifestoMarquee.jsx` |
| `section_awards` — cifras/logos con swap vertical en loop | Contadores que suben al entrar (`ScrollTrigger once` + proxy tweened), mismo idiom que `atrium/StatField.jsx`; números placeholder de un estudio ficticio, no una afirmación real | `src/components/sections/signal/RecognitionStats.jsx` |
| "Cards Image Pixels" — grilla 7×7 de divs, `gsap.to(pixels, {opacity:0, stagger:{each:0.01, from:'random'}})`, `once:true` | Pixel-reveal DOM | `src/components/sections/signal/PixelRevealGrid.jsx` |
| `accordion-css` — `grid-template-rows` 0fr→1fr por item | Accordion `height:'auto'` vía GSAP, mismo idiom que `components/FaqAccordion.jsx` | `src/components/sections/signal/ServicesAccordion.jsx` |

### Todavía no portado (necesita crédito de Higgsfield — sin confirmar con el usuario)

- Hero de video cruzado (dos `<video>` en handoff). De momento el hero es tipográfico puro sobre fondo sólido, sin video.
- Grid de "work" con hover-to-play de video (bunny-player). El pixel-reveal grid cubre el rol de "case studies", pero con foto fija, no clip.

Ninguno de los dos depende de la mecánica en sí (son genéricas y ya probadas en el repo) — dependen de tener material de video real, que no se genera sin confirmar consumo de créditos primero.

## Assets

Higgsfield (`generate_image`, `gpt_image_2`), sin picsum:

- `assets/motion-01.webp` — trazos de luz cian/ámbar alrededor de una forma geométrica oscura. Tarjeta "Motion study".
- `assets/material-01.webp` — manos pasando un rodillo de tinta sobre un marco de serigrafía. Tarjeta "Material study" (asset generado antes del pivote de concepto; reencuadrado genéricamente, sin cara visible).

Créditos de Higgsfield agotados a mitad de la generación (2 de 3 pedidos fallaron: "Out of credits on starter plan"). Quedan 2 tarjetas reales; el componente acepta un array `cards` para sumar más cuando haya créditos.

## Nota Obsidian / graphify

Esta sesión corre en un contenedor de nube: no tiene acceso a `C:\Users\Guido\Documents\Obsidian\ScrollLab` ni al binario `graphify` (herramientas locales de tu máquina). Este documento es el registro que reemplaza la nota de Obsidian hasta que corras `graphify export obsidian --graph graphify-out/graph.json --dir "C:\Users\Guido\Documents\Obsidian\ScrollLab"` vos mismo.
