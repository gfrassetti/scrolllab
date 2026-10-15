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

// Las fotos y el modelo van a una carpeta nueva en cada build (`/m-<versión>/capsula33/`): un navegador
// que ya visitó el sitio nunca reusa una copia vieja, y se pueden guardar para siempre. La ruta se
// reemplaza en el código antes de empaquetar (así el nombre del JS también cambia).
const VER = Date.now().toString(36)
const MEDIA = `/m-${VER}/capsula33/`
const media = {
  name: 'capsula33-media',
  apply: 'build',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').includes('/src/studio/capsula33/') || !code.includes('/studio/capsula33/')) return null
    return { code: code.split('/studio/capsula33/').join(MEDIA), map: null }
  },
}

const finish = {
  name: 'capsula33-finish',
  apply: 'build',
  closeBundle() {
    const out = abs('./dist-capsula33')
    // El HTML sale como index.html y las fotos del local viajan solo de esta página.
    fs.renameSync(`${out}/capsula33.html`, `${out}/index.html`)
    fs.cpSync(abs('./public/studio/capsula33'), `${out}${MEDIA}`.replace(/\/$/, ''), { recursive: true })
    fs.writeFileSync(`${out}/robots.txt`, 'User-agent: *\nDisallow: /\n')
    // Cloudflare: cabeceras. Nada de índice; el JS y las fotos (con la versión en la ruta) con caché largo.
    fs.writeFileSync(
      `${out}/_headers`,
      '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/m-*\n  Cache-Control: public, max-age=31536000, immutable\n/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n',
    )
    console.log('fotos y modelo en', MEDIA)
  },
}

export default defineConfig({
  publicDir: false,
  plugins: [react(), tailwindcss(), media, finish],
  resolve: { alias: { '@': abs('./src') } },
  build: {
    outDir: 'dist-capsula33',
    emptyOutDir: true,
    rollupOptions: { input: abs('./capsula33.html') },
  },
})
