import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import archiver from 'archiver'
import { buildLicenseText } from './license.js'
import { isAllowedSectionId } from './sections.js'
import { recipeSectionId } from './catalog.js'
// Shared with the builder preview on purpose: if the two resolved `auto`
// differently, the ZIP would not match what the user approved on screen.
import { resolveSectionTheme } from '../src/lib/sectionTheme.js'
import { commerceThemeFromItems } from '../src/lib/shop/theme.js'
import { checkoutPropsFromItems } from '../src/lib/shop/checkoutProps.js'
// El mismo fondo por modelo que pinta el preview del builder.
import { modelWrapperClass } from '../src/lib/modelWrappers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

/**
 * List every file under `public/<relDir>` as a `publicAssets` entry
 * (relative to ROOT, forward-slashed). Used for asset folders with many
 * files (e.g. meridian's hero frame sequence) where hand-listing each
 * path would be unmaintainable — swap the folder's contents and the ZIP
 * picks up the new file count automatically.
 */
function publicDirAssets(relDir) {
  const abs = path.join(ROOT, 'public', relDir)
  if (!fs.existsSync(abs)) return []
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.posix.join('public', relDir, e.name))
}

/**
 * Versión de lo que entra en el ZIP de una orden. Subila cuando un arreglo
 * cambie el contenido de ZIPs ya vendidos: los armados con otra versión se
 * rearman en la próxima descarga (ver ensureOrderZip).
 *  1 — sin marca (hasta 2026-09).
 *  2 — la composición del builder trae las listas editadas y los archivos de
 *      public/ de MERIDIAN, y el fondo de cada sección igual al del preview.
 *  3 — BigNumbers muestra el valor como se escribió (1.500, 4,8, 24/7).
 *  4 — README: cómo cambiar el 3D en el código, sin las notas que no eran
 *      ciertas (el GLB de MONOLITH, los can1Image del carrusel de FIZZ).
 *  5 — Kit commerce: catálogo compartido (ShopCatalog), precios con
 *      centavos, y la ficha de un producto que no existe dice "not found".
 *  6 — Pulido mobile/tablet de los 9 templates: fotos WebP con srcset
 *      (responsiveImage), capa tpl-* y ScrollRail, zonas de toque, reduced
 *      motion sin contenido oculto y WebGL en pausa fuera de pantalla.
 *  7 — Versión calma con «reducir movimiento» (lib/motion.js: calmReveal,
 *      calmCount, la variante calm: y motion-reduce:), sin huecos ni contenido
 *      oculto en los 10 templates; paridad con PC en el teléfono: trackPointer
 *      (el 3D de FIZZ, MONOLITH y ATELIER responde al dedo), presupuesto de GPU
 *      (createFrameBudget) y sin blur animado sobre capas grandes.
 *  8 — Calma: COMIC ChapterFork sin desborde en tablet (`calm:w-full`), el
 *      aro de ATRIUM OrbitRing entero (`calm:scale-[0.7]`) y las marcas
 *      `data-pan` / `data-bleed` (MERIDIAN Location, ATRIUM PeopleScatter) que
 *      llegaron después de que se armaran ZIPs con la 7.
 */
export const PACK_VERSION = 8

const MODEL_FILES = {
  chapters: {
    page: 'src/pages/ChaptersPage.jsx',
    sectionsDir: 'src/components/sections/chapters',
    pageName: 'App.jsx',
    importPrefix: './components/sections/chapters',
  },
  nocturne: {
    page: 'src/pages/NocturnePage.jsx',
    sectionsDir: 'src/components/sections/nocturne',
    pageName: 'App.jsx',
    importPrefix: './components/sections/nocturne',
  },
  monolith: {
    page: 'src/pages/MonolithPage.jsx',
    sectionsDir: 'src/components/sections/monolith',
    pageName: 'App.jsx',
    importPrefix: './components/sections/monolith',
    publicAssets: ['public/monolith/monolith-form.glb'],
  },
  velocity: {
    page: 'src/pages/VelocityPage.jsx',
    sectionsDir: 'src/components/sections/velocity',
    pageName: 'App.jsx',
    importPrefix: './components/sections/velocity',
  },
  fizz: {
    page: 'src/pages/FizzPage.jsx',
    sectionsDir: 'src/components/sections/fizz',
    pageName: 'App.jsx',
    importPrefix: './components/sections/fizz',
    publicAssets: [
      'public/fizz/soda-bottle.glb',
      'public/fizz/studio.hdr',
      ...publicDirAssets('fizz/draco'),
    ],
  },
  atelier: {
    page: 'src/pages/AtelierPage.jsx',
    sectionsDir: 'src/components/sections/atelier',
    pageName: 'App.jsx',
    importPrefix: './components/sections/atelier',
  },
  comic: {
    page: 'src/pages/ComicPage.jsx',
    sectionsDir: 'src/components/sections/comic',
    pageName: 'App.jsx',
    importPrefix: './components/sections/comic',
  },
  unity: {
    page: 'src/pages/UnityPage.jsx',
    sectionsDir: 'src/components/sections/unity',
    pageName: 'App.jsx',
    importPrefix: './components/sections/unity',
  },
  ratio: {
    page: 'src/pages/RatioPage.jsx',
    sectionsDir: 'src/components/sections/ratio',
    pageName: 'App.jsx',
    importPrefix: './components/sections/ratio',
  },
  atrium: {
    page: 'src/pages/AtriumPage.jsx',
    sectionsDir: 'src/components/sections/atrium',
    pageName: 'App.jsx',
    importPrefix: './components/sections/atrium',
  },
  meridian: {
    page: 'src/pages/MeridianPage.jsx',
    sectionsDir: 'src/components/sections/meridian',
    pageName: 'App.jsx',
    importPrefix: './components/sections/meridian',
    // Hero frame sequence — WebP files, not a JS import, so they don't
    // get swept by the sectionsDir walk. See the REPLACE ME comment in
    // Hero.jsx for how a buyer regenerates this folder from their own
    // footage; the packer just needs every current file listed.
    publicAssets: [
      ...publicDirAssets('meridian/hero/seq'),
      // Gallery slider demo stills (2560px WebP)
      ...publicDirAssets('meridian/gallery'),
      // Location section map image (generated, 2304×1331 WebP)
      ...publicDirAssets('meridian/map'),
    ],
  },
}

