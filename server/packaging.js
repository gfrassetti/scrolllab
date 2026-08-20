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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

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
    publicAssets: ['public/fizz/soda-can.glb'],
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
}

const SHARED = [
  'src/lib/gsap.js',
  // Beat (src/lib/beat/*) NO va en el ZIP — plusvalía marketplace. Ver docs/scrolllab-beat.md.
  // Si una sección importa lib/beat, el pack fallará hasta portar a GSAP.
  'src/lib/webgl/index.js',
  'src/lib/webgl/stage.js',
  'src/lib/webgl/orbit.js',
  'src/lib/webgl/damp.js',
  'src/lib/webgl/coverPlane.js',
  'src/lib/webgl/gltf.js',
  'src/lib/navLinks.js',
  'src/hooks/useLenis.js',
  'src/hooks/useMobileMenu.js',
  'src/hooks/useReducedMotion.js',
  'src/components/SmoothScrollProvider.jsx',
  'src/index.css',
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
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Mr+Bedfort&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@300..700&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Anton&family=Boldonse&family=Oswald:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
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

/** Serialize props as JSX attributes (strings only). */
function propsToJsx(props) {
  if (!props || typeof props !== 'object') return ''
  return Object.entries(props)
    .filter(([, v]) => typeof v === 'string')
    .map(([k, v]) => {
      const escaped = JSON.stringify(v)
      return ` ${k}={${escaped}}`
    })
    .join('')
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

function modelWrapperClass(model) {
  if (model === 'chapters') return 'bg-bone text-ink'
  if (model === 'nocturne') return 'bg-noir text-salt'
  if (model === 'monolith') return 'bg-concrete text-carbon'
  if (model === 'velocity') return 'bg-[#0a1a12] text-[#ece9e2]'
  if (model === 'fizz') return 'bg-grape text-foam'
  if (model === 'atelier') return 'bg-[#0b0c10] text-white'
  if (model === 'comic') return 'bg-comic-paper text-[#2a2622]'
  if (model === 'unity') return 'bg-[#f3efe6] text-[#0a0a0a]'
  if (model === 'ratio') return 'bg-white text-[#111]'

  // contact / commerce paint their own theme — no wrapper canvas.
  if (model === 'contact') return ''
  if (model === 'commerce') return ''
  return 'bg-bone text-ink'
}

const SHOP_FILES = [
  'src/lib/shop/products.js',
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

/** READMEs: how to swap the hero's 3D object for a custom GLB. */
const MODEL_3D_NOTES = {
  fizz: `## Custom 3D model (hero)

The demo ships with \`public/fizz/soda-can.glb\` as \`modelUrl\` on \`HeroBubbles\`.
The PNG cutout is only used when \`modelUrl\` is omitted. To use your own model:

1. Export your model as **GLB** (binary glTF — single file; GLTF also works).
2. Drop it in \`public/\`, e.g. \`public/my-can.glb\`.
3. In \`src/App.jsx\`, pass it to the hero: \`<HeroBubbles modelUrl="/my-can.glb" />\`.

The model is auto-centered and auto-scaled; it keeps the scroll rotation, the pointer parallax and the rising bubbles. A hosted \`https://\` URL also works. Without \`modelUrl\`, a photoreal PNG cutout renders (flavor via \`flavor\`: berry / citrus / tropical / mint).

## Custom can images (carousel)

The lineup ships photoreal PNG cutouts. To replace each one:

1. Export your art as **SVG**, PNG, WebP or JPG.
2. Drop files in \`public/\`, e.g. \`public/can-1.svg\`.
3. Pass them to the carousel: \`<CanCarousel can1Image="/can-1.svg" can2Image="/can-2.png" … />\`.

A hosted \`https://\` URL also works. Without \`canNImage\`, the SVG placeholder renders (\`canLabel\` prints on it).
`,
  monolith: `## Custom 3D model (hero)

The demo ships with \`public/monolith/monolith-form.glb\` as \`modelUrl\` on \`HeroThree\` (carbon wireframe). To use your own model:

1. Export your model as **GLB** (binary glTF — single file; GLTF also works).
2. Drop it in \`public/\`, e.g. \`public/my-object.glb\`.
3. In \`src/App.jsx\`, pass it to the hero: \`<HeroThree modelUrl="/my-object.glb" />\`.

The model is auto-centered, auto-scaled and re-materialized as a carbon wireframe to keep the brutalist look. A hosted \`https://\` URL also works.
`,
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
\`velocity\`, \`fizz\`, \`atelier\`, \`comic\`, \`unity\`, \`ratio\`). With \`auto\` it inherits the surrounding
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
function appendModelProject(archive, model, prefix = '') {
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
    }
    sources.push(body.toString('utf8'))
    archive.append(body, { name: `${prefix}${rel}` })
  }

  archive.append(TEMPLATE_VITE_CONFIG, { name: `${prefix}vite.config.js` })

  // main.jsx already imports App — we write App.jsx from the model page
  const pageSrc = read(cfg.page)
  const appSrc = rewritePageToApp(pageSrc, model)
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

  for (const rel of cfg.publicAssets || []) {
    const abs = path.join(ROOT, rel)
    if (!fs.existsSync(abs)) continue
    archive.append(fs.readFileSync(abs), {
      name: `${prefix}${rel.replace(/\\/g, '/')}`,
    })
  }

  archive.append(buildTemplatePackageJson(`scrolllab-${model}`, sources), {
    name: `${prefix}package.json`,
  })

  const licenseNote = prefix
    ? 'See LICENSE.txt at the root of this bundle for usage terms.'
    : 'See LICENSE.txt for usage terms.'
  archive.append(
    `# ${model.toUpperCase()} — SCROLLLAB\n\n\`\`\`\nnpm install\nnpm run dev\n\`\`\`\n\n${licenseNote}\n${
      MODEL_3D_NOTES[model] ? `\n${MODEL_3D_NOTES[model]}` : ''
    }${sectionDirs.includes('contact') ? `\n${CONTACT_FORM_NOTE}` : ''}`,
    { name: `${prefix}README.md` },
  )
}

/**
 * Pack a fixed model template into a zip at destPath.
 */
export async function packFixedTemplate({ model, destPath, licenseMeta }) {
  const { archive, done } = createZip(destPath)

  appendModelProject(archive, model)

  archive.append(
    buildLicenseText({
      siteName: 'SCROLLLAB',
      orderId: licenseMeta.orderId,
      email: licenseMeta.email,
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
    appendModelProject(archive, model, `${model}/`)
  }

  archive.append(
    buildLicenseText({
      siteName: 'SCROLLLAB',
      orderId: licenseMeta.orderId,
      email: licenseMeta.email,
      sku: `bundle:${list.join(',')}`,
      date: licenseMeta.date,
    }),
    { name: 'LICENSE.txt' },
  )

  archive.append(
    `# SCROLLLAB — bundle\n\n${list.length} models, one folder each. Every folder is a standalone Vite project:\n\n${list
      .map((model) => `- \`${model}/\` — ${model.toUpperCase()}`)
      .join('\n')}\n\n\`\`\`\ncd ${list[0]}\nnpm install\nnpm run dev\n\`\`\`\n\nThe license at the root covers all ${list.length} models. See LICENSE.txt.\n`,
    { name: 'README.md' },
  )

  await archive.finalize()
  await done
  return destPath
}

