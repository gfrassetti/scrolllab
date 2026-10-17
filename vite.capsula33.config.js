import fs from 'node:fs'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Build standalone de cāpsula33, para subir la carpeta `dist-capsula33` a un hosting estático.
 * Aparte del build del market: no lo toca.
 *   npm run build:capsula33          la demo: no se indexa (noindex + robots.txt cerrado)
 *   npm run build:capsula33:public   el sitio público: se indexa, con sitemap
 * La dirección del sitio (canonical, Open Graph, hreflang, sitemap) sale de CAPSULA33_URL.
 * Los íconos y la imagen para compartir salen de `node scripts/capsula33-site-assets.mjs`.
 */
const abs = (p) => fileURLToPath(new URL(p, import.meta.url))
const SITE = (process.env.CAPSULA33_URL || 'https://capsula33.estudioscrolllab.workers.dev').replace(/\/+$/, '')
// `--mode public` (o CAPSULA33_INDEX=1): el sitio que se indexa.
const argMode = process.argv[process.argv.indexOf('--mode') + 1]
const INDEX = argMode === 'public' || process.env.CAPSULA33_INDEX === '1'
const ROBOTS = INDEX ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' : 'noindex, nofollow, noarchive'
const LANGS = [
  ['es', ''],
  ['en', '?lang=en'],
  ['pt', '?lang=pt'],
]

// El HTML: la dirección del sitio y si se indexa o no.
const seo = {
  name: 'capsula33-seo',
  transformIndexHtml: (html) => html.split('%C33_URL%').join(SITE).split('%C33_ROBOTS%').join(ROBOTS),
}

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

const manifest = {
  name: 'cāpsula33 · Café de especialidad',
  short_name: 'cāpsula33',
  description: 'Café de especialidad en San Martín de los Andes.',
  lang: 'es-AR',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#05060a',
  theme_color: '#05060a',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}

function sitemap() {
  const day = new Date().toISOString().slice(0, 10)
  const alternates = [
    ...LANGS.map(([l, q]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}/${q}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>`,
  ].join('\n')
  const urls = LANGS.map(
    ([, q]) =>
      `  <url>\n    <loc>${SITE}/${q}</loc>\n    <lastmod>${day}</lastmod>\n${alternates}\n    <image:image><image:loc>${SITE}/og.jpg</image:loc></image:image>\n  </url>`,
  ).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`
}

const finish = {
  name: 'capsula33-finish',
  apply: 'build',
  closeBundle() {
    const out = abs('./dist-capsula33')
    // El HTML sale como index.html y las fotos del local viajan solo de esta página.
    fs.renameSync(`${out}/capsula33.html`, `${out}/index.html`)
    fs.cpSync(abs('./public/studio/capsula33'), `${out}${MEDIA}`.replace(/\/$/, ''), { recursive: true })
    // Favicons, íconos e imagen para compartir: en la raíz y con nombre fijo (así los piden los
    // navegadores y las redes).
    const site = abs('./public/studio/capsula33/site')
    if (fs.existsSync(site)) for (const f of fs.readdirSync(site)) fs.copyFileSync(`${site}/${f}`, `${out}/${f}`)
    else console.warn('faltan los íconos y la imagen para compartir: node scripts/capsula33-site-assets.mjs')
    fs.writeFileSync(`${out}/site.webmanifest`, `${JSON.stringify(manifest, null, 2)}\n`)
    if (INDEX) {
      fs.writeFileSync(`${out}/sitemap.xml`, sitemap())
      fs.writeFileSync(`${out}/robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)
    } else fs.writeFileSync(`${out}/robots.txt`, 'User-agent: *\nDisallow: /\n')
    // Cloudflare: cabeceras. Nada de caché (decisión del dueño): cada visita baja todo. La demo,
    // además, no se indexa.
    fs.writeFileSync(
      `${out}/_headers`,
      [
        '/*',
        ...(INDEX ? [] : ['  X-Robots-Tag: noindex, nofollow, noarchive']),
        '  Cache-Control: no-store',
        '  X-Content-Type-Options: nosniff',
        '  Referrer-Policy: strict-origin-when-cross-origin',
        '/site.webmanifest',
        '  Content-Type: application/manifest+json',
        '',
      ].join('\n'),
    )
    console.log('fotos y modelo en', MEDIA, '·', INDEX ? 'sitio público (se indexa)' : 'demo (noindex)', '·', SITE)
  },
}

export default defineConfig({
  publicDir: false,
  plugins: [react(), tailwindcss(), seo, media, finish],
  resolve: { alias: { '@': abs('./src') } },
  build: {
    outDir: 'dist-capsula33',
    emptyOutDir: true,
    rollupOptions: { input: abs('./capsula33.html') },
  },
})