const SHARED = [
  'src/lib/gsap.js',
  'src/lib/gtm.js',
  // Beat (src/lib/beat/*) NO va en el ZIP — plusvalía marketplace. Ver docs/scrolllab-beat.md.
  // Si una sección importa lib/beat, el pack fallará hasta portar a GSAP.
  // webgl (src/lib/webgl/*) tampoco es incondicional: meterlo siempre arrastraba
  // `three` como dependencia hasta en un ZIP 100% 2D (chapters, nocturne...).
  // Ver WEBGL_FILES + needsWebgl más abajo.
  'src/lib/navLinks.js',
  // srcset de las fotos de ejemplo (assets/images.js de cada modelo).
  'src/lib/responsiveImage.js',
  // Versión calma con «reducir movimiento» (las secciones la consultan).
  'src/lib/motion.js',
  // Scroll táctil normalizado en teléfonos (lo prende useLenis).
  'src/lib/touchScroll.js',
  'src/hooks/useLenis.js',
  'src/hooks/useMobileMenu.js',
  'src/hooks/useReducedMotion.js',
  'src/components/SmoothScrollProvider.jsx',
  // Barra de scroll propia de cada template (la monta la página).
  'src/components/ScrollRail.jsx',
  'src/index.css',
  // Micro-interacciones comunes (tpl-*), las importa index.css.
  'src/styles/tpl.css',
  'src/main.jsx',
  'index.html',
]

