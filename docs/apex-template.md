# APEX — hero con un film generado (fase 1)

> Template automotriz (`/templates/apex`, solo con `npm run dev` mientras está en obra).
> Esta fase es **solo el hero**; el resto de la página está planificado en
> [`template-plans/apex.txt`](template-plans/apex.txt).
>
> - Referencia (punto de partida, no destino): https://www.esrbespoke.au/ — análisis en
>   [`reference-analysis/apex.md`](reference-analysis/apex.md)
> - Código: `src/components/sections/apex/Hero.jsx` · página: `src/pages/ApexPage.jsx`
> - Film: `scripts/apex-reel.mjs` → `public/apex/`

## 1. De dónde sale la imagen

Cinco tomas de **un mismo auto genérico** (sedán eléctrico, sin marca ni patente) hechas
con Higgsfield:

1. Un still maestro (`gpt_image_2_5`, 0,25 cr) del auto en un estudio oscuro.
2. Cuatro stills derivados **con el maestro como `image_references`** (flanco, llanta,
   interior, trasera): así es el mismo auto en las cinco.
3. Cada still → video con `minimax_h3` (2K, 8 s, `start_image`, 16 cr). Corren de a dos;
   el servicio responde 429 si se lanzan más (ver la nota de la bóveda
   «Higgsfield — costos, límites y trampas»).

Prompt de cámara de todas: *«one single continuous cinematic camera move, no cuts, no
pauses: the camera is already moving on the first frame…»* + qué se mueve (reflejos) y qué
no (el auto). Los originales quedan en `design/masters/cars/` (gitignored).

Costo del set final: ~82 créditos (más lo gastado en un primer auto descartado).

## 2. El film (`scripts/apex-reel.mjs`)

```
node scripts/apex-reel.mjs            # design/masters/cars/shot-1..5.mp4 → public/apex/
FFMPEG=/ruta/a/ffmpeg node …          # si ffmpeg no está en el PATH
```

- **Empalme:** cada unión es un fundido de 0,5 s (`xfade`) y la primera toma se agrega una
  vez más al final, así la última funde *dentro* de la primera: el loop no salta. El film
  empieza medio segundo adentro de la toma 1, justo donde está esa copia cuando termina el
  último fundido. Duración del loop: `n × (largo − 0,5)` = 37,5 s con tomas de 8 s.
- **Grade horneado** (curva S suave, saturación 0,92, sombras frías, luces apenas cálidas):
  cuesta cero en runtime y queda igual en todos los navegadores. El overlay (lavado de
  color, sombras, viñeta, grano) está en CSS, como variables.
- **Dos archivos:** `hero.mp4` 1080p (~1,8 Mbps, 8,6 MB) y `hero-m.mp4` 720×1280 con un
  **recorte vertical por toma** y su propio foco (`SHOTS[i].focus`), 3,5 MB. Un teléfono
  no tiene que bajar píxeles que no va a mostrar.
- **Posters:** el primer cuadro de cada film. `manifest.json`: dónde empieza cada toma en el
  reloj del loop (lo lee el indicador de capítulos).
- **Medición antes de empalmar:** la diferencia entre cuadros de cada clip (`signalstats`)
  confirmó que ninguno tiene cola congelada (en FOLD ese fue el problema); solo arrancan
  con una leve aceleración.

## 3. El hero (`Hero.jsx`)

| Capa | Qué hace |
|---|---|
| `<video>` | `muted loop playsInline`, un solo archivo por viewport (se elige al montar y se cambia, conservando el tiempo, si se cruza el breakpoint). Pausa fuera de pantalla (IntersectionObserver). |
| Overlay | `.apex-wash` (soft-light), `.apex-shade` (legibilidad: arriba, abajo, radial a la izquierda), `.apex-vignette`, `.apex-grain` (feTurbulence en pasos, apagado en calma). |
| Texto | Marca, una frase, 3 links y **un** CTA; titular de dos líneas (línea que sube enmascarada), bajada + «Discover». |
| Capítulos | 5 segmentos que siguen `video.currentTime` (sin renders de React); tocar uno salta a esa toma. |
| Entrada | cortina → titular → pausa → bajada → chrome (orden del Detalle #5). |
| Salida | scrub: el film se acerca 8 % y se apaga hacia el negro de la sección siguiente. |

### Calma (reducir movimiento / ahorro de datos / 2G)
El film **no se reproduce** (`preload="none"`): queda el poster con el grade; el texto entra con
fundidos cortos; el grano queda quieto; los segmentos quedan deshabilitados. Nunca un hueco.

## 4. Reemplazar el film (para el comprador)

1. Poné cinco clips 16:9 de ≥ 4 s en `design/masters/cars/` como `shot-1.mp4 … shot-5.mp4`.
2. `node scripts/apex-reel.mjs` (ajustá `SHOTS` para los nombres y el foco del teléfono).
3. Listo: `public/apex/` se regenera (films, posters y manifest).

**El film de la demo es media de muestra** (canon 18): el aviso va antes del precio, en el
checkout, en el código y en el README cuando el template se registre.

## 5. Verificación (fase 1)

- Navegador integrado (visible, con códecs): carga, reproduce, capítulos y salto, menú del
  teléfono, 1440×900 y 390×844 sin desborde, etiquetas ≥ 11 px.
- Calma (Playwright, `reducedMotion`): video en pausa, poster, texto visible, cortina fuera.
- `npm run verify` completo (1496 tests).
- **Pendiente al registrar:** listas de `check:mobile/motion/parity`, `check:visual`, ZIP
  (`publicDirAssets('apex')`), tarjeta, precio, i18n, sitemap, `gen:og`.

## 6. Lecciones

- Chrome no carga video en una pestaña en segundo plano (`visibilityState: hidden`):
  para medir reproducción hace falta una pestaña visible (el navegador integrado sirve).
- El Chromium de Playwright no trae H.264: sirve para la versión calma, no para ver el film.
- Elegir el archivo por `matchMedia` al montar es frágil con ventanas que cambian de ancho
  (un navegador integrado reportó 0 px al montar y quedó con el film de teléfono estirado):
  por eso se escucha el cambio de breakpoint.

## 7. Builder y LAB (sección por sección)

Regla del dueño: cada sección de APEX entra al **builder** y se evalúa para **LAB** al
construirse, no al final.

| Sección | Builder | LAB | Notas |
|---|---|---|---|
| `apex/Hero` | sí (paleta, grupo APEX) | sí (`HOSTABLE_SECTIONS`, FLOW) | 24 campos: texto, links, capítulos (lista, tope 8), film/póster (URL), grano on/off, 4 colores |

- **Campos:** `src/domain/sectionFields/fields/apex.js`. El servidor valida por nombre:
  `washColor` es color; `filmSrc`, `filmSrcMobile`, `poster`, `posterMobile` son URL de
  assets (https o ruta del sitio).
- **Fuente:** el wrapper del modelo trae Inter Tight (`modelWrappers.js`): una
  composición no tiene `ApexPage`.
- **ZIP:** `publicAssets` del modelo lleva `public/apex/*` y `scripts/apex-reel.mjs`.
  Una composición con el hero se lleva el film de muestra y el script para rehacerlo.
- **LAB:** ver `docs/hosted-component-plan.md` (Fase K). El menú del teléfono usa un
  alias liviano en el embed; la entrada va al doble de velocidad en el widget.
- **Check:** `check:builder` mira el atributo `poster` del video; el póster del teléfono
  está exento (solo se aplica con el viewport angosto).
