import fs from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Build standalone de cāpsula33 (el demo privado del Estudio), para subir la carpeta
 * `dist-capsula33` a un hosting estático. Aparte del build del market: no lo toca.
 *   npm run build:capsula33
 */
const abs = (p) => fileURLToPath(new URL(p, import.meta.url))

const finish = {
  name: 'capsula33-finish',
  apply: 'build',
  closeBundle() {
    const out = abs('./dist-capsula33')
    // El HTML sale como index.html y las fotos del local viajan solo de esta página.
    fs.renameSync(`${out}/capsula33.html`, `${out}/index.html`)
    fs.cpSync(abs('./public/studio/capsula33'), `${out}/studio/capsula33`, { recursive: true })
    fs.writeFileSync(`${out}/robots.txt`, 'User-agent: *\nDisallow: /\n')
    // Cloudflare: cabeceras. Nada de índice; el JS (con hash en el nombre) con caché largo; las fotos y
    // el modelo (mismo nombre en cada versión) se revalidan siempre, así un deploy nuevo se ve enseguida.
    fs.writeFileSync(
      `${out}/_headers`,
      '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/studio/*\n  Cache-Control: public, no-cache\n',
    )
  },
}

export default defineConfig({
  publicDir: false,
  plugins: [react(), tailwindcss(), finish],
  resolve: { alias: { '@': abs('./src') } },
  build: {
    outDir: 'dist-capsula33',
    emptyOutDir: true,
    rollupOptions: { input: abs('./capsula33.html') },
  },
})