/** Sin el proxy a /api del marketplace: el template vendido no habla con nada. */
const TEMPLATE_VITE_CONFIG = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
`

/**
 * Toolchain del proyecto vendido. Son build-time, así que van a devDependencies
 * aunque el código las importe; el resto de las runtime salen de los imports.
 */
const TEMPLATE_DEV_DEPENDENCIES = [
  'vite',
  '@vitejs/plugin-react',
  '@tailwindcss/vite',
  'tailwindcss',
]

const ROOT_PKG = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
)

/** `three/examples/jsm/…` → `three`; `@gsap/react` queda entero. */
function packageNameOf(specifier) {
  const parts = specifier.split('/')
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

function bareImports(source) {
  return [
    ...source.matchAll(/from\s+'([^'.][^']*)'/g),
    ...source.matchAll(/import\s*\(\s*'([^'.][^']*)'\s*\)/g),
  ].map((m) => packageNameOf(m[1]))
}

function versionOf(name) {
  return ROOT_PKG.dependencies?.[name] || ROOT_PKG.devDependencies?.[name]
}

/**
 * package.json propio del template.
 *
 * Copiar el del marketplace mandaba al comprador un `npm run dev` que arranca
 * `nodemon server/index.js` (carpeta que el ZIP no trae) y lo obligaba a
 * instalar mongoose, passport, mercadopago y compañía para una landing.
 * Acá las dependencias salen de lo que el código empaquetado importa de verdad.
 */
function buildTemplatePackageJson(name, sources) {
  const used = new Set(sources.flatMap(bareImports))

  const dependencies = {}
  for (const dep of [...used].sort()) {
    if (TEMPLATE_DEV_DEPENDENCIES.includes(dep)) continue
    const version = versionOf(dep)
    if (version) dependencies[dep] = version
  }

  const devDependencies = {}
  for (const dep of TEMPLATE_DEV_DEPENDENCIES) {
    const version = versionOf(dep)
    if (version) devDependencies[dep] = version
  }

  return `${JSON.stringify(
    {
      name,
      private: true,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies,
      devDependencies,
    },
    null,
    2,
  )}\n`
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

/**
 * index.html limpio para los ZIP vendidos: sin el SEO, canonical ni
 * script de theme del marketplace — solo fuentes, viewport y root.
 */
function buildTemplateIndexHtml(title) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Scrollytelling page built with a SCROLLLAB template." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Mr+Bedfort&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@300..700&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Anton&family=Oswald:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

/**
 * Props como atributos JSX. Los textos van en línea; las listas (links,
 * stats, cards…) las resuelve `hoist`, que las declara como constante arriba
 * del App.jsx y devuelve el nombre. Sin `hoist` se descartan: antes se
 * descartaban siempre, y lo editado en una lista no llegaba al ZIP.
 */
function propsToJsx(props, hoist = null) {
  if (!props || typeof props !== 'object') return ''
  return Object.entries(props)
    .map(([k, v]) => {
      if (typeof v === 'string') return ` ${k}={${JSON.stringify(v)}}`
      if (hoist && Array.isArray(v) && v.length) return ` ${k}={${hoist(k, v)}}`
      return ''
    })
    .join('')
}

const JS_IDENTIFIER = /^[A-Za-z_$][\w$]*$/

/** Una lista de la receta como literal JS legible: un item por línea. */
function listLiteral(items) {
  const rows = items.map((item) => {
    const fields = Object.entries(item || {})
      .filter(([, v]) => typeof v === 'string')
      .map(([k, v]) => `${JS_IDENTIFIER.test(k) ? k : JSON.stringify(k)}: ${JSON.stringify(v)}`)
    return `  { ${fields.join(', ')} },`
  })
  return `[\n${rows.join('\n')}\n]`
}

/** Los `checkout*` del ProductGrid son para la ruta /checkout, no para la grilla. */
function stripCheckoutProps(props) {
  if (!props || typeof props !== 'object') return props
  const out = {}
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('checkout')) continue
    out[key] = value
  }
  return out
}

/** Solo entra si alguna fuente empaquetada de verdad importa `lib/webgl` (ver needsWebgl). */
const WEBGL_FILES = [
  'src/lib/webgl/index.js',
  'src/lib/webgl/stage.js',
  'src/lib/webgl/orbit.js',
  'src/lib/webgl/damp.js',
  'src/lib/webgl/coverPlane.js',
  'src/lib/webgl/gltf.js',
]

/** El sufijo `lib/webgl` sobrevive a cualquier reescritura de `../` relativo. */
function needsWebgl(sources) {
  return sources.some((s) => /['"][^'"]*\blib\/webgl(?:\/[^'"]*)?['"]/.test(s))
}

/** Los `publicAssets` de un modelo (ver MODEL_FILES), en la misma ruta bajo `prefix`. */
function appendPublicAssets(archive, cfg, prefix = '') {
  for (const rel of cfg?.publicAssets || []) {
    const abs = path.join(ROOT, rel)
    if (!fs.existsSync(abs)) continue
    archive.append(fs.readFileSync(abs), {
      name: `${prefix}${rel.replace(/\\/g, '/')}`,
    })
  }
}

function appendWebglIfNeeded(archive, sources, prefix = '') {
  if (!needsWebgl(sources)) return
  for (const rel of WEBGL_FILES) {
    const abs = path.join(ROOT, rel)
    if (!fs.existsSync(abs)) continue
    const body = fs.readFileSync(abs)
    sources.push(body.toString('utf8'))
    archive.append(body, { name: `${prefix}${rel}` })
  }
}

const SHOP_FILES = [
  'src/lib/shop/products.js',
  'src/lib/shop/catalog.js',
  'src/lib/shop/ShopCatalog.jsx',
  'src/lib/shop/cartStore.js',
  'src/lib/shop/checkoutAdapter.js',
  'src/lib/shop/theme.js',
  'src/lib/shop/ShopTheme.jsx',
]

/** Commerce UI shipped as routes (not scroll sections), when recipe has ProductGrid. */
const SHOP_ROUTE_COMPONENTS = [
  'src/components/sections/commerce/ProductDetail.jsx',
  'src/components/sections/commerce/CartDrawer.jsx',
  'src/components/sections/commerce/Checkout.jsx',
  'src/components/sections/commerce/ShopChrome.jsx',
]

/**
 * Lo que el builder no edita y el comprador cambia en el código: el objeto 3D
 * de los heroes (forma o GLB propio) y las latas del carrusel de FIZZ. El
 * README es la guía: tiene que decir la verdad para cada ZIP (el template
 * completo trae el GLB de la demo; una composición del builder, no).
 */
const fizzHero3dNote = ({ demoGlb }) => `## 3D model (hero)

${
  demoGlb
    ? 'The demo passes `public/fizz/soda-bottle.glb` as `modelUrl` to `HeroBubbles`.'
    : '`HeroBubbles` draws a glass bottle in code (`flavor`: berry / citrus / tropical / mint sets the stage color and the drink tint).'
} The headline is drawn inside the same canvas, so the glass refracts it. The label prints \`canLabel\`, or your own artwork with \`canImage\`. To use your own model:

1. Export it as **GLB** (binary glTF, a single file; GLTF also works).
2. Drop it in \`public/\`, e.g. \`public/my-bottle.glb\`.
3. In \`src/App.jsx\`: \`<HeroBubbles modelUrl="/my-bottle.glb" />\`.

It is auto-centered and auto-scaled, and keeps the scroll spin, the idle float and the rising bubbles. A hosted \`https://\` URL also works. Name the meshes \`glass\`, \`liquid\`, \`label\`, \`stopper\`, \`seal\` and \`wire\` (or \`cap\` for a crown cap) to get the see-through glass, the flavor tint, the bubbles inside, the label and the stopper materials; any other model keeps its own materials.${
  demoGlb
    ? ' Without `modelUrl`, a simpler bottle built in code stands in.'
    : ''
}
`

const FIZZ_CANS_NOTE = `## Can images (carousel)

\`CanCarousel\` takes a \`cans\` list, one object per can:

\`\`\`jsx
<CanCarousel cans={[{ name: 'Citrus', note: 'Lemon & lime', color: '#ffb400', image: '/can-1.png' }]} />
\`\`\`

Images can be PNG, SVG, WebP or JPG in \`public/\`, or a hosted \`https://\` URL. A can without \`image\` renders the SVG illustration, with \`canLabel\` printed on it.
`

const monolith3dNote = ({ sampleGlb }) => `## 3D object (hero)

\`HeroThree\` renders a built-in wireframe shape: \`shape\` = \`icosahedron\` (default), \`box\`, \`octahedron\`, \`torus\` or \`sphere\`. To use your own model instead:

1. Export it as **GLB** (binary glTF, a single file; GLTF also works).
2. Drop it in \`public/\`, e.g. \`public/my-object.glb\`.
3. In \`src/App.jsx\`: \`<HeroThree modelUrl="/my-object.glb" />\`.

It is auto-centered, auto-scaled and re-materialized as a carbon wireframe to keep the brutalist look. A hosted \`https://\` URL also works.${
  sampleGlb
    ? ' The ZIP includes a sample model: `<HeroThree modelUrl="/monolith/monolith-form.glb" />`.'
    : ''
}
`

