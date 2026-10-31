import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import archiver from 'archiver'
import { buildLicenseText } from './license.js'
import { stampApp, stampCss, stampReadme } from './licenseWatermark.js'

// API pública que antes vivía acá (tests, scripts y rutas la importan de este módulo).
export { extractInvisibleMark, licenseFingerprint } from './licenseWatermark.js'
export { signDownloadToken, verifyDownloadToken } from './downloadToken.js'
import { isAllowedSectionId } from './sections.js'
import { recipeSectionId } from './catalog.js'
// Shared with the builder preview on purpose: if the two resolved `auto`
// differently, the ZIP would not match what the user approved on screen.
import { resolveSectionTheme } from '../src/domain/sectionTheme.js'
import { linkedFizzProps } from '../src/domain/fizzPalette.js'
import { commerceThemeFromItems } from '../src/lib/shop/theme.js'
import {
  cartPropsFromItems,
  checkoutPropsFromItems,
  detailPropsFromItems,
  SHOP_ROUTE_PREFIXES,
  shopColorsFromItems,
  shopCurrencyFromItems,
  shopifyConfigFromItems,
} from '../src/domain/checkoutProps.js'
// El mismo fondo por modelo que pinta el preview del builder.
import { modelWrapperClass } from '../src/domain/modelWrappers.js'
import { fontChoiceById, fontFromRecipe, fontLinkParam } from '../src/domain/design.js'

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
 *  9 — Encuadre del 3D por proporción de pantalla: MONOLITH `HeroThree` y ATELIER
 *      `HeroMeaning` alejan la cámara en vertical (`fitCameraDistance` en
 *      lib/motion.js) y el objeto entra en el ancho en vez de salirse por los
 *      costados (en un teléfono ocupaba más del doble del ancho). En PC no cambia.
 */
