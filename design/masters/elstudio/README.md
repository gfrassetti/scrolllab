# elStudio — originales de las imágenes

`foto-local.png` (no viaja al repo): la foto del local terminado, generada con Higgsfield (GPT Image
2.5) a partir del render `?foto-ref` de la escena (`npm run dev`, `/estudio/elstudio?foto-ref`, 1600×900).

El sitio usa una versión deformada en perspectiva para que sus esquinas calcen con las de nuestra
cámara de arranque: `src/studio/elstudio/assets/foto-local.webp` (2400×1350) y `foto-local-1200.webp`.
Correspondencias, en px de 1600×900 (foto → render): izquierda frente arriba (178,188 → 240,262),
fondo izquierda arriba (602,62 → 614,124), fondo derecha arriba (1418,176 → 1345,243), piso frente
derecha (1108,858 → 1090,836), piso fondo derecha (1393,556 → 1300,536). Si cambia la cámara
(`START` / `TARGET` en localScene.js), hay que regenerar la referencia, la foto y la deformación.

`boceto-a.png` (no viaja al repo): el boceto a lápiz y carbonilla, generado con Higgsfield (GPT Image
2.5) a partir de la foto ya alineada. Se deformó sobre la foto (correspondencias en px de 1600×900,
boceto → foto alineada: (175,213 → 232,262), (604,60 → 628,126), (1390,182 → 1333,226),
(1093,895 → 1075,852), (835,128 → 838,188), (797,515 → 803,520), (1310,565 → 1275,560),
(1400,555 → 1340,545)), se pasó el papel a blanco y a escala de grises:
`src/studio/elstudio/assets/boceto-local*.webp`.

`vacio-a.png` (no viaja al repo): el mismo boceto con el local vacío (Higgsfield, edición del boceto
alineado). Calza con el boceto completo sin deformar: se escaló a 2400×1350, se pasó el papel a
blanco y a grises: `src/studio/elstudio/assets/boceto-vacio*.webp`. Los rectángulos de cada mueble
están en `src/studio/elstudio/designPieces.js` (px de 1600×900).

## Alzado (desde 2026-10-23, el hero usa estas)

El hero pasó a un alzado frontal 21:9. `alzado-foto-b.png` (foto, Higgsfield texto → imagen),
`alzado-boceto-b.png` (boceto, edición de la foto) y `alzado-vacio-a.png` (vacío, edición del boceto)
calzan entre sí sin deformar. Se escalaron a 2400×1029; la foto con el fondo llevado a #efebe3 y los
bocetos con el papel a blanco y en grises. Reemplazan a los WebP de `src/studio/elstudio/assets/`
(mismos nombres). Rectángulos de cada mueble y el interior en metros: `designPieces.js`.

## Proyecto 1 (tarjeta de Proyectos, desde 2026-10-24)

`proyecto1-7769888c-….png` (no viaja al repo): un local comercial (tienda de concepto) en la misma
paleta que el hero, generado con Higgsfield (GPT Image 2.5, texto → imagen, 3:2, 2048×1360). Es de
muestra hasta tener las fotos de un proyecto real del cliente. En el sitio:
`src/studio/elstudio/assets/proyecto-1.webp` (1800 px) y `proyecto-1-900.webp`. La otra variante
(`proyecto1-4eefdd63-….png`) quedó descartada.