/** Notas del template completo (su ZIP trae los GLB de public/). */
const MODEL_3D_NOTES = {
  fizz: `${fizzHero3dNote({ demoGlb: true })}\n${FIZZ_CANS_NOTE}`,
  monolith: monolith3dNote({ sampleGlb: true }),
}

/** Section folders shared across models — packed when a page imports them. */
const CROSS_MODEL_DIRS = ['contact']

const CONTACT_FORM_NOTE = `## Contact form

The form ships in **demo** mode: it validates, shows the sending / success states
and resets, but nothing is sent anywhere. To receive real messages:

1. In \`src/App.jsx\`, pass your endpoint: \`<ContactForm endpoint="https://…" />\`.
2. The form sends \`POST\` with JSON \`{ name, email, message }\` and treats any
   non-2xx response as an error.
3. Any backend works — your own API, a serverless function, or a form service.

Styling follows the \`theme\` prop (\`auto\`, \`chapters\`, \`nocturne\`, \`monolith\`,
\`velocity\`, \`fizz\`, \`atelier\`, \`comic\`, \`unity\`, \`ratio\`, \`atrium\`). With \`auto\` it inherits the surrounding
background and text color. A hidden honeypot field filters basic bots.
`

function rewritePageToApp(content, model) {
  // ChaptersPage etc. import from '../components/...' — in packaged App they live under ./components
  return content
    .replaceAll("from '../components/", "from './components/")
    .replaceAll(`export default function ${model.charAt(0).toUpperCase() + model.slice(1)}Page`, 'export default function App')
    .replace(/export default function \w+Page/, 'export default function App')
}

/**
 * Trazabilidad por comprador (docs/ip-protection-brief.md §3.5). Cada ZIP lleva
 * el número de orden en TEXTO VISIBLE (token estable `SCROLLLAB-LICENSE`, para
 * buscar filtraciones en GitHub/marketplaces) y, además, un identificador
 * INVISIBLE de respaldo por si borran lo visible. Las marcas van repartidas en
 * varios archivos (App.jsx, index.css, README) — quitar una no borra la traza.
 * Nada de esto altera el runtime: son sólo comentarios.
 */

// Código corto y estable por orden. No expone el orderId directamente (hay que
// recomputarlo contra la tabla de órdenes), pero es determinístico y recuperable.
function fingerprintId({ orderId, email } = {}) {
  return crypto
    .createHash('sha256')
    .update(`${orderId || ''}|${email || ''}`)
    .digest('hex')
    .slice(0, 16)
}

// Marca invisible: el payload se codifica como bits en caracteres de ancho cero
// (U+200B/U+200C) entre dos centinelas (U+2060). Va SIEMPRE dentro de un
// comentario — fuera de un comentario, U+200B rompería el parseo del build.
const FP_ZERO = '​'
const FP_ONE = '‌'
const FP_EDGE = '⁠⁠'

function encodeInvisible(payload) {
  const bits = []
  for (const byte of Buffer.from(payload, 'utf8')) {
    for (let b = 7; b >= 0; b--) bits.push((byte >> b) & 1)
  }
  return FP_EDGE + bits.map((bit) => (bit ? FP_ONE : FP_ZERO)).join('') + FP_EDGE
}

/** Recupera el payload invisible de un archivo filtrado (para trazar la fuga). */
export function extractInvisibleMark(content) {
  const text = String(content || '')
  const start = text.indexOf(FP_EDGE)
  if (start === -1) return null
  const from = start + FP_EDGE.length
  const end = text.indexOf(FP_EDGE, from)
  if (end === -1) return null
  const bits = []
  for (const ch of text.slice(from, end)) {
    if (ch === FP_ONE) bits.push(1)
    else if (ch === FP_ZERO) bits.push(0)
  }
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let v = 0
    for (let b = 0; b < 8; b++) v = (v << 1) | bits[i + b]
    bytes.push(v)
  }
  return bytes.length ? Buffer.from(bytes).toString('utf8') : null
}

/** Id de fingerprint (público) para el test / verificación de fugas. */
export function licenseFingerprint(licenseMeta) {
  return licenseMeta ? `SL:${fingerprintId(licenseMeta)}` : null
}

function invisibleMark(licenseMeta) {
  return licenseMeta ? encodeInvisible(`SL:${fingerprintId(licenseMeta)}`) : ''
}

function fingerprintComment(licenseMeta = {}) {
  const { orderId, email, date } = licenseMeta
  const inv = invisibleMark(licenseMeta)
  return `/**
 * SCROLLLAB-LICENSE ${orderId || 'unknown'}
 * Licencia regular emitida a ${email || 'unknown'}${date ? ` el ${date}` : ''}.
 * Uso permitido según LICENSE.txt (incluido en este ZIP). Redistribuir,
 * revender o republicar el código fuente está prohibido. Este encabezado
 * identifica al comprador original; quitarlo no cambia los términos.${inv ? `\n * ${inv}` : ''}
 */
`
}

function stampApp(appSrc, licenseMeta) {
  return licenseMeta ? `${fingerprintComment(licenseMeta)}\n${appSrc}` : appSrc
}

