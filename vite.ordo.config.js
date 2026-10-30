import fs from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Build standalone de ORDO, solo para mirar la demo fuera del market (`npm run build:ordo` → `dist-ordo`).
 * Aparte del build del market: no lo toca. No se indexa.
 */
const abs = (p) => fileURLToPath(new URL(p, import.meta.url))

const finish = {
  name: 'ordo-finish',
  apply: 'build',
  closeBundle() {
    const out = abs('./dist-ordo')
    fs.renameSync(`${out}/ordo.html`, `${out}/index.html`)
    fs.writeFileSync(`${out}/robots.txt`, 'User-agent: *\nDisallow: /\n')
    // Sin _redirects a propósito: las Workers de Cloudflare no aceptan una regla `/* /index.html 200` y el deploy falla. Las
    // páginas de los proyectos (/projects/<slug>) son del mismo index.html: con «Not found handling» en
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
  publicDir: abs('./src/studio/ordo/public'),
  plugins: [react(), tailwindcss(), finish],
  resolve: { alias: { '@': abs('./src') } },
  build: {
    outDir: 'dist-ordo',
    emptyOutDir: true,
    rollupOptions: { input: abs('./ordo.html') },
  },
})
