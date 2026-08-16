# RATIO — mapa de port

Referencia de motion: https://grids.obys.agency/  
SKU: `ratio` · mundo propio (construcción / medida), copy placeholder en inglés.

El overlay de grilla de la ref **no** se porta. El crazy mode sí: interruptor **Rupture**.

| Beat (ref) | Primitivo | Sección |
|---|---|---|
| 0–8 — dos bandas; cubo y letras en `offset-path` | P1 (pin) + Beat `seek` | `HeroTools` (motor: `src/lib/beat/engine.js`) |
| 9–11 — 4 cartas apiladas, zoom ~9× | P1 + P2 zoom-through | `FourPlates` |
| 12–16 — 01 columns + caso + notes | P1 + P2 + P3 | `PlateStudy` ×01 |
| 17–21 — 02 van de graaf | P1 + P2 + P3 | `PlateStudy` ×02 |
| 22–23 — don't be afraid / to break | P1 + P8, módulos | `BreakRules` |
| 26–30 — 03 rectangular | P1 + P2 + P3 | `PlateStudy` ×03 |
| 31–35 — 04 others | P1 + P2 + P3 | `PlateStudy` ×04 |
| 36–37 — don't take it too seriously | P1 + P8 | `BreakRules` (2ª) |
| 38–39 — books & credits | P6 spines + outline type | `FooterLedger` |

Rupture (`rupture.js`): store de módulo, `html[data-ratio-rupture]`. Inclina bloques vía `rotate`/`translate` CSS (compone con transforms GSAP) y acelera el spin de los objetos.

Cómo se clavó el motion del hero: [`docs/readymag-motion.md`](../readymag-motion.md). Producto reutilizable: [`docs/scrolllab-beat.md`](../scrolllab-beat.md).
