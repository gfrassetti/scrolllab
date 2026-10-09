# FOLD — cómo se hizo

Película al scroll: un mundo de papel contado como un film continuo en un
canvas. Referencia de mecánica: pear.no (análisis cuadro por cuadro en
[`reference-analysis/pear-film.md`](reference-analysis/pear-film.md) y el motor en
[`reference-analysis/pear-engine.md`](reference-analysis/pear-engine.md)). El mundo,
la historia y las piezas son propios.

## 1. La regla que manda: la imagen nunca se queda quieta

- **Una toma = un movimiento de cámara continuo.** Cada clip arranca en el último
  cuadro real del anterior (se sube como `start_image`). Una toma nueva solo
  empieza debajo de una transición.
- **Los modelos de video congelan la imagen final 1–2 s** (y algunos repiten cada
  cuadro: 12 fps dentro de 24). Eso es lo que el lector siente como «se corta y
  se queda quieto». El script lo recorta y lo deduplica.
- **El scroll se reparte por movimiento visible** (curva `pace` del manifest), no
  por número de cuadro: cada tick de rueda mueve la imagen lo mismo.
- **El reloj también mueve:** la cámara respira, el campo de la transición titila,
  el footer es un video en loop.

## 2. El carrete

`scripts/fold-reel.mjs` (solo necesita ffmpeg; `FFMPEG=/ruta` si no está en PATH):

| Comando | Sale |
|---|---|
| `npm run fold:reel` | carrete completo → `public/fold/film/` (768 + 1440, 3× cuadros interpolados, ~320 MB, **gitignored**) |
| `npm run fold:reel -- --demo` | carrete liviano → `public/fold/demo/` (768, cuadros originales, ~30 MB, **en git y en el ZIP**) |
| `node scripts/fold-reel.mjs loop design/masters/fold/loop.mp4` | `public/fold/footer-loop.{mp4,jpg}` |

Pasos: recorta cabeza y cola quietas de cada clip → encadena con fundido de 6
cuadros → descarta repetidos → interpola (`minterpolate`) → corta los tiers →
escribe `manifest.json` (`scenes[].start/count/pace`, `interp`).

Las tomas están en `DEFAULT_TAKES` del script; los originales en
`design/masters/fold/` (gitignored).

## 3. Dónde vive el carrete (peso)

El motor prueba en orden y usa el primero que responde (`score.film.bases`):

1. `VITE_FOLD_FILM_URL` — el carrete completo en Cloudflare (producción).
2. `/fold/film` — el completo armado en local.
3. `/fold/demo` — el liviano (viaja en el ZIP; red de seguridad en producción).

**Publicar el completo** (lo hace el dueño; Cloudflare sube solo lo que cambió):

```bash
npm run fold:reel
npm run fold:deploy
```

y en Vercel, variable `VITE_FOLD_FILM_URL` = la URL del worker
`scrolllab-fold` (sin barra final), redeploy. `public/fold/film/_headers` da CORS
al manifest y cache inmutable a los cuadros.

**Teléfonos** (≤ 820 px): tier 768 y solo los cuadros originales (cada `interp`);
el motor mezcla cada cuadro con el siguiente. Con 10–20 Mbps y CPU ×4: 0 cuadros
faltantes y ~40 MB para toda la película (en vez de 91).

## 4. Motor (`src/components/sections/fold/Film.jsx`)

- Canvas + carga alrededor del cabezal, de lo cercano a lo lejano por franjas,
  primero los cuadros originales; nunca en blanco (cuadro más cercano).
- Sin doble suavizado: Lenis ya suaviza la rueda; el film lee el progreso directo.
- Transiciones: `dots` (campo de color que sube por celdas, se sostiene y se
  levanta) y `paper` (la toma que sale se rompe en papel picado hacia arriba con
  la nueva ya andando debajo).
- Riel de capítulos y menú a pantalla completa (velo con blur): medidas y tiempos
  tomados de pear; salto bajo el velo. El botón solo se ve con el film en pantalla
  (en una composición del builder no flota sobre otras secciones).
- **Reducir movimiento:** láminas fijas — cada tarjeta sobre su cuadro de la
  película, con un fundido corto (`calmReveal`). Se decide antes del primer render.