// Marca de respaldo en archivos "silenciosos": si el comprador borra el
// encabezado de App.jsx, la traza sigue viva en index.css y en el README.
function stampCss(cssText, licenseMeta) {
  if (!licenseMeta) return cssText
  const { orderId } = licenseMeta
  return `${cssText}\n/* SCROLLLAB-LICENSE ${orderId || 'unknown'} — identifica al comprador original (ver LICENSE.txt).${invisibleMark(licenseMeta)} */\n`
}

function stampReadme(md, licenseMeta) {
  if (!licenseMeta) return md
  const { orderId } = licenseMeta
  return `${md}\n<!-- SCROLLLAB-LICENSE ${orderId || 'unknown'} — identifica al comprador original (ver LICENSE.txt).${invisibleMark(licenseMeta)} -->\n`
}

function createZip(destPath) {
  ensureDir(path.dirname(destPath))
  const output = fs.createWriteStream(destPath)
  const archive = archiver('zip', { zlib: { level: 9 } })
  const done = new Promise((resolve, reject) => {
    output.on('close', resolve)
    archive.on('error', reject)
  })
  archive.pipe(output)
  return { archive, done }
}

/**
 * Appends one runnable model project (shared files + App.jsx + sections + README)
 * under `prefix`. With an empty prefix it fills the root of a single-template
 * ZIP; the bundle calls it once per model with `<model>/`.
 */
function appendModelProject(archive, model, prefix = '', licenseMeta = null) {
  const cfg = MODEL_FILES[model]
  if (!cfg) throw new Error(`Unknown model: ${model}`)

  // El package.json se arma al final, con lo que estos fuentes importen.
  const sources = [TEMPLATE_VITE_CONFIG]

  for (const rel of SHARED) {
    const abs = path.join(ROOT, rel)
    if (!fs.existsSync(abs)) continue
    let body = fs.readFileSync(abs)
    if (rel === 'index.html') {
      body = Buffer.from(
        buildTemplateIndexHtml(`${model.toUpperCase()} — SCROLLLAB template`),
      )
    } else if (rel === 'src/index.css') {
      body = Buffer.from(stampCss(body.toString('utf8'), licenseMeta))
    }
    sources.push(body.toString('utf8'))
    archive.append(body, { name: `${prefix}${rel}` })
  }

  archive.append(TEMPLATE_VITE_CONFIG, { name: `${prefix}vite.config.js` })

  // main.jsx already imports App — we write App.jsx from the model page
  const pageSrc = read(cfg.page)
  const appSrc = stampApp(rewritePageToApp(pageSrc, model), licenseMeta)
  sources.push(appSrc)
  archive.append(appSrc, { name: `${prefix}src/App.jsx` })

  const sectionDirs = [
    model,
    ...CROSS_MODEL_DIRS.filter((dir) => pageSrc.includes(`/sections/${dir}/`)),
  ]

  for (const dir of sectionDirs) {
    const sectionsAbs = path.join(ROOT, 'src', 'components', 'sections', dir)
    if (!fs.existsSync(sectionsAbs)) continue

    const walk = (absDir, relBase) => {
      for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
        const abs = path.join(absDir, entry.name)
        const rel = path.posix.join(relBase, entry.name)
        if (entry.isDirectory()) {
          walk(abs, rel)
          continue
        }
        const body = fs.readFileSync(abs)
        if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
          sources.push(body.toString('utf8'))
        }
        archive.append(body, {
          name: `${prefix}src/components/sections/${rel}`,
        })
      }
    }

    walk(sectionsAbs, dir)
  }

  appendPublicAssets(archive, cfg, prefix)

  appendWebglIfNeeded(archive, sources, prefix)

  archive.append(buildTemplatePackageJson(`scrolllab-${model}`, sources), {
    name: `${prefix}package.json`,
  })

  const licenseNote = prefix
    ? 'See LICENSE.txt at the root of this bundle for usage terms.'
    : 'See LICENSE.txt for usage terms.'
  archive.append(
    stampReadme(
      `# ${model.toUpperCase()} — SCROLLLAB\n\n\`\`\`\nnpm install\nnpm run dev\n\`\`\`\n\n${licenseNote}\n${
        MODEL_3D_NOTES[model] ? `\n${MODEL_3D_NOTES[model]}` : ''
      }${sectionDirs.includes('contact') ? `\n${CONTACT_FORM_NOTE}` : ''}`,
      licenseMeta,
    ),
    { name: `${prefix}README.md` },
  )
}

/**
 * Pack a fixed model template into a zip at destPath.
 */
export async function packFixedTemplate({ model, destPath, licenseMeta }) {
  const { archive, done } = createZip(destPath)

  appendModelProject(archive, model, '', licenseMeta)

  archive.append(
    buildLicenseText({
      siteName: 'SCROLLLAB',
      orderId: licenseMeta.orderId,
      email: licenseMeta.email,
      purchaseCode: licenseMeta.purchaseCode,
      sku: model,
      date: licenseMeta.date,
    }),
    { name: 'LICENSE.txt' },
  )

  await archive.finalize()
  await done
  return destPath
}

/**
 * Pack every model of the bundle into one zip — each in its own folder,
 * each installable on its own, with a single license at the root.
 */
