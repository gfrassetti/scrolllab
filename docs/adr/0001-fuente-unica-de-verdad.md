# 0001 · Una sola fuente de verdad para precios, secciones y campos editables

**Estado:** aceptada · 2026-10

## Contexto

Los precios vivían dos veces (`src/lib/pricing.js` y `server/catalog.js`), las secciones tres (el registry JSX,
`sectionKinds.js` regenerado por un script con regex, y una lista a mano en `server/sections.js`) y los campos editables
dos (`src/lib/sectionFields.js` y `server/sectionFields.js`). `scripts/check-consistency.mjs` leía el código con regex
para compararlos. Avisaba cuando se despegaban, pero no lo impedía, y el regex mismo podía quedar vacío sin que nadie
lo notara (pasó al mover la lista de modelos de la home).

## Decisión

Cada dato existe **una vez**, en un módulo puro que importan el navegador y Node:

- `src/domain/catalog.js`: precios, tramos del builder, bundle, cupón y qué SKUs se venden.
- `src/domain/sections.js`: id, tipo y orden de cada sección.
- `src/lib/sectionFields.js`: los campos editables; el servidor **deriva** de ahí qué props acepta.

Lo que el servidor sí decide por su cuenta (cómo valida cada valor, la lista aprobada de secciones vendibles) sigue
en el servidor. El dominio no importa React, GSAP ni capas de arriba (lo hace cumplir ESLint).

Los módulos viejos (`pricing.js`, `server/catalog.js`, `sectionKinds.js`) quedan como re-exports: ningún import cambió.

## Consecuencias

- Un precio no puede quedar distinto entre la home y el checkout.
- `check-consistency` pierde las comparaciones que ya no pueden fallar y gana las que sí (la base del builder
  contra el template más caro, un campo de color con el nombre que el servidor reconoce).
- La allowlist de secciones del servidor es frontera de seguridad: su lista aprobada está **a mano** en
  `server/__tests__/sections.test.js`, para que habilitar una sección sea una decisión explícita y no un efecto de
  tocar la tabla.
- Sumar una sección ahora son cuatro pasos en tres archivos (ver `docs/architecture.md`), y `verify` avisa si falta uno.
