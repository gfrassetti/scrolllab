---
tags:
  - scrolllab
  - reference-analysis
  - pear
  - film
source: https://pear.no/
analyzed: 2026-10-08
method: grabación cuadro por cuadro (modo ?drive del propio sitio) + lectura del bundle
---

# pear.no — el film, cuadro por cuadro

Complementa [`pear-engine.md`](pear-engine.md) (cómo carga los frames). Acá está
**qué se ve y por qué nunca se queda quieto**. Sirve para FOLD y para cualquier
template de film al scroll.

## Cómo se midió

- El sitio trae dos parámetros propios: `?drive=N` recorre sola toda la página en
  N segundos y `?hud` muestra un panel de rendimiento. `window.__READOUT` expone el
  estado del motor.
- Grabación con Playwright a 1440×900: `?drive=150`, una captura cada 250 ms →
  628 muestras de punta a punta. Para cada par de muestras, diferencia media de
  píxeles (escala de grises, 160×100). Mediana **7,3**; solo 62 de 627 pares quedan
  por debajo de 0,6. Esos pocos casi quietos caen donde el lector *lee*: texto
  sobre un fondo que igual deriva (nubes, estrellas).

## La línea de tiempo (del bundle)

Toda la página son **5350 unidades**, repartidas en tramos con nombre:

| Tramo | Unidades | Qué carga |
|---|---|---|
| T | 1200 | héroe: video `colossus.mp4` en loop + puente `v51` (121 cuadros) + `renaissance` (362) |
| E | 600 | sigue el carrete hasta el corte |
| ne / re | 300 / 900 | `coda` (89 cuadros), `plan` (121) |
| ie / ae | 300 / 600 | `tree` (121) |
| oe / se | 500 / 250 | `flysky` (121) |
| ce | 700 | `trans` (121) y el loop del footer |

Unos **1.050 cuadros de secuencia** en total, más 4 videos que corren con el reloj
(`colossus`, `signal`, `reveal`, `footer-loop`). Los capítulos del riel están en
`data-at` = 0.012 / 0.232 / 0.400 / 0.628 de la página.

## Lo que pasa, en orden

1. **Estatua sobre una columna** (video en loop, se mueve aunque no scrollees).
2. La cámara baja por la columna y **la columna se vuelve el tronco de un árbol**.
   No hay corte: es la misma toma.
3. Una mano injerta una rama → el árbol se llena de peras → una mano toma una pera
   dorada → un joven la sostiene y la corta en dos.
4. **Transición de puntos**: la imagen se desarma en celdas y queda un cielo azul.
   El cielo *no está quieto*: las nubes derivan con el tiempo.
5. Desde abajo sube una pera gigante, primero como trama de puntos y después
   dorada; obreros en andamios → un hombre con un plano → el plano llena la pantalla
   → **el papel se vuelve un dibujo** de la pera en su plataforma, visto desde arriba.
6. El papel se desarma en partículas desde abajo y aparece otra escena: una mujer
   con un árbol en maceta sobre el cielo azul → la pera cae → **anillo arcoíris** →
   el follaje del árbol con peras ("Asked before signing").
7. Las nubes se vuelven trama de puntos → un hombre señala estrellas que forman
   constelaciones → nubes → un árbol joven → **doble exposición** hacia la escena
   final (dos figuras regando el árbol) con el logo.

## Las reglas que salen de esto

1. **Una sola cámara que se transforma, no tomas que se cambian.** Cada cambio
   importante es una metamorfosis dentro de la toma (columna → tronco, plano →
   papel → dibujo).
2. **Los cambios de mundo se hacen con las dos cosas en movimiento**: puntos,
   partículas, anillo, doble exposición. Nunca una imagen fija que se reemplaza
   por otra.
3. **El reloj también mueve la imagen**: videos en loop, nubes que derivan,
   estrellas que titilan. Si el lector deja de scrollear, la página sigue viva.
4. **Cada tick de scroll cambia el cuadro.** Con ~1.050 cuadros para 53 pantallas
   no hay tramos donde la rueda no produzca movimiento.

## Qué cambió en FOLD por esto

- Fuera las tomas provisorias hechas con fotos fijas: cada toma es video real, y
  cada clip arranca en el último cuadro real del anterior.
- Las uniones entre clips se funden unos cuadros (sin salto de velocidad) y el
  motor mezcla el cuadro actual con el siguiente según la posición exacta del
  scroll, así cada tick mueve la imagen.
- La cámara respira con el reloj (deriva lenta) y el campo de color de la
  transición titila: nada queda congelado aunque el lector se detenga.
