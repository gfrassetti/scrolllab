---
tags:
  - scrolllab
  - reference-analysis
  - unity
aliases:
  - Unity analysis
  - analyze unity
analyzed: 2026-08-02
source: https://united-in-football.framer.website/
---

# Unity — análisis de referencia

Generado por `scripts/analyze-reference.mjs` el 2026-08-02.

**URL:** https://united-in-football.framer.website/  
**SKU sugerido:** `unity`  
**Title:** United - Football & the 2026 World Cup

## Librerías detectadas

- `lenis`
- `framer`
- `react`

### Scripts (muestra)

- `https://events.framer.com/script?v=2`
- `https://framerusercontent.com/sites/2W6czVdUA6c9ReEuogDZYx/script_main.CEllCuzy.mjs`

### Fonts cargadas

- Boldonse
- Instrument Serif
- Inter
- Oswald
- Instrument Serif Placeholder
- Inter Placeholder
- Oswald Placeholder

`html.class`: `lenis lenis-smooth`

## Técnicas inferidas

- Smooth scroll: Lenis
- Builder: Framer (scroll components / variants)
- SCROLLLAB port target: Lenis + GSAP ScrollTrigger
- Pinned / sticky stages detected by name
- Horizontal panel / track / slider pattern
- Parallax / zoom / immersive scrub markers
- Sticky/fixed nodes: div, Pinned Stage, Hero Number, Title Group, iframe

## Capas Framer (`data-framer-name`)

- Closed
- Logo
- 1
- 2
- 3
- 4
- 5
- Section
- Content
- Immersive Zoom
- Pinned Stage
- Panel Track
- Image 1
- Image 2
- Image 3
- Image 4
- Panel
- Sticky Text
- Marker Drift
- Marker Zoom
- Marker Unfold
- Marker Pan
- Barcode Strip
- Bar
- Stats Panel
- Bars
- Bar Row
- Bar Fill
- Hero Number
- Variation 5 — Editorial About
- About Title
- Ball
- Left Column
- Title Group
- Year
- Winners List
- Caption
- Stats
- Default
- Bottom Row
- Stat
- Wrapper
- Image
- Light
- Backdrop
- Text
- Bottom
- Border

## Headings

| Tag | Texto | Font | Size |
|---|---|---|---|
| H1 | The FIFA World Cup is the most watched sporting event in hum | Instrument Serif | 64px |
| H1 | ONE GAME. ONE WORLD. | Boldonse | 96px |
| H1 | FOOTBALL NEEDSNO TRANSLATION. | Instrument Serif | 96px |
| H1 | TheUniversalLanguage | Oswald | 120px |
| H1 | 211+ | Oswald | 120px |
| H1 | If they love | Oswald | 120px |
| H1 | You they’ll | Oswald | 120px |
| H1 | let you know | Oswald | 120px |
| H1 | If they Are | Oswald | 120px |
| H1 | dissappointed | Oswald | 120px |
| H1 | they’ll let you know | Oswald | 120px |
| H1 | If they Are | Oswald | 120px |
| H1 | Pi**ed they'll | Oswald | 120px |
| H1 | let you know | Oswald | 120px |
| H1 | WORLDCHAMPIONS | Boldonse | 155.384px |
| H2 | Can you spot you're country? | Instrument Serif | 40px |
| H1 | THE LAST DANCE. | Boldonse | 124.157px |
| H2 | 2026, Finally? | Instrument Serif | 40px |
| H2 | Cristiano Ronaldo – Portugal | Instrument Serif | 40px |
| H1 | 48 nationsare chasingtheirdream | Oswald | 120px |
| H1 | Two will get A chance | Oswald | 120px |
| H1 | But only one team will lift the trophy | Oswald | 120px |

## Muestreo de scroll (11 pasos, max=18649px)

| Progress | Y | Sticky/fixed | Transforms |
|---|---|---|---|
| 0 | 0 | div, div, Pinned Stage, Hero Number | div, div, Image 1 |
| 0.1 | 1865 | div, div, Pinned Stage, Hero Number | div, div, Image 1 |
| 0.2 | 3730 | div, div, Pinned Stage, Hero Number | div, div, Image 1 |
| 0.3 | 5595 | div, div, Pinned Stage, Hero Number | div, div, Panel Track |
| 0.4 | 7460 | div, div, Pinned Stage, Hero Number | div, div, Panel Track |
| 0.5 | 9325 | div, div, Pinned Stage, Hero Number | div, div, Panel Track |
| 0.6 | 11189 | div, div, Pinned Stage, Hero Number | div, div, Panel Track |
| 0.7 | 13054 | div, div, Pinned Stage, Hero Number | div, div, Panel Track |
| 0.8 | 14919 | div, div, Pinned Stage, Hero Number | div, div, Panel Track |
| 0.9 | 16784 | div, div, Pinned Stage, Hero Number | div, div, Panel Track |
| 1 | 18649 | div, div, Pinned Stage, Hero Number | div, div, Panel Track |

## Port a SCROLLLAB

1. Smooth scroll → `SmoothScrollProvider` (Lenis)
2. Pins / scrubs → GSAP `ScrollTrigger` (`usePinnedScrub` o timeline local)
3. Copy genérico (Headline N / Link N / lorem)
4. Actualizar [[Template reference index]] + mapa del SKU

## Gaps (llenar a mano tras mirar)

- [ ] Hero
- [ ] Sección firma (la más difícil)
- [ ] Footer
