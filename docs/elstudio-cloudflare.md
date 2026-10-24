# elStudio en Cloudflare Pages

El sitio de elStudio es estático: `npm run build:elstudio` arma la carpeta `dist-elstudio/` (la
página, las fotos en WebP, el favicon, `_headers` y `robots.txt`) y esa carpeta es todo lo que se
publica. No usa la API ni la base del market.

| Ajuste | Valor |
|---|---|
| Comando de build | `npm run build:elstudio` |
| Carpeta de salida | `dist-elstudio` |
| Carpeta raíz | `/` (la del repo) |
| Variable de entorno | `NODE_VERSION` = `22` |
| Framework preset | Ninguno |

`_headers` (lo escribe `vite.elstudio.config.js`): `noindex` en todo el sitio mientras sea una demo
y caché de un año para `/assets/*`, que cambian de nombre en cada build. Al no haber `404.html`,
Pages devuelve la página para cualquier ruta.

## Opción 1 — Conectar el repo (se publica solo con cada push)

1. Cloudflare → **Workers & Pages** → **Create application** → pestaña **Pages** → **Connect to Git**.
2. Elegir `gfrassetti/scrolllab`.
3. **Production branch**: la rama donde esté elStudio. Hoy vive en `claude/nice-davinci-c79v78`; si
   se mergea, `main`.
4. Completar los ajustes de la tabla de arriba y **Save and Deploy**.

Cada push a esa rama vuelve a publicar; los de otras ramas generan una vista previa con su propio link.

## Opción 2 — Desde la compu, con wrangler

Una vez:

```bash
npx wrangler login
npx wrangler pages project create elstudio --production-branch=main
```

Cada vez que se quiera publicar:

```bash
npm run elstudio:deploy
```

Hace el build y sube `dist-elstudio/` al proyecto `elstudio` (queda en `https://elstudio.pages.dev`
si el nombre está libre; si no, Cloudflare le agrega un sufijo). Wrangler avisa que el
`wrangler.jsonc` de la raíz no es de Pages: es el del embed y no se usa acá, el aviso se puede ignorar.

## Opción 3 — Subir la carpeta a mano

`npm run build:elstudio` y, en Cloudflare → **Create application** → **Pages** → **Upload assets**,
arrastrar la carpeta `dist-elstudio`.

## Cuando el cliente apruebe el sitio

- Dominio propio: en el proyecto de Pages → **Custom domains**.
- Que se indexe: sacar el `<meta name="robots" …>` de `elstudio.html` y, en
  `vite.elstudio.config.js`, la línea `X-Robots-Tag` de `_headers` y el `robots.txt` cerrado.
