# ORDO — originales de las imágenes (antes elStudio)

`foto-local.png` (no viaja al repo): la foto del local terminado, generada con Higgsfield (GPT Image
2.5) a partir del render `?foto-ref` de la escena (`npm run dev`, `/templates/ordo?foto-ref`, 1600×900).

El sitio usa una versión deformada en perspectiva para que sus esquinas calcen con las de nuestra
cámara de arranque: `src/components/sections/ordo/assets/room-photo.webp` (2400×1350) y `room-photo-1200.webp`.
Correspondencias, en px de 1600×900 (foto → render): izquierda frente arriba (178,188 → 240,262),
fondo izquierda arriba (602,62 → 614,124), fondo derecha arriba (1418,176 → 1345,243), piso frente
derecha (1108,858 → 1090,836), piso fondo derecha (1393,556 → 1300,536). Si cambia la cámara
(`START` / `TARGET` en localScene.js), hay que regenerar la referencia, la foto y la deformación.

`boceto-a.png` (no viaja al repo): el boceto a lápiz y carbonilla, generado con Higgsfield (GPT Image
2.5) a partir de la foto ya alineada. Se deformó sobre la foto (correspondencias en px de 1600×900,
boceto → foto alineada: (175,213 → 232,262), (604,60 → 628,126), (1390,182 → 1333,226),
(1093,895 → 1075,852), (835,128 → 838,188), (797,515 → 803,520), (1310,565 → 1275,560),
(1400,555 → 1340,545)), se pasó el papel a blanco y a escala de grises:
`src/components/sections/ordo/assets/sketch-room*.webp`.

`vacio-a.png` (no viaja al repo): el mismo boceto con el local vacío (Higgsfield, edición del boceto
alineado). Calza con el boceto completo sin deformar: se escaló a 2400×1350, se pasó el papel a
blanco y a grises: `src/components/sections/ordo/assets/sketch-empty*.webp`. Los rectángulos de cada mueble
están en `src/components/sections/ordo/designPieces.js` (px de 1600×900).

## Alzado (desde 2026-10-23, el hero usa estas)

El hero pasó a un alzado frontal 21:9. `alzado-foto-b.png` (foto, Higgsfield texto → imagen),
`alzado-boceto-b.png` (boceto, edición de la foto) y `alzado-vacio-a.png` (vacío, edición del boceto)
calzan entre sí sin deformar. Se escalaron a 2400×1029; la foto con el fondo llevado a #efebe3 y los
bocetos con el papel a blanco y en grises. Reemplazan a los WebP de `src/components/sections/ordo/assets/`
(mismos nombres). Rectángulos de cada mueble y el interior en metros: `designPieces.js`.

## Proyecto 1 (tarjeta de Proyectos, desde 2026-10-24)

`proyecto1-7769888c-….png` (no viaja al repo): un local comercial (tienda de concepto) en la misma
paleta que el hero, generado con Higgsfield (GPT Image 2.5, texto → imagen, 3:2, 2048×1360). Es de
muestra hasta tener las fotos de un proyecto real del cliente. En el sitio:
`src/components/sections/ordo/assets/linho-cover.webp` (1800 px) y `linho-cover-900.webp`. La otra variante
(`proyecto1-4eefdd63-….png`) quedó descartada.

## Minimal cálido (desde 2026-10-24, el hero usa estas)

El cliente eligió una versión más moderna del local. `moderno-a-foto.png` (Higgsfield, texto → imagen,
21:9) y, sobre esa, `moderno-a2-foto-2.png` (edición: más plantas) es la foto. `moderno-a2-boceto.png`
(boceto en lápiz duro, edición de la foto) y `moderno-a2-vacio.png` (vacío, edición del boceto). El
boceto no calzaba del todo con la foto: se le aplicó una homografía (`moderno-a2-boceto-al.png.npy`,
la misma para el vacío); quedan desvíos de ~10 px (en 2688) en la planta grande, el nicho y la barra.
Escaladas a 2400×1029: la foto con el fondo a #efebe3; los bocetos con el papel a blanco, en grises y
con más contraste en el trazo (el 2H se perdía en pantalla). Los rectángulos de cada mueble y el
interior en metros: `designPieces.js`. Las opciones descartadas (`moderno-b-*`, el alzado rústico)
quedan en esta carpeta.

`moderno-a2-obra-2.png` (2026-10-24): el mismo local como se recibe, en obra gris (edición del boceto
vacío: ventana chica, paredes con parches, losa con un caño a la vista y una lamparita). Calza con el
vacío a ±2 px; se le aplica la misma homografía y el mismo tratamiento de grises:
`src/components/sections/ordo/assets/sketch-raw*.webp`. Es la primera capa del diseño (designPieces.js: las
piezas `obra`). La otra variante (`moderno-a2-obra-1.png`) tenía el piso corrido 10 px.

## Fotos del Proyecto 1 (página de proyecto, desde 2026-10-24)

`p1-*.png` (no viajan al repo): cinco fotos más del local de muestra, generadas con Higgsfield (GPT Image 2.5)
tomando como referencia `proyecto1-7769888c-….png` (la de la tarjeta): `p1-a-mostrador` (3:4), `p1-b-ventanal` (16:9),
`p1-c-nicho` (3:4), `p1-d-prenda` (16:9) y `p1-e-detalle` (1:1). Sitio: `src/components/sections/ordo/assets/linho-*.webp` (y `-s`
para pantallas chicas). Son de muestra hasta tener las del cliente (`projects.js`).

## Proyectos 2 y 3 del template ORDO (2026-10-30)

Casa Muralha (casa privada en el Alentejo, rammed earth) y Maré (restaurante en Lisboa, barra de azulejo azul).
Higgsfield `gpt_image_2_5` (2k, calidad media, ~1 crédito cada una). De cada proyecto, primero la portada
(`muralha-cover.png`, `mare-cover.png`, texto → imagen 3:2) y después las otras cinco con la portada como
`image_references`, para que sean el mismo lugar: `-hero` (3:4), `-thumb` (1:1), `-light` (16:9), `-colour` (3:4),
`-craft` (16:9). Los originales PNG no viajan al repo (`.gitignore`); el sitio usa los WebP de
`src/components/sections/ordo/assets/<proyecto>-<pieza>.webp` (y `-s`, o `-900` en la portada).
