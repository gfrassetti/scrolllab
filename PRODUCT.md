---
impeccable:product-schema: 1
---

# SCROLL LAB

## Positioning

**Primary users:** desarrolladores front-end / creativos técnicos que necesitan demos scrollytelling de nivel portfolio (Awwwards / site of the day) y trabajan el código ellos mismos — no usuarios no-code.

**Job to be done:** comprar un modelo o composición lista, bajar un ZIP con fuente React/Vite, y usarlo como base de un sitio de referencia propio (tipografía con intención, scroll coreografiado, Canvas/WebGL cuando el efecto lo pide).

**Differentiation:** no es ThemeForest ni un builder visual. Cada modelo es una demo cinematográfica original; el listón es award-level. La compra entrega código fuente + LICENSE watermarked (orden/email), no un tema genérico.

**Category / anti-category:** marketplace de templates scrollytelling de alto craft · no plantillas Bootstrap con animaciones leves · no Wix/Framer-for-non-devs.

## Product depth

**Primary job + frequency:** descubrir, componer (builder), comprar y descargar demos; uso puntual por proyecto (compra) y recorridos de exploración en el catálogo/builder.

**Failure modes that matter:**
- El ZIP no arranca (`npm run dev` / build) — confianza rota.
- Checkout / webhook / descarga fallan — no reciben lo pagado.
- Preview del builder que miente sobre el resultado (SplitText / props).
- Templates que se sienten “ThemeForest” — destruyen el posicionamiento.

**Complexity the UI must absorb:** catálogo multi-modelo, builder por secciones (hasta 30 + kit commerce), carrito, auth, Mercado Pago, cuenta/descargas, i18n (chrome ES rioplatense / contenido demo EN).

**Emotional register:** craft serio, atmósfera, confianza de “esto es código de verdad” — no juguete no-code ni dashboard corporativo.

## Users & jobs

| Priority | Who | Job |
|---|---|---|
| Primary | Dev front-end / creative technologist | Elegir o componer una demo award-level y llevarse fuente usable |
| Secondary | Estudio / freelance que vende sitios | Acelerar delivery con base cinematográfica licenciada |
| Tertiary | Visitante curioso | Entender la marca y el nivel visual sin comprar aún |

## Brand

**Personality:** editorial, preciso, cinematográfico, con voz rioplatense en el chrome del producto (“vos”).

**Tone of voice:** directo, craft-first, sin marketing vacío. Tagline: *Solo scrolleá.* Nombre de marca: **SCROLL LAB** (`src/lib/site.js`). Soporte: `hola@scrolllab.com.ar`. Dominio: `https://www.scrolllab.com.ar`.

**Emotional goals:** que el comprador sienta “esto podría estar en Awwwards” y que el marketplace se sienta a la altura de lo que vende.

## Constraints

- **Platform:** web (SPA Vite + React 19; API Express).
- **Technical:** Tailwind CSS v4, GSAP 3 + Lenis, Three.js cuando aplica; MongoDB + Passport Google OAuth + Mercado Pago Checkout Pro; precios validados solo en servidor.
- **Language:** chrome del marketplace en español rioplatense; placeholders de templates en inglés.
- **Legal / licensing:** ZIP + LICENSE watermarked; no ofuscar JSX vendido.
- **Accessibility / motion:** respetar `prefers-reduced-motion` en secciones pesadas.
- **Incumbent visual system:** el look actual del marketplace y de cada modelo (chapters, nocturne, monolith, atelier, fizz, velocity, commerce, etc.) es autoridad visual hasta un redesign explícito. `DESIGN.md` aún no documenta ese sistema — gap de documentación, no licencia para reinventar.

## Competition

| Competitor | They own | We own |
|---|---|---|
| ThemeForest / Envato-style packs | Volumen, precio bajo, layouts genéricos | Originalidad, scroll/WebGL, código pensado para portfolio |
| Builders no-code (Framer/Wix) | Facilidad sin código | Fuente React/Vite para developers |
| Demos Awwwards one-off | Prestigio de un solo site | Catálogo + builder + entrega comercial |

## Open questions

- Documentar el sistema visual del marketplace (y límites por modelo) en `DESIGN.md` vía `/impeccable document` — pendiente.
- Boost de precio “Awwwards” por tramo en el builder — decisión de producto en espera.
- Live mode Impeccable configurado; CSP del API (Helmet) puede requerir allowlist en dev si se usa live sobre páginas servidas detrás de la API.
