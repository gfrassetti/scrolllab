# Publicar `@scrolllab/embed`: cómo se avisa

El paquete (`packages/embed`) es un envoltorio fino: la lógica de LAB sale del
loader y del frame de la CDN (`embed.scrolllab.com.ar`), no de npm. **Solo hay que
volver a publicar cuando cambia el paquete mismo** (props nuevas, tipos, cómo
monta o limpia). Un cambio de una sección o del loader se despliega en la CDN.

## Qué automatizamos y qué no

| | |
|---|---|
| **Se automatiza** | Detectar que el repo y npm no coinciden, armar el paquete (`npm pack`) y abrir un aviso asignado al dueño del repo |
| **No se automatiza** | La publicación. Hace falta la cuenta de npm (`scrolllab`) y la verificación en dos pasos; una versión publicada no se puede volver a subir |

## Cómo funciona

`.github/workflows/embed-release.yml` corre con cada push a `master` que toque
`packages/embed/**`, una vez por día y a mano (*Run workflow*). Ejecuta
`node scripts/check-embed-release.mjs`, que compara `packages/embed` con lo que
hay en el registro público de npm (archivo por archivo, ignorando saltos de
línea) y responde uno de cuatro estados:

| Estado | Qué significa | Qué hace el workflow |
|---|---|---|
| `publish` | La versión del repo todavía no está en npm | Sube el `.tgz` como *artifact* y abre el aviso **«Publicar @scrolllab/embed X.Y.Z en npm»** con los pasos |
| `needs-bump` | La versión ya está en npm pero el contenido cambió | Abre el aviso **«Subir la versión…»**: npm no deja repetir el número |
| `version-behind` | La versión del repo es menor o igual que la última publicada | Abre el aviso para corregirla |
| `up-to-date` | Coincide con npm | Cierra el aviso abierto, si hay |

El aviso lleva la etiqueta `npm-publish`, está asignado al dueño del repo (así
GitHub manda el mail) y se actualiza solo: si cambia lo pendiente, agrega un
comentario.

## Para publicar (lo hace una persona)

```bash
npm login
```

```bash
cd packages/embed
```

```bash
npm publish --access public
```

Al día siguiente (o corriendo el workflow a mano) el aviso se cierra solo.

## Probarlo localmente

```bash
node scripts/check-embed-release.mjs
```

Sale con código 0 en cualquier estado y con 2 si no pudo comparar (sin red). La
lógica pura está en `scripts/lib/embed-release.mjs` y tiene sus tests en
`server/__tests__/embedRelease.test.js`.

## Subir la versión

`packages/embed/package.json` → `version`. Mientras sea la misma que la de npm y
los archivos cambien, el aviso pide subirla. Patch (`0.2.0` → `0.2.1`) para
arreglos; minor (`0.3.0`) para props nuevas.