/**
 * Pack a custom builder recipe.
 * recipe: string[] (legacy) or [{ id, props? }, ...]
 */
export async function packCustomTemplate({ recipe, destPath, licenseMeta }) {
  const { archive, done } = createZip(destPath)

  const sources = [TEMPLATE_VITE_CONFIG]

  for (const rel of SHARED) {
    const abs = path.join(ROOT, rel)
    if (!fs.existsSync(abs)) continue
    let body = fs.readFileSync(abs)
    if (rel === 'index.html') {
      body = Buffer.from(buildTemplateIndexHtml('Custom composition — SCROLLLAB'))
    }
    sources.push(body.toString('utf8'))
    archive.append(body, { name: rel })
  }

  archive.append(TEMPLATE_VITE_CONFIG, { name: 'vite.config.js' })

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
      archive.append(body, { name: rel })
    }
    // Fotos del catálogo demo importadas por products.js.
    const shopAssets = path.join(ROOT, 'src', 'lib', 'shop', 'assets')
    if (fs.existsSync(shopAssets)) {
      for (const file of fs.readdirSync(shopAssets)) {
        archive.append(fs.readFileSync(path.join(shopAssets, file)), {
          name: `src/lib/shop/assets/${file}`,
        })
      }
    }
  }

  const imports = []
  const renderLines = []
  const seen = new Set()
  const packedModels = new Set()

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
            archive.append(body, { name: rel })
          }
        }
        walk(modelDir, path.posix.join('src/components/sections', model))
      }
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
    const attrs = propsToJsx(theme ? { ...ownProps, theme } : ownProps)
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

  let appSrc
  if (needsShop) {
    appSrc = `import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SmoothScrollProvider from './components/SmoothScrollProvider'
import ProductDetail from './components/sections/commerce/ProductDetail'
import Checkout from './components/sections/commerce/Checkout'
import ShopChrome from './components/sections/commerce/ShopChrome'
import { ShopThemeProvider } from './lib/shop/ShopTheme'
${imports.join('\n')}

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
      </ShopThemeProvider>
    </BrowserRouter>
  )
}
`
  } else {
    appSrc = `import SmoothScrollProvider from './components/SmoothScrollProvider'
${imports.join('\n')}

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
  sources.push(appSrc)
  archive.append(appSrc, { name: 'src/App.jsx' })
  archive.append(buildTemplatePackageJson('scrolllab-custom', sources), {
    name: 'package.json',
  })

  const idList = entries.map((e) => e.id).filter(Boolean)
  let readme = `# Composición custom — SCROLLLAB\n\nReceta:\n${idList.map((r) => `- ${r}`).join('\n')}\n\n\`\`\`\nnpm install\nnpm run dev\n\`\`\`\n`
  if (
    idList.includes('fizz/HeroBubbles') ||
    idList.includes('fizz/CanCarousel')
  ) {
    readme += `\n${MODEL_3D_NOTES.fizz}`
  }
  if (idList.includes('monolith/HeroThree')) readme += `\n${MODEL_3D_NOTES.monolith}`
  if (idList.includes('contact/ContactForm')) readme += `\n${CONTACT_FORM_NOTE}`
  if (needsShop) {
    readme += `\n## Commerce kit\n\nThe scroll page includes the product grid. Shop flows use routes:\n\n- \`/\` — story + ProductGrid\n- \`/product/:productId\` — PDP\n- Cart — overlay drawer (Cart button)\n- \`/checkout\` — contact + shipping + delivery + payment on the left, sticky order summary with thumbnails, quantity steppers and discount code on the right\n\nEvery label on \`/checkout\` is a prop of \`<Checkout />\` in \`src/App.jsx\` (copy, steps, countries, shipping costs, discount code, trust list). Shipping math: flat rate, express rate and free-shipping threshold.\n\nFiles: \`src/lib/shop/\` + commerce components.\n\nCheckout ships in **mock** mode. To connect payments:\n\n1. Open \`src/lib/shop/checkoutAdapter.js\`\n2. Replace \`createCheckout\` with your Mercado Pago / Stripe backend call\n3. Keep the same return shape: \`{ ok, orderId, message, mode }\`\n`
  }

  archive.append(
    buildLicenseText({
      siteName: 'SCROLLLAB',
      orderId: licenseMeta.orderId,
      email: licenseMeta.email,
      sku: `custom:${idList.join(',')}`,
      date: licenseMeta.date,
    }),
    { name: 'LICENSE.txt' },
  )
  archive.append(readme, { name: 'README.md' })

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