export async function packBundleTemplate({ models, destPath, licenseMeta }) {
  const list = (models || []).filter((model) => MODEL_FILES[model])
  if (!list.length) throw new Error('Bundle sin modelos')

  const { archive, done } = createZip(destPath)

  for (const model of list) {
    appendModelProject(archive, model, `${model}/`, licenseMeta)
  }

  archive.append(
    buildLicenseText({
      siteName: 'SCROLLLAB',
      orderId: licenseMeta.orderId,
      email: licenseMeta.email,
      purchaseCode: licenseMeta.purchaseCode,
      sku: `bundle:${list.join(',')}`,
      date: licenseMeta.date,
    }),
    { name: 'LICENSE.txt' },
  )

  archive.append(
    stampReadme(
      `# SCROLLLAB — bundle\n\n${list.length} models, one folder each. Every folder is a standalone Vite project:\n\n${list
        .map((model) => `- \`${model}/\` — ${model.toUpperCase()}`)
        .join('\n')}\n\n\`\`\`\ncd ${list[0]}\nnpm install\nnpm run dev\n\`\`\`\n\nThe license at the root covers all ${list.length} models. See LICENSE.txt.\n`,
      licenseMeta,
    ),
    { name: 'README.md' },
  )

  await archive.finalize()
  await done
  return destPath
}

/**
 * Appends one runnable custom composition (the builder recipe) under `prefix`.
 * Empty prefix: the root of a single-composition ZIP. Returns the recipe ids
 * so the caller writes the license.
 * recipe: string[] (legacy) or [{ id, props? }, ...]
 */
