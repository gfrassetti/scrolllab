# VANTA — mapa de port

Referencia de motion: https://kprverse.com/  
SKU: `vanta` · mundo propio (juego táctico / universo live-service), copy placeholder en inglés.

No se copia KPR / Keepers / Kai. El gesto es el mismo: HUD de consola, marcos tipo carpeta, tableaux cinematográficos, hold-to-scan.

| Beat (ref) | Primitivo | Sección |
|---|---|---|
| 0 — boot blanco LOADING + click-to-sound + marca gigante | overlay (no scroll) | `BootVanta` |
| 0–2 — HUD fijo, hamburger hover, scramble + PAGE, CTA chamfer | chrome | `NavVanta` |
| 0 — retrato full-bleed + tilt 3D al cursor | pointer rotateX/Y | `HeroOperators` |
| scroll — la foto se aleja y entra en una carta carpeta (reversible) | P1 pin+scrub + P2 | `HeroOperators` |
| la misma carta se acerca, flip, tableau con two operators + parallax | P1 + rotateY + P2 | `KeeperVista` |
| cierra como carta que gira → mesa blanca 10K, cristal, ojo | P1 + pointer 3D | `CollectionDesk` |
| 11–14 — mazo lila, dos ramas, swap discreto, expand, hover 3D | P1 + P3 + tilt | `OperatorFan` |
| 15–21 — The Keep / citadel zoom + CLICK & HOLD feed encima | P1 + P2 + hold overlay | `CitadelStage` |
| 22–26 — Factions cinematic, HOLD circular, intel overlay | P1 + hold overlay + tilt | `FactionHold` |
| 27–33 — The World aerial, shards 3D | P1 + P2 zoom + tilt | `WorldVista` |
| 34–40 — slivers 3D + closer negro | P6 cutout + P8 | `FooterDrop` |

Firma: **CLICK & HOLD** (pointer hold, reversible al soltar) abre un feed encima. Scroll atrás = timeline atrás (pin+scrub). Three.js = campo de partículas en el hero.
