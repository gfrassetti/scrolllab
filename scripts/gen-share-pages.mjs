/**
 * Post-build: emite un index.html por demo y para /builder con sus og/twitter
 * tags (ver src/lib/sharePages.js). Vercel sirve el archivo estático antes que
 * el rewrite al SPA, así que las redes ven la tarjeta de cada demo y el SPA
 * arranca igual (mismo HTML, mismos assets).
 *
 * Corre solo después de `vite build` (lo encadena `npm run build`).
 * Las imágenes salen de `npm run gen:og` y se commitean en public/og/.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  builderSharePage,
  demoSharePage,
  publicDemoSkus,
  renderSharePage,
} from '../src/lib/sharePages.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

const baseFile = path.join(dist, 'index.html')
if (!fs.existsSync(baseFile)) {
  throw new Error('No hay dist/index.html — corré `vite build` antes.')
}
const base = fs.readFileSync(baseFile, 'utf8')
const en = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/locales/en.json'), 'utf8'))

const pages = [
  ...publicDemoSkus().map((sku) => {
    const meta = en.templates?.[sku]
    if (!meta?.vibe || !meta?.description) {
      throw new Error(`Falta templates.${sku}.vibe / description en src/i18n/locales/en.json`)
    }
    if (!fs.existsSync(path.join(dist, 'og', `${sku}.jpg`))) {
      throw new Error(`Falta public/og/${sku}.jpg — corré \`npm run gen:og\` y commiteá la imagen.`)
    }
    return demoSharePage(sku, meta)
  }),
  builderSharePage(),
]

for (const page of pages) {
  const out = path.join(dist, page.path, 'index.html')
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, renderSharePage(base, page))
}

console.log(`share pages: ${pages.length} rutas → ${pages.map((p) => p.path).join(', ')}`)