function appendCustomProject(archive, recipe, prefix = '', licenseMeta = null) {
  const sources = [TEMPLATE_VITE_CONFIG]

  for (const rel of SHARED) {
    const abs = path.join(ROOT, rel)
    if (!fs.existsSync(abs)) continue
    let body = fs.readFileSync(abs)
    if (rel === 'index.html') {
      body = Buffer.from(buildTemplateIndexHtml('Custom composition — SCROLLLAB'))
    } else if (rel === 'src/index.css') {
      body = Buffer.from(stampCss(body.toString('utf8'), licenseMeta))
    }
    sources.push(body.toString('utf8'))
    archive.append(body, { name: `${prefix}${rel}` })
  }

  archive.append(TEMPLATE_VITE_CONFIG, { name: `${prefix}vite.config.js` })

  const entries = (recipe || []).map((entry) => ({
    id: recipeSectionId(entry),
    props:
      entry && typeof entry === 'object' && !Array.isArray(entry)
        ? entry.props
        : undefined,
  }))

  const needsShop = entries.some((e) => String(e.id || '').startsWith('commerce/'))
  if (needsShop) {
    for (const rel of [...SHOP_FILES, ...SHOP_ROUTE_COMPONENTS]) {
      const abs = path.join(ROOT, rel)
      if (!fs.existsSync(abs)) continue
      const body = fs.readFileSync(abs)
      sources.push(body.toString('utf8'))
      archive.append(body, { name: `${prefix}${rel}` })
    }
    // Fotos del catálogo demo importadas por products.js.
    const shopAssets = path.join(ROOT, 'src', 'lib', 'shop', 'assets')
    if (fs.existsSync(shopAssets)) {
      for (const file of fs.readdirSync(shopAssets)) {
        archive.append(fs.readFileSync(path.join(shopAssets, file)), {
          name: `${prefix}src/lib/shop/assets/${file}`,
        })
      }
    }
  }

  const imports = []
  const renderLines = []
  const seen = new Set()
  const packedModels = new Set()
  // Listas editadas en el builder: una constante por prop, arriba del App.
  const dataConsts = []
  // Nombre de la constante con los productos del ProductGrid, si se editaron.
  let shopProducts = null
  const constNames = new Set()
  const hoistFor = (component) => (key, list) => {
    const base = `${component[0].toLowerCase()}${component.slice(1)}${key[0].toUpperCase()}${key.slice(1)}`
    let name = base
    for (let n = 2; constNames.has(name); n += 1) name = `${base}${n}`
    constNames.add(name)
    dataConsts.push(`const ${name} = ${listLiteral(list)}`)
    return name
  }

  // Same order the preview used, so `auto` resolves to the same neighbour.
  const modelIds = entries.map((entry) => String(entry.id || '').split('/')[0])

  entries.forEach((entry, i) => {
    const sectionId = entry.id
    if (!isAllowedSectionId(sectionId)) return
    const [model, component] = sectionId.split('/')
    if (!model || !component) return
    const fileRel = path.posix.join(
      'src/components/sections',
      model,
      `${component}.jsx`,
    )
    const abs = path.join(ROOT, fileRel)
    const sectionsRoot = path.join(ROOT, 'src', 'components', 'sections')
    if (!abs.startsWith(sectionsRoot)) return
    if (!fs.existsSync(abs)) return

    // Pack every .jsx in the model folder once (helpers like ScrollFog).
    if (!packedModels.has(model)) {
      packedModels.add(model)
      const modelDir = path.join(ROOT, 'src', 'components', 'sections', model)
      if (fs.existsSync(modelDir)) {
        // Recursivo: las secciones importan sus fotos desde `assets/`, y sin
        // ellas el ZIP del comprador ni siquiera compila.
        const walk = (absDir, relBase) => {
          for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
            const abs = path.join(absDir, entry.name)
            const rel = path.posix.join(relBase, entry.name)
            if (entry.isDirectory()) {
              walk(abs, rel)
              continue
            }
            const body = fs.readFileSync(abs)
            if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
              sources.push(body.toString('utf8'))
            }
            archive.append(body, { name: `${prefix}${rel}` })
          }
        }
        walk(modelDir, path.posix.join('src/components/sections', model))
      }
      // Lo que el modelo sirve desde public/ (los frames del hero de MERIDIAN,
      // su galería y su mapa): sin esto la composición compila, pero las
      // secciones piden archivos que no están y el hero rompe el canvas.
      appendPublicAssets(archive, MODEL_FILES[model], prefix)
    }

    if (!seen.has(sectionId)) {
      seen.add(sectionId)
      imports.push(
        `import ${component}_${model} from './components/sections/${model}/${component}'`,
      )
    }

    const wrapper = modelWrapperClass(model)
    const Comp = `${component}_${model}`
    const theme = resolveSectionTheme(sectionId, entry.props, modelIds, i)
    const ownProps =
      sectionId === 'commerce/ProductGrid'
        ? stripCheckoutProps(entry.props)
        : entry.props
    const hoist = hoistFor(component)
    const attrs = propsToJsx(theme ? { ...ownProps, theme } : ownProps, (key, list) => {
      const name = hoist(key, list)
      // El catálogo editado lo usa también la tienda (ficha, carrito, checkout).
      if (sectionId === 'commerce/ProductGrid' && key === 'products' && !shopProducts) {
        shopProducts = name
      }
      return name
    })
    renderLines.push(
      `        <div key="${i}" className="${wrapper}"><${Comp}${attrs} /></div>`,
    )
  })

  const shopTheme = needsShop
    ? commerceThemeFromItems(
        entries.map((entry) => ({
          id: entry.id,
          props: entry.props,
        })),
        resolveSectionTheme,
      )
    : 'auto'

  const checkoutAttrs = needsShop ? propsToJsx(checkoutPropsFromItems(entries)) : ''

  const dataBlock = dataConsts.length ? `\n${dataConsts.join('\n\n')}\n` : ''

  let appSrc
  if (needsShop) {
    appSrc = `import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SmoothScrollProvider from './components/SmoothScrollProvider'
import ProductDetail from './components/sections/commerce/ProductDetail'
import Checkout from './components/sections/commerce/Checkout'
import ShopChrome from './components/sections/commerce/ShopChrome'
import { ShopThemeProvider } from './lib/shop/ShopTheme'
import { ShopCatalogProvider } from './lib/shop/ShopCatalog'
${imports.join('\n')}
${dataBlock}
function Home() {
  return (
    <SmoothScrollProvider>
      <div id="top">
${renderLines.join('\n')}
      </div>
      <ShopChrome />
    </SmoothScrollProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ShopThemeProvider
        theme="${shopTheme}"
        className="min-h-svh bg-[color:var(--shop-bg)] text-[color:var(--shop-fg)]"
      >
        <ShopCatalogProvider${shopProducts ? ` products={${shopProducts}}` : ''}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/product/:productId"
              element={
                <>
                  <ProductDetail />
                  <ShopChrome />
                </>
              }
            />
            <Route
              path="/checkout"
              element={
                <>
                  <Checkout${checkoutAttrs} />
                  <ShopChrome />
                </>
              }
            />
          </Routes>
        </ShopCatalogProvider>
      </ShopThemeProvider>
    </BrowserRouter>
  )
}
`
  } else {
    appSrc = `import SmoothScrollProvider from './components/SmoothScrollProvider'
${imports.join('\n')}
${dataBlock}
export default function App() {
  return (
    <SmoothScrollProvider>
      <div id="top">
${renderLines.join('\n')}
      </div>
    </SmoothScrollProvider>
  )
}
`
  }
  appSrc = stampApp(appSrc, licenseMeta)
  sources.push(appSrc)
  archive.append(appSrc, { name: `${prefix}src/App.jsx` })
  appendWebglIfNeeded(archive, sources, prefix)
  archive.append(buildTemplatePackageJson('scrolllab-custom', sources), {
    name: `${prefix}package.json`,
  })

  const idList = entries.map((e) => e.id).filter(Boolean)
  let readme = `# Composición custom — SCROLLLAB\n\nReceta:\n${idList.map((r) => `- ${r}`).join('\n')}\n\n\`\`\`\nnpm install\nnpm run dev\n\`\`\`\n`
  // Una composición no trae los GLB de las demos: las notas lo dicen así.
  if (idList.includes('fizz/HeroBubbles')) readme += `\n${fizzHero3dNote({ demoGlb: false })}`
  if (idList.includes('fizz/CanCarousel')) readme += `\n${FIZZ_CANS_NOTE}`
  if (idList.includes('monolith/HeroThree')) {
    readme += `\n${monolith3dNote({ sampleGlb: false })}`
  }
  if (idList.includes('contact/ContactForm')) readme += `\n${CONTACT_FORM_NOTE}`
  if (needsShop) {
    const productsNote = shopProducts
      ? `Products: the ones you edited in the builder are \`${shopProducts}\` in \`src/App.jsx\`, passed to \`<ProductGrid products>\` and to \`<ShopCatalogProvider products>\` (the product page, cart and checkout read it from there).`
      : 'Products: the demo catalog in `src/lib/shop/products.js`. To use yours, pass the same list to `<ProductGrid products>` and `<ShopCatalogProvider products>` in `src/App.jsx`.'
    readme += `\n## Commerce kit\n\nThe scroll page includes the product grid. Shop flows use routes:\n\n- \`/\` — story + ProductGrid\n- \`/product/:productId\` — PDP\n- Cart — overlay drawer (Cart button)\n- \`/checkout\` — contact + shipping + delivery + payment on the left, sticky order summary with thumbnails, quantity steppers and discount code on the right\n\nEvery label on \`/checkout\` is a prop of \`<Checkout />\` in \`src/App.jsx\` (copy, steps, countries, shipping costs, discount code, trust list). Shipping math: flat rate, express rate and free-shipping threshold.\n\n${productsNote} Each product: \`{ name, price, blurb, img }\`; size or colour pickers use \`variants\` (see \`src/lib/shop/products.js\`).\n\nFiles: \`src/lib/shop/\` + commerce components.\n\nCheckout ships in **mock** mode. To connect payments:\n\n1. Open \`src/lib/shop/checkoutAdapter.js\`\n2. Replace \`createCheckout\` with your Mercado Pago / Stripe backend call\n3. Keep the same return shape: \`{ ok, orderId, message, mode }\`\n`
  }

  if (prefix) readme += '\nSee LICENSE.txt at the root of this ZIP for usage terms.\n'
  archive.append(stampReadme(readme, licenseMeta), { name: `${prefix}README.md` })
  return { idList }
}