export const PACK_VERSION = 9

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
  kin: {
    page: 'src/pages/KinPage.jsx',
    sectionsDir: 'src/components/sections/kin',
    pageName: 'App.jsx',
    importPrefix: './components/sections/kin',
  },
  apex: {
    page: 'src/pages/ApexPage.jsx',
    sectionsDir: 'src/components/sections/apex',
    pageName: 'App.jsx',
    importPrefix: './components/sections/apex',
    // The demo film is sample media: the buyer rebuilds it from their own five
    // clips with scripts/apex-reel.mjs (docs/apex-template.md).
    // + the 3D showroom (room and cars, Draco) with its decoder, and the room's Blender source.
    publicAssets: [
      ...publicDirAssets('apex'),
      ...publicDirAssets('apex/showroom'),
      ...publicDirAssets('apex/draco'),
      'scripts/apex-reel.mjs',
      'design/blender/apex-showroom.blend',
    ],
  },
  ordo: {
    page: 'src/pages/OrdoPage.jsx',
    sectionsDir: 'src/components/sections/ordo',
    pageName: 'App.jsx',
    importPrefix: './components/sections/ordo',
  },
  fold: {
    page: 'src/pages/FoldPage.jsx',
    sectionsDir: 'src/components/sections/fold',
    pageName: 'App.jsx',
    importPrefix: './components/sections/fold',
    // The light reel (768 px, original frames only) so the film plays as
    // soon as the buyer runs it, and the footer loop. The full reel of the
    // live demo is built from clips with scripts/fold-reel.mjs.
    publicAssets: [
      ...publicDirAssets('fold/demo'),
      ...publicDirAssets('fold/demo/768'),
      'public/fold/footer-loop.mp4',
      'public/fold/footer-loop.jpg',
      // Builds a reel from your own clips (README: "The film") and its phone tier.
      'scripts/fold-reel.mjs',
      'scripts/fold-phone-tier.mjs',
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
  // Líneas de contacto que se vuelven mailto:/tel: y links externos en otra pestaña.
  'src/lib/contactLinks.js',
  // srcset de las fotos de ejemplo (assets/images.js de cada modelo).
  'src/lib/responsiveImage.js',
  // Versión calma con «reducir movimiento» (las secciones la consultan).
  'src/lib/motion.js',
  'src/lib/interact.js',
  // Tonos de la paleta apuntados a los campos de color de cada sección.
  'src/lib/themeVars.js',
  // Scroll táctil normalizado en teléfonos (lo prende useLenis).
  'src/lib/touchScroll.js',
  'src/hooks/useLenis.js',
  'src/hooks/useMobileMenu.js',
  'src/hooks/useReducedMotion.js',
  'src/components/SmoothScrollProvider.jsx',
  // Barra de scroll propia de cada template (la monta la página).
  'src/components/ScrollRail.jsx',
  // Privacidad / términos como panel sobre la página (lo montan los footers).
  'src/components/LegalSheet.jsx',
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
 * @param {string} title
 * @param {string | null} [fontId] tipografía global del builder (src/domain/design.js)
 */
function buildTemplateIndexHtml(title, fontId = null) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Scrollytelling page built with a SCROLLLAB template." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Mr+Bedfort&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@300..700&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Anton&family=Oswald:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Londrina+Solid:wght@300;900&family=Inter+Tight:wght@400;500;600&family=Archivo:wdth,wght@62..125,400..800&display=swap"
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
  // La tipografía global del builder: si su familia no viene en el <link>, se suma.
  const extra = fontLinkParam(fontId, html)
  return extra ? html.replace('&display=swap"', `${extra}&display=swap"`) : html
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

/**
 * Props como atributos JSX. Los textos van en línea; las listas (links,
 * stats, cards…) las resuelve `hoist`, que las declara como constante arriba
 * del App.jsx y devuelve el nombre. Sin `hoist` se descartan: antes se
 * descartaban siempre, y lo editado en una lista no llegaba al ZIP.
 * @param {object | null | undefined} props
 * @param {((key: string, list: any[]) => string) | null} [hoist]
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
    // checkout* / detail* / cart* van a otras pantallas de la tienda.
    if (SHOP_ROUTE_PREFIXES.some((prefix) => key.startsWith(prefix) && key.length > prefix.length)) continue
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

const CHECKOUT_PAYMENTS_NOTE = `Checkout ships in **mock** mode: it takes no payments, and Scroll Lab does not provide a checkout or payment backend of its own. Taking payments is up to you, in two ways:

1. **Shopify** (no backend): pass \`shopify={{ domain, token, collection }}\` to \`<ShopCatalogProvider>\` in \`src/App.jsx\`. Products, prices, variants and stock then come from your Shopify store, and checkout is Shopify's. Setup steps at the top of \`src/lib/shop/shopify.js\`.
2. **Your own provider**: open \`src/lib/shop/checkoutAdapter.js\`, replace \`createCheckout\` with your Mercado Pago / Stripe backend call and keep the same return shape: \`{ ok, orderId, message, mode }\`.
`

const SHOPIFY_CONNECTED_NOTE = `### Shopify

This shop is connected to a Shopify store (the \`shopify\` prop of \`<ShopCatalogProvider>\` in \`src/App.jsx\`). Shopify is the source of truth: products, prices, variants (size, colour…), stock and photos are edited in the Shopify admin and show up here on the next page load. The builder products and the shipping / discount props of \`<Checkout />\` are not used.

- The page reads the store with the Storefront API (\`src/lib/shop/shopify.js\`) using the store's **public** Storefront token: read-only, made to live in browser code.
- \`collection\` (a collection handle) limits the grid to that collection; empty = the first products of the store.
- The cart sends Shopify only variant ids and quantities (\`cartCreate\`). Shopify prices the order, adds shipping, taxes and discount codes, and takes the payment on its own checkout. The money goes straight to the store's Shopify account.
- If the store can't be reached, the page keeps the builder's catalog on screen and logs a warning in the console.

To change stores, edit \`domain\` and \`token\`. To go back to the mock checkout, delete the \`shopify\` prop.
`

const SHOP_FILES = [
  'src/lib/shop/products.js',
  'src/lib/shop/catalog.js',
  'src/lib/shop/ShopCatalog.jsx',
  'src/lib/shop/cartStore.js',
  'src/lib/shop/checkoutAdapter.js',
  'src/lib/shop/shopify.js',
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

/** FOLD: cómo funciona la película y cómo armar la propia (su ZIP trae el carrete liviano y el script). */
const FOLD_FILM_NOTE = `## The film

> **The film in this demo is a sample.** The engine, the chapters, the menu and
> the transitions are yours to keep; the pictures are meant to be replaced by
> your own clips. Producing those clips is most of the work — the steps below
> turn them into the film.

\`Film.jsx\` paints a frame sequence on one canvas and the scroll picks the frame.
Everything it does — which take plays when, the text cards, the grid, the
chapters, the transitions — is data in \`src/components/sections/fold/score.js\`,
written against one number: how far the reader has scrolled through the film
(0 → 1). The reel's \`manifest.json\` says where each take starts and how much
the picture moves on every frame, so the same scroll always buys the same
amount of movement.

This ZIP ships the **light reel** (\`public/fold/demo\`: 768 px, original
frames). The engine takes the first reel that answers: \`VITE_FOLD_FILM_URL\`,
then \`/fold/film\`, then \`/fold/demo\`.

### Your own film

1. Make the clips. A take is one continuous camera move: each clip starts on
   the last frame of the one before (generate it with that frame as the start
   image). A new take only begins under a transition.
2. List them in \`DEFAULT_TAKES\` in \`scripts/fold-reel.mjs\` (or pass
   \`--config takes.json\`).
3. With [ffmpeg](https://ffmpeg.org) installed:

   \`\`\`
   node scripts/fold-reel.mjs --masters ./my-clips          # full reel → public/fold/film (768 + 1440, 3× frames)
   node scripts/fold-reel.mjs --masters ./my-clips --demo   # light reel → public/fold/demo
   node scripts/fold-reel.mjs loop ./my-clips/loop.mp4      # footer loop
   \`\`\`

   It cuts the still head and tail every video model leaves on a clip, blends
   the joins, drops repeated frames, interpolates in-between frames and writes
   the pace.
4. In \`score.js\`, give each take its \`id\` and the stretch of scroll it plays
   (\`from\` / \`to\`), then place the texts, chapters and transitions.

### Hosting the full reel

The light reel (about 30 MB) ships with the template and works anywhere. The
full reel that \`fold-reel.mjs\` builds is hundreds of MB (the demo's is about
3,700 frames per size, 320 MB): it does not belong in git. Put it on a static
host and point the engine at it. Nothing in this ZIP depends on the demo's own
CDN: the reel you build is yours and lives wherever you put it.

1. Build it: \`node scripts/fold-reel.mjs --masters ./my-clips\`. It writes
   \`public/fold/film/\` — two sizes (768 and 1440), \`manifest.json\` and a
   \`_headers\` file (CORS and a long cache for the frames).
2. Upload that folder to a static host. Two things have to be true: that
   \`<url>/manifest.json\` and \`<url>/768/f_0001.webp\` open in a browser, and
   that both answer with \`Access-Control-Allow-Origin: *\` (the page and the
   frames are on different origins). The \`_headers\` file does it on
   Cloudflare and Netlify.

   **Cloudflare** (Workers static assets). Next to \`package.json\`, a
   \`wrangler.jsonc\`:

   \`\`\`
   {
     "name": "my-film",
     "compatibility_date": "2025-01-01",
     "assets": { "directory": "./public/fold/film" }
   }
   \`\`\`

   \`\`\`
   npx wrangler login
   npx wrangler deploy      # prints https://my-film.<you>.workers.dev
   \`\`\`

   (Current wrangler needs Node 22 or newer. Only the files that changed are
   uploaded on the next deploy.)

   **Netlify.** \`npx netlify-cli deploy --dir public/fold/film --prod\` (it
   creates the site the first time).

   **Any other static host** works if it serves the folder with the CORS header
   above. **Same site as the page:** if your host takes hundreds of MB, just leave
   the folder in \`public/fold/film\`; the engine finds it by itself and no
   variable is needed.
3. Set \`VITE_FOLD_FILM_URL=https://…\` (no trailing slash) — in a \`.env\` file
   for your machine and in your host's environment variables for production —
   and build again: Vite bakes it in at build time.
4. Check it: open the page, DevTools → Network, filter "webp": the frames come
   from that URL.

The frames are cached for a year (\`immutable\`). If you rebuild the film,
publish it under a new URL (a new worker name, or a path such as \`/v2\`) and
update the variable; otherwise returning visitors keep the old pictures.

Phones load the 768 px frames and only the original pictures; the engine blends
each frame into the next. On a phone the connection, not the drawing, is what runs
out when someone flicks, so the engine also shows a loader with a percentage until
the first stretch of the film is in, and waits under the colour field (or before the
paper tears) at each new chapter until that take's first frames are in. On a fast
connection none of it shows. Its text is \`loader.label\` in \`score.js\`.

### The phone tier (optional, about 2.3x fewer bytes)

A phone held upright shows about a quarter of a 16:9 frame: three quarters of every
picture it downloads is never drawn. After building the reel:

\`\`\`
npm i -D sharp
node scripts/fold-phone-tier.mjs            # reads public/fold/film and score.js
\`\`\`

It cuts a band around each take's \`focus\` (\`scenes[].focus\`, else \`portraitFocus\`)
out of the 768 px frames, only the original pictures, into \`public/fold/film/phone/\`
and adds a \`phone\` entry to \`manifest.json\`. Publish the folder with the rest of the
reel. The engine uses it on a portrait screen and falls back to the 768 px tier on a
wide one (a rotated phone); without the folder nothing changes.

With "reduce motion" on, the film becomes still plates: each text on its own
frame of the film, with a short fade.
`

/** APEX: el film de la demo es de muestra; cómo rehacerlo con clips propios. */
const APEX_FILM_NOTE = `## The film and the photos

> **The film and the photos in this demo are samples.** The hero, the menu, the
> loader and every other section are yours to keep; the pictures are meant to be
> replaced by your own footage. Producing it is most of the work — the steps
> below turn your clips into the film.

The hero plays \`public/apex/hero.mp4\` (desktop, 1080p) and \`hero-m.mp4\`
(phones, 720×1280 — one portrait crop per take). \`manifest.json\` says where
each take starts on the loop (the chapter indicator reads it).

### Your own film

1. Five 16:9 clips of at least 4 s, each one continuous camera move. Put them
   in \`design/masters/cars/\` as \`shot-1.mp4 … shot-5.mp4\`.
2. With [ffmpeg](https://ffmpeg.org) installed:

   \`\`\`
   node scripts/apex-reel.mjs
   \`\`\`

   It interpolates every clip to 60 fps, restores frames a generator dropped,
   chains the takes with a 0.5 s crossfade (the last one dissolves into the
   first, so the loop never jumps), bakes a restrained grade and writes the two
   films, the posters and the manifest into \`public/apex/\`.
3. Edit \`SHOTS\` in the script for the file names and where each phone crop is
   centred.

The overlay (wash, shade, vignette, grain) is CSS in \`Hero.jsx\`: the colours
are props. With "reduce motion" or data saver the film does not play: the graded
poster is the hero.

### The showroom (3D)

\`Showroom.jsx\` loads \`public/apex/showroom/showroom.glb\` (the room, light baked into
its textures) and one GLB per car (\`car-1.glb\` …), Draco-compressed (decoder in
\`public/apex/draco/\`). Each plinth takes any GLB (\`cars[].modelUrl\`): a car, a
motorbike, a chair, a product. \`fitToPlinth\` lays its long side along the plinth,
centres it and stands it on the floor; a model that is not car-sized (3.5–6.2 m) is
scaled to fill the plinth. A real-size car (metres, front toward −Z) is left as it is.
Export with Draco and 2048 px WebP textures.

On a phone the demo loads \`car-1-m.glb\` … (2K colour map, 1K data maps: ~33 MB of GPU
memory per car instead of ~200). Any other model URL is used as it is, and on a phone its
textures above 2048 px (colour) / 1024 px (normal, metal-rough…) are re-sampled before
they reach the GPU. If you swap the cars, ship maps that size and you do not need a twin.

The room can be any GLB (\`sceneUrl\`): a gallery, a garage, a landscape, a studio.
The section measures it (centre, size and floor from its walls: meshes taller than
half a metre) and lays the camera's walk over it: in from the +Z side, a stop at each
station, out again. To choose where the objects stand, add three empties named
\`Spot_1\`, \`Spot_2\`, \`Spot_3\` at floor (or plinth) height; without them they stand on
a circle around the centre, scaled to the room (in a room under ~16 m everything
shrinks with it). A room with baked light (materials named \`*_baked\`, like the demo's
\`design/blender/apex-showroom.blend\`) is drawn as baked and reflected in the objects;
any other room gets real lights and studio reflections. \`showRoom: 'off'\` loads no
room at all (a neutral stage in the section's colours); \`showCars: 'off'\` walks the
room alone. With "reduce motion" or no WebGL the section shows \`poster\` and
\`cars[].image\` (side shots) with the spec cards.

The gallery and the model list read their pictures from
\`src/components/sections/apex/assets/\` (or any \`image\` prop).
`

const ORDO_NOTE = `## The hero room, the projects and the brand

**The hero room.** The sheet draws a shop piece by piece and ends on its photograph. It is four images of the same room,
aligned pixel to pixel, in \`src/components/sections/ordo/assets/\`: \`sketch-raw\` (the shell as it arrives), \`sketch-empty\`
(the finished shell, no furniture), \`sketch-room\` (the full pencil sketch) and \`room-photo\` (the photograph; each has a
\`-1200\` copy for phones). \`designPieces.js\` lists the rectangles that are drawn one after another (shell first, furniture
after) and \`localScene.js\` is the shader that reveals them. To use your own room, make the four images with the same camera,
keep their proportions (2400 × 1029) and measure the rectangles again in \`designPieces.js\`. The demo images are samples.

**The projects.** Every project is an object in \`projects.js\` (name, place, year, area, services, six photos, three notes and a
closing sentence). Add one and it appears in the Projects section, gets its page at \`/projects/<slug>\` and joins the "next
project" loop. Each photo has a large and a small WebP (\`-s\`, or \`-900\` for the cover): the page uses both through \`srcset\`.
The project pages are routes of the same \`index.html\`: the dev server already serves it for any path, but in production your
host must return \`index.html\` for unknown paths (Netlify \`_redirects\`, Vercel rewrites, Cloudflare Workers
\`not_found_handling: single-page-application\`).

**The brand.** The name, tagline, places and Instagram handle are in \`brand.js\`. The logo is outlined paths generated from Jost
(SIL Open Font License) in \`logoPaths.js\`: the loader draws the first letter and the rest rise onto the slab. Colours are the
\`--od-*\` variables at the top of \`ordo.css\`. Studio, Services and Contact hold their copy at the top of each file.
`

/** Notas del template completo (su ZIP trae los GLB de public/). */
const MODEL_3D_NOTES = {
  ordo: ORDO_NOTE,
  apex: APEX_FILM_NOTE,
  fold: FOLD_FILM_NOTE,
  fizz: `${fizzHero3dNote({ demoGlb: true })}\n${FIZZ_CANS_NOTE}`,
  monolith: monolith3dNote({ sampleGlb: true }),
}

/** Section folders shared across models — packed when a page imports them. */
const CROSS_MODEL_DIRS = ['contact']

/**
 * El copy de la demo es de un negocio inventado (docs/template-copy.md): el
 * README le dice al comprador de dónde sale, cómo andan los links y que los
 * textos legales son de muestra.
 */
const DEMO_COPY_NOTE = `## Demo copy and links

The text in this template belongs to an invented business, written so the demo reads like a finished site. Every text is a prop of its section: replace it with yours.

- Menu, buttons and footer links point to sections of the page by \`id\` (\`#models\` → \`<section id="models">\`). With smooth scroll on, the page glides there; from the phone menu it closes the menu first.
- Emails and phone numbers in contact blocks become \`mailto:\` / \`tel:\` links (\`src/lib/contactLinks.js\`).
- Where the footer has Privacy / Terms, they open their text in a panel over the page (\`src/components/LegalSheet.jsx\`) while they point at \`#privacy\` / \`#terms\`; point them at your own page (\`/privacy\`, \`https://…\`) to use that instead. **The legal texts are samples for the invented business: replace them with yours and have them reviewed.**
`

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

function createZip(destPath) {
  ensureDir(path.dirname(destPath))
  const output = fs.createWriteStream(destPath)
  const archive = archiver('zip', { zlib: { level: 9 } })
  /** @type {Promise<void>} */
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
      }${sectionDirs.includes('contact') ? `\n${CONTACT_FORM_NOTE}` : ''}\n${DEMO_COPY_NOTE}`,
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

/** `import … from './x'`, `export … from './x'`, `import './x'` e `import('./x')`. */
const RELATIVE_IMPORT_RE =
  /(?:\bimport\s+(?:[^'"]*?\s+from\s+)?|\bexport\s+[^'"]*?\s+from\s+|\bimport\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g

function resolveSectionImport(fromDir, specifier) {
  const base = path.resolve(fromDir, specifier.split('?')[0])
  for (const candidate of [base, `${base}.jsx`, `${base}.js`, path.join(base, 'index.jsx'), path.join(base, 'index.js')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  }
  return null
}

/**
 * Los archivos que una sección necesita de verdad: ella, los componentes y
 * helpers que importa (recursivo) y las fotos / assets que esos importan.
 * Antes se copiaba la carpeta entera del modelo: con una sección de cada
 * modelo, la composición del builder se llevaba casi todo el catálogo (el
 * bundle) por el precio del builder. Lo de fuera de `sections/` (lib, hooks)
 * viaja aparte (SHARED / WEBGL_FILES). Las rutas se copian verbatim.
 * @param {string} entryAbs ruta absoluta de la sección
 * @returns {Set<string>} rutas absolutas
 */
export function sectionFileClosure(entryAbs) {
  const sectionsRoot = path.join(ROOT, 'src', 'components', 'sections')
  const files = new Set()
  const queue = [entryAbs]
  while (queue.length) {
    const abs = /** @type {string} */ (queue.pop())
    if (files.has(abs)) continue
    files.add(abs)
    if (!/\.(jsx|js|mjs)$/.test(abs)) continue
    const source = fs.readFileSync(abs, 'utf8')
    for (const match of source.matchAll(RELATIVE_IMPORT_RE)) {
      const resolved = resolveSectionImport(path.dirname(abs), match[1])
      if (!resolved || !resolved.startsWith(sectionsRoot + path.sep)) continue
      queue.push(resolved)
    }
  }
  return files
}

/**
 * Appends one runnable custom composition (the builder recipe) under `prefix`.
 * Empty prefix: the root of a single-composition ZIP. Returns the recipe ids
 * so the caller writes the license.
 * recipe: string[] (legacy) or [{ id, props? }, ...]
 */
function appendCustomProject(archive, recipe, prefix = '', licenseMeta = null) {
  const sources = [TEMPLATE_VITE_CONFIG]
  // Tipografía global elegida en el builder (null = la de cada sección).
  const fontId = fontFromRecipe(recipe)

  for (const rel of SHARED) {
    const abs = path.join(ROOT, rel)
    if (!fs.existsSync(abs)) continue
    let body = fs.readFileSync(abs)
    if (rel === 'index.html') {
      body = Buffer.from(buildTemplateIndexHtml('Custom composition — SCROLLLAB', fontId))
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
  // Archivos de secciones ya agregados (dos secciones comparten helpers / fotos).
  const packedFiles = new Set()
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
  // La paleta que FIZZ toma del hero (src/domain/fizzPalette.js): el mismo
  // cálculo que el preview.
  const paletteEntries = entries.map((entry) => ({ sectionId: entry.id, props: entry.props }))

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

    // Solo lo que esta sección usa (ella + lo que importa, recursivo): no la
    // carpeta entera del modelo. Ver sectionFileClosure.
    for (const fileAbs of sectionFileClosure(abs)) {
      if (packedFiles.has(fileAbs)) continue
      packedFiles.add(fileAbs)
      const rel = path.relative(ROOT, fileAbs).split(path.sep).join('/')
      const body = fs.readFileSync(fileAbs)
      if (/\.(jsx|js|mjs)$/.test(fileAbs)) sources.push(body.toString('utf8'))
      archive.append(body, { name: `${prefix}${rel}` })
    }
    if (!packedModels.has(model)) {
      packedModels.add(model)
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
    const linked = linkedFizzProps(sectionId, entry.props, paletteEntries)
    const baseProps = Object.keys(linked).length ? { ...linked, ...(entry.props || {}) } : entry.props
    const ownProps =
      sectionId === 'commerce/ProductGrid'
        ? stripCheckoutProps(baseProps)
        : baseProps
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
  const cartAttrs = needsShop ? propsToJsx(cartPropsFromItems(entries)) : ''
  const detailAttrs = needsShop ? propsToJsx(detailPropsFromItems(entries)) : ''
  const shopColors = needsShop ? shopColorsFromItems(entries) : {}
  const shopCurrency = needsShop ? shopCurrencyFromItems(entries) : ''
  const shopify = needsShop ? shopifyConfigFromItems(entries) : null

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
      <ShopChrome${cartAttrs} />
    </SmoothScrollProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ShopThemeProvider
        theme="${shopTheme}"${Object.keys(shopColors).length ? `
        colors={${JSON.stringify(shopColors)}}` : ''}
        className="min-h-svh bg-[color:var(--shop-bg)] text-[color:var(--shop-fg)]"
      >
        <ShopCatalogProvider${shopProducts ? ` products={${shopProducts}}` : ''}${shopCurrency ? ` currency="${shopCurrency}"` : ''}${shopify ? `
          shopify={${JSON.stringify(shopify)}}` : ''}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/product/:productId"
              element={
                <>
                  <ProductDetail${detailAttrs} />
                  <ShopChrome${cartAttrs} />
                </>
              }
            />
            <Route
              path="/checkout"
              element={
                <>
                  <Checkout${checkoutAttrs} />
                  <ShopChrome${cartAttrs} />
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
  // Tipografía global: la regla vive en src/index.css (`[data-user-font]`) y se
  // prende acá, en <html>, para que alcance también a las rutas de la tienda.
  const globalFont = fontChoiceById(fontId)
  if (globalFont) {
    const snippet = `// Global font, chosen in the builder: every element on the page uses it (the
// rule is \`[data-user-font]\` in src/index.css). Delete these two lines to give
// each section back its own font.
document.documentElement.setAttribute('data-user-font', '')
document.documentElement.style.setProperty('--user-font', ${JSON.stringify(globalFont.stack)})

`
    appSrc = appSrc.replace('export default function App()', `${snippet}export default function App()`)
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
  readme += `\n${DEMO_COPY_NOTE}`
  if (globalFont) {
    readme += `\n## Font\n\nThe whole page uses ${globalFont.label} (chosen in the builder). It is set by the two \`data-user-font\` / \`--user-font\` lines in \`src/App.jsx\`; delete them and every section goes back to its own font.\n`
  }
  if (needsShop) {
    const productsNote = shopProducts
      ? `Products: the ones you edited in the builder are \`${shopProducts}\` in \`src/App.jsx\`, passed to \`<ProductGrid products>\` and to \`<ShopCatalogProvider products>\` (the product page, cart and checkout read it from there).`
      : 'Products: the demo catalog in `src/lib/shop/products.js`. To use yours, pass the same list to `<ProductGrid products>` and `<ShopCatalogProvider products>` in `src/App.jsx`.'
    readme += `\n## Commerce kit\n\nThe scroll page includes the product grid. Shop flows use routes:\n\n- \`/\` — story + ProductGrid\n- \`/product/:productId\` — PDP\n- Cart — overlay drawer (Cart button)\n- \`/checkout\` — contact + shipping + delivery + payment on the left, sticky order summary with thumbnails, quantity steppers and discount code on the right\n\nEvery label on \`/checkout\` is a prop of \`<Checkout />\` in \`src/App.jsx\` (copy, steps, countries, shipping costs, discount code, trust list). Shipping math: flat rate, express rate and free-shipping threshold.\n\n${productsNote} Each product: \`{ name, price, blurb, img }\`; size or colour pickers use \`variants\` (see \`src/lib/shop/products.js\`).\n\nFiles: \`src/lib/shop/\` + commerce components.\n\n${shopify ? SHOPIFY_CONNECTED_NOTE : CHECKOUT_PAYMENTS_NOTE}`
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
 * @param {{ items: any[], destPath: string, licenseMeta?: any, bundleModels?: readonly string[] }} args
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

export function storageRoot(explicitDir) {
  const dir = path.resolve(
    explicitDir || process.env.STORAGE_DIR || path.join(ROOT, 'storage', 'orders'),
  )
  ensureDir(dir)
  return dir
}