## 5. Fuera del builder y de LAB — y el aviso

FOLD es una página entera hecha a medida: la película no tiene sentido como
sección suelta de una composición. Se vende sola (como COMIC), sin secciones en
el builder ni en LAB. Sí tiene paleta en `THEMED_MODELS` (la invariante lo pide
para todo modelo del catálogo).

**La película de la demo es de muestra** y el comprador tiene que producir sus
propios clips: es la mayor parte del trabajo. Se avisa en tres lugares: la ficha
de producto (`templates.fold.notice`, que la ficha muestra antes del precio y
ofrece el Estudio para hacerla a medida), la descripción del checkout y el código
(cabecera de `Film.jsx` y `score.js`, y el README del ZIP).

**Teléfonos:** `score.screensPhone` (22) — un deslizamiento recorre mucho más
que un tick de rueda, así que el film es más corto en pantallas angostas.

## 6. Piezas (Higgsfield)

Imágenes `gpt_image_2_5`; video `minimax_h3` 2K (2 créditos/s).

| Pieza | Job |
|---|---|
| kf03 subida al tope | ff07facc-1de0-41ca-b950-afcb3168a5e8 |
| kf04 la esfera se abre | 143ca057-a2c6-4bfb-bc13-f96803402c69 |
| kf05 valle al atardecer | 4327dbaf-c915-4378-a054-12b27e738137 |
| kf06 canal de noche | a17e9efd-ef95-4e38-9afa-7eb26c6cd2fd |
| kf07 farolitos | bd0ac18b-8253-4101-b0f8-a76bc1309716 |
| kf08 luna de papel | b8dc2301-edbc-40c9-9190-868983c0ad5f |
| kf09 lámpara del taller | 927d7c4f-5e64-452b-8003-e0ef2863120b |
| kf10 hoja que se pliega | c2ba75ac-0f77-4099-a769-a348edbe1d4d |
| kf11 farolito en la ventana | ffb5beb8-1b49-4809-a186-191268b63ea3 |
| kf12 amanecer | 95165fb7-cdf0-43f6-867e-6f6349623e6d |
| kf13 nubes de papel | dc50a839-9c3e-43f0-8879-ed3b266b8a37 |
| clip B (sube y se abre, 10 s) | 147c8342-2a18-4d72-87d7-29f8e6c52276 |
| clip C (valle, 6 s) | bc78e824-d5a9-4916-92ae-8a5605af7bfd |
| clip D (canal → farolitos, 8 s) | f96111bc-67ee-4945-a67d-cb4c28850128 |
| clip E (a la luna, 6 s) | 77a730a8-d7cb-450f-b1c5-cb4e8cfe8f34 |
| clip F (luna → taller, 6 s) | 73e0012f-dec2-4819-b8db-3f84eefeddf3 |
| clip G (la hoja se pliega, 8 s) | 01afadf9-4e27-4393-a0ca-1742ab101ab4 |
| clip H (sale por la ventana, 6 s) | 24ea3e15-2cbf-4a8e-9988-cb5beb464b86 |
| clip I (amanecer, 8 s) | 2ab5a70f-d5d4-4d7b-8d86-03e007e54b73 |
| loop del footer (6 s) | debbf051-ff52-4689-8755-4c116d87c981 |

## 7. Cómo se verificó

- Tick por tick de rueda (PC): 0 ticks sin movimiento.
- Teléfono emulado (390×844, CPU ×4, 10/20 Mbps, gestos de dedo): 0 cuadros faltantes.
- `npm run verify`, `check:visual -- fold` (el ZIP instala, compila y reproduce
  el carrete liviano), `check:mobile fold`, `check:motion fold`, `check:parity fold`.

## 8. Tropiezos

- `publicDirAssets` no entra en subcarpetas: el ZIP llevaba el manifest sin
  cuadros. Se lista `fold/demo` y `fold/demo/768`.
- Un `<video>` cancela rangos que no necesita (`ERR_ABORTED` sobre un 206): no es
  un error (check:motion lo ignora para videos).
- El emulador no es un teléfono: falta probar Safari en un iPhone real.
