# COMIC ← endspeciesism.org — lectura cuadro por cuadro (portón, cerdo, perro)

Cómo se midió: Playwright a 1280×720, `scrollTo` cada 100 px entre 4000 y 7000
(el tramo del portón → tarjeta del cerdo → tarjeta del perro), y en cada paso el
`getBoundingClientRect()` de cada capa. La página nombra sus capas con el
atributo `name` (`farm, foggy`, `pig, squirm`, `arm, left`…) y las agrupa en
profundidades `-1` (fondo), `0` (personaje), `1` (frente) dentro de cada
tarjeta (`^`). Script: `refscan.mjs` (scratchpad de la sesión), salida
resumida abajo. Implementación: `src/components/sections/comic/ChapterDusty.jsx`,
actos 5–7.

**Regla general:** cada capa tiene su propio ritmo. Nada se mueve en bloque:
la tarjeta, el personaje, el fondo, los brazos, la cola y el globo avanzan cada
uno a otra velocidad, y la tarjeta anterior también reacciona cuando entra la
siguiente.

## Portón (4000 → 4300)

- `farm, farmer`: imagen grande (1920×1101, desfasada −320/−264), quieta.
- `pig + dog, backlit`: siluetas en primer plano abajo (546×235 en 330,494).

## Tarjeta del cerdo (entra 4300 → 5000, quieta desde 5000)

| scroll | fondo (top) | cerdo (top) | brazo chico (x,top) | brazo grande (x,top) | cola (x,top) |
|---|---|---|---|---|---|
| 4300 | — | — | 709, 675 | −351, 616 | — |
| 4600 | 556 | 417 | 683, 375 | −281, 315 | 612, 673 |
| 4900 | 256 | 170 | 613, 77 | −87, 10 | 966, 385 |
| 5000 | 188 | 110 | 608, 9 | −73, −58 | 1075, 310 |
| 5200 | 188 | 111 | 610, 8 | −70, −60 | 1167, 305 |

- La tarjeta sube 1:1 con el scroll y se frena de golpe (apenas desacelera al final).
- Los brazos asoman **antes** que la tarjeta (por encima de su borde).
- El cerdo recorre ~0,82 de lo que recorre la tarjeta: arranca más arriba y se va
  metiendo en su cuadro.
- El brazo grande se desliza ~280 px a la derecha mientras entra; el chico ~100 px
  a la izquierda (se cierran sobre el cerdo).
- La cola cruza en horizontal ~555 px, del centro al borde derecho.

## Tarjeta del perro (entra 5200 → 5800) y la del cerdo retrocede

| scroll | tarjeta cerdo (w, top) | fondo perro (top, w) | perro (top, w) | globo (x, top, w) |
|---|---|---|---|---|
| 5100 | 1011, 188 | — | 670, 373 | — |
| 5200 | 1011, 188 | 652, 1034 | 574, 368 | — |
| 5300 | 1011, 188 | 514, 1045 | 480, 358 | 432, 652, 138 |
| 5500 | 981, 193 | 218, 1079 | 298, 331 | 432, 452, 138 |
| 5700 | 809, 222 | −20, 1105 | 123, 310 | 434, 301, 177 |
| 5800 | 809, 222 | −26, 1110 | 126, 305 | 438, 347, 223 |

- La tarjeta del perro sube **más rápido que el scroll** (~1,45×) y desacelera.
- La del cerdo se achica a ~0,8 alrededor de su centro mientras la tapan (con su
  borde de papel).
- El perro asoma antes que su tarjeta, arranca ~20 % más grande y recorre ~0,65 de
  lo que recorre la tarjeta (termina más metido en el cuadro).
- El globo entra con la tarjeta, chico (~0,47), y crece al aterrizar.

## Zoom del fondo (5900 → 6700)

| scroll | fondo perro (w) | perro (top, w) | globo (x, w) |
|---|---|---|---|
| 5900 | 1112 | 127, 303 | 457, 266 |
| 6100 | 1290 | 127, 303 | 542, 293 |
| 6300 | 1885 | 127, 303 | 603, 293 |
| 6500 | 3673 | 129, 300 | 620, 290 |
| 6700 | 5303 | 154, 268 | 622, 259 |
| 6800 | 4808 | 173, 243 | 624, 235 |

- Arranca ~100 px después de que la tarjeta aterriza.
- Acelera (exponencial): ×1,16 → ×1,7 → ×3,3 → ×4,8; después retrocede apenas.
- Centro del zoom ≈ 75 % / 50 % del fondo: el granero.
- El globo crece hasta ~1 y se corre ~180 px a la derecha; al final se achica un poco.
- En la segunda mitad del zoom el perro se achica (~0,8) y baja ~45 px.

## Riel de capítulos (derecha)

Rayitas horizontales sobre una línea vertical, con un cuadradito en cada capítulo;
el activo muestra su nombre y el cuadradito naranja. Cambia de «An Unexpected Bond»
a «A Fork in the Road» cuando entra la tarjeta del cerdo.
