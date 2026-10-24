import fs from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Build standalone de elStudio, para subir la carpeta `dist-elstudio` a un hosting estático
 * (Cloudflare Pages: docs/elstudio-cloudflare.md). Aparte del build del market: no lo toca.
 * Es una demo: no se indexa (noindex + robots cerrado) hasta que el cliente apruebe el sitio.
 *   npm run build:elstudio      el build
 *   npm run elstudio:deploy     build + subida a Cloudflare Pages (wrangler)
 */
const abs = (p) => fileURLToPath(new URL(p, import.meta.url))

const finish = {
  name: 'elstudio-finish',
  apply: 'build',
  closeBundle() {
    const out = abs('./dist-elstudio')
    fs.renameSync(`${out}/elstudio.html`, `${out}/index.html`)
    fs.writeFileSync(`${out}/robots.txt`, 'User-agent: *\nDisallow: /\n')
    // Sin _redirects a propósito: las Workers de Cloudflare no aceptan una regla `/* /index.html 200` y el deploy falla. Las
    // páginas de los proyectos (/proyectos/<slug>) son del mismo index.html: con «Not found handling» en
    // single-page-application (Workers) o sin 404.html (Pages), cualquier ruta devuelve la página.
    // Cabeceras de Cloudflare Pages: la demo no se indexa; los archivos de /assets llevan hash en el
    // nombre (cambian con cada build), así que se guardan en caché un año.
    fs.writeFileSync(
      `${out}/_headers`,
      [
        '/*',
        '  X-Robots-Tag: noindex, nofollow, noarchive',
        '  X-Content-Type-Options: nosniff',
        '  Referrer-Policy: strict-origin-when-cross-origin',
        '/assets/*',
        '  Cache-Control: public, max-age=31536000, immutable',
        '',
      ].join('\n'),
    )
  },
}

export default defineConfig({
  // Lo que se copia tal cual (el favicon).
  publicDir: abs('./src/studio/elstudio/public'),
  plugins: [react(), tailwindcss(), finish],
  resolve: { alias: { '@': abs('./src') } },
  build: {
    outDir: 'dist-elstudio',
    emptyOutDir: true,
    rollupOptions: { input: abs('./elstudio.html') },
  },
})