/**
 * Pack a custom builder recipe.
 * recipe: string[] (legacy) or [{ id, props? }, ...]
 */
export async function packCustomTemplate({ recipe, destPath, licenseMeta }) {
  const { archive, done } = createZip(destPath)
  const { idList } = appendCustomProject(archive, recipe, '', licenseMeta)
  archive.append(
    buildLicenseText({
      siteName: 'SCROLLLAB',
      orderId: licenseMeta.orderId,
      email: licenseMeta.email,
      purchaseCode: licenseMeta.purchaseCode,
      sku: `custom:${idList.join(',')}`,
      date: licenseMeta.date,
    }),
    { name: 'LICENSE.txt' },
  )
  await archive.finalize()
  await done
  return destPath
}

const isCustomItem = (item) =>
  item?.sku === 'custom' ||
  String(item?.sku || '').startsWith('custom:') ||
  !!item?.recipe?.length

/**
 * El ZIP de una orden. Un ítem: el de siempre (template, bundle o composición
 * en la raíz). Varios (el carrito deja comprar más de uno a la vez): una
 * carpeta por proyecto, cada una se instala sola, y una licencia en la raíz
 * que cubre todo, igual que el bundle. Un modelo que viene en el bundle y
 * también suelto se empaqueta una vez.
 */
export async function packOrderTemplate({
  items,
  destPath,
  licenseMeta,
  bundleModels = [],
}) {
  const list = (items || []).filter(Boolean)
  if (!list.length) throw new Error('Orden sin ítems')
  if (list.length === 1) {
    const [item] = list
    if (isCustomItem(item)) {
      return packCustomTemplate({ recipe: item.recipe || [], destPath, licenseMeta })
    }
    if (item.sku === 'bundle') {
      return packBundleTemplate({ models: bundleModels, destPath, licenseMeta })
    }
    return packFixedTemplate({ model: item.sku, destPath, licenseMeta })
  }

  const { archive, done } = createZip(destPath)
  const folders = []
  const skus = []
  const packed = new Set()
  const addModel = (model) => {
    if (packed.has(model)) return
    if (!MODEL_FILES[model]) throw new Error(`Unknown model: ${model}`)
    packed.add(model)
    appendModelProject(archive, model, `${model}/`, licenseMeta)
    folders.push({ folder: model, label: model.toUpperCase() })
  }

  for (const item of list) {
    if (isCustomItem(item)) {
      const folder = packed.has('custom') ? `custom-${folders.length + 1}` : 'custom'
      packed.add(folder)
      const { idList } = appendCustomProject(
        archive,
        item.recipe || [],
        `${folder}/`,
        licenseMeta,
      )
      folders.push({ folder, label: `Custom composition (${idList.length} sections)` })
      skus.push(`custom:${idList.join(',')}`)
    } else if (item.sku === 'bundle') {
      const models = bundleModels.filter((model) => MODEL_FILES[model])
      if (!models.length) throw new Error('Bundle sin modelos')
      models.forEach(addModel)
      skus.push(`bundle:${models.join(',')}`)
    } else {
      addModel(item.sku)
      skus.push(item.sku)
    }
  }

  archive.append(
    buildLicenseText({
      siteName: 'SCROLLLAB',
      orderId: licenseMeta.orderId,
      email: licenseMeta.email,
      purchaseCode: licenseMeta.purchaseCode,
      sku: skus.join(' + '),
      date: licenseMeta.date,
    }),
    { name: 'LICENSE.txt' },
  )
  archive.append(
    stampReadme(
      `# SCROLLLAB — your purchase\n\n${folders.length} projects, one folder each. Every folder is a standalone Vite project:\n\n${folders
        .map(({ folder, label }) => `- \`${folder}/\` — ${label}`)
        .join('\n')}\n\n\`\`\`\ncd ${folders[0].folder}\nnpm install\nnpm run dev\n\`\`\`\n\nThe license at the root covers everything in this ZIP. See LICENSE.txt.\n`,
      licenseMeta,
    ),
    { name: 'README.md' },
  )

  await archive.finalize()
  await done
  return destPath
}

export function signDownloadToken({ orderId, userId, secret, ttlSeconds }) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = Buffer.from(JSON.stringify({ orderId, userId, exp })).toString(
    'base64url',
  )
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyDownloadToken(token, secret) {
  const [payload, sig] = String(token).split('.')
  if (!payload || !sig) return null
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  if (sig.length !== expected.length) return null
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (!crypto.timingSafeEqual(a, b)) return null
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
  if (data.exp < Math.floor(Date.now() / 1000)) return null
  return data
}

export function storageRoot(explicitDir) {
  const dir = path.resolve(
    explicitDir || process.env.STORAGE_DIR || path.join(ROOT, 'storage', 'orders'),
  )
  ensureDir(dir)
  return dir
}
