import fs from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Build standalone de elStudio, para subir la carpeta `dist-elstudio` a un hosting estático.
 * Aparte del build del market: no lo toca. Es una demo: no se indexa (noindex + robots cerrado).
 *   npm run build:elstudio
 */
const abs = (p) => fileURLToPath(new URL(p, import.meta.url))

const finish = {
  name: 'elstudio-finish',
  apply: 'build',
  closeBundle() {
    const out = abs('./dist-elstudio')
    fs.renameSync(`${out}/elstudio.html`, `${out}/index.html`)
    fs.writeFileSync(`${out}/robots.txt`, 'User-agent: *\nDisallow: /\n')
    fs.writeFileSync(`${out}/_headers`, ['/*', '  X-Robots-Tag: noindex, nofollow, noarchive', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: strict-origin-when-cross-origin', ''].join('\n'))
  },
}

export default defineConfig({
  publicDir: false,
  plugins: [react(), tailwindcss(), finish],
  resolve: { alias: { '@': abs('./src') } },
  build: {
    outDir: 'dist-elstudio',
    emptyOutDir: true,
    rollupOptions: { input: abs('./elstudio.html') },
  },
})
