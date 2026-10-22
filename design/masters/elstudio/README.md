# elStudio — originales de las imágenes

`foto-local.png` (no viaja al repo): la foto del local terminado, generada con Higgsfield (GPT Image
2.5) a partir del render `?foto-ref` de la escena (`npm run dev`, `/estudio/elstudio?foto-ref`, 1600×900).

El sitio usa una versión deformada en perspectiva para que sus esquinas calcen con las de nuestra
cámara de arranque: `src/studio/elstudio/assets/foto-local.webp` (2400×1350) y `foto-local-1200.webp`.
Correspondencias, en px de 1600×900 (foto → render): izquierda frente arriba (178,188 → 240,262),
fondo izquierda arriba (602,62 → 614,124), fondo derecha arriba (1418,176 → 1345,243), piso frente
derecha (1108,858 → 1090,836), piso fondo derecha (1393,556 → 1300,536). Si cambia la cámara
(`START` / `TARGET` en localScene.js), hay que regenerar la referencia, la foto y la deformación.
