# 0003 · El frontend por features, con la página como composition root

**Estado:** aceptada · 2026-10

## Contexto

`TemplatesIndex.jsx` (la home) tenía 1771 líneas en un solo componente y `BuilderPage.jsx` 724. Cada zona de la home y
cada bloque del builder compartía estado y datos derivados con el resto, así que cualquier cambio obligaba a leer todo.

## Decisión

La página sigue siendo el **composition root**: conserva el estado, los datos derivados y las coreografías de GSAP
(`useGSAP` con `scope: root`), y monta bloques de `src/features/<feature>/`. Cada bloque recibe por props lo que usa.

- Las animaciones no se parten: encuentran sus elementos por `data-*` dentro de la página, y los hijos ya están
  montados cuando corre el layout effect del padre.
- No se mueven `src/components/sections/**` ni los archivos de `SHARED` (viajan al ZIP).
- Un bloque que pedía demasiadas props se parte por dentro: el panel de composición del builder pasó de 24 props a
  tres bloques más chicos (cabecera, lista de 11 props y cierre de compra de 15).

## Consecuencias

- La página queda en 672 y 337 líneas; cada zona se lee y se prueba sola.
- Las props son explícitas, lo que también las hace visibles: un bloque con 15 props es una señal de que le falta una
  abstracción, no de que haya que pasarlas por contexto.
- No se movieron los componentes sueltos de `src/components/` (carrito, LAB, cuenta): son muchos imports en archivos
  que otras sesiones editan, y el beneficio es menor.
