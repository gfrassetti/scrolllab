# Decisiones de arquitectura (ADR)

Una decisión por archivo, con el porqué: para que quien llegue después (una persona o una sesión de IA) sepa **qué
se decidió, por qué, y qué cuesta cambiarlo**, sin reconstruirlo desde el código. Formato: *Contexto → Decisión →
Consecuencias*. Si una decisión cambia, no se reescribe: se agrega un ADR nuevo que la reemplaza y se marca el viejo.

| # | Decisión |
|---|---|
| [0001](0001-fuente-unica-de-verdad.md) | Una sola fuente de verdad para precios, secciones y campos editables |
| [0002](0002-servidor-en-capas.md) | El servidor en capas: rutas → servicios → repositorios |
| [0003](0003-feature-folders.md) | El frontend por features, con la página como composition root |
| [0004](0004-tipos-jsdoc.md) | Tipos con JSDoc y `tsc`, en vez de migrar a TypeScript |
| [0005](0005-refactors-con-foto.md) | Los refactors se verifican con una foto antes y después |

Panorama general: [`docs/architecture.md`](../architecture.md).
