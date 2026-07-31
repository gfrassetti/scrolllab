import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import archiver from 'archiver'
import { buildLicenseText } from './license.js'
import { isAllowedSectionId } from './sections.js'
import { recipeSectionId } from './catalog.js'

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
  },
  atelier: {
    page: 'src/pages/AtelierPage.jsx',
    sectionsDir: 'src/components/sections/atelier',
    pageName: 'App.jsx',
    importPrefix: './components/sections/atelier',
  },
}

const SHARED = [
  'src/lib/gsap.js',
  'src/hooks/useLenis.js',
  'src/hooks/useReducedMotion.js',
  'src/components/SmoothScrollProvider.jsx',
  'src/index.css',
  'src/main.jsx',
  'index.html',
  'vite.config.js',
  'package.json',
]

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
      href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@300..700&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Anton&family=JetBrains+Mono:wght@400;500;700&display=swap"
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

function rewriteImportsInSections(content) {
  return content
    .replaceAll("from '../../../lib/gsap'", "from '../../lib/gsap'")
    .replaceAll("from '../../../hooks/useReducedMotion'", "from '../../hooks/useReducedMotion'")
    .replaceAll("from '../../../lib/shop/", "from '../../lib/shop/")
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

function modelWrapperClass(model) {
  if (model === 'chapters') return 'bg-bone text-ink'
  if (model === 'nocturne') return 'bg-noir text-salt'
  if (model === 'monolith') return 'bg-concrete text-carbon'
  if (model === 'velocity') return 'bg-[#0a1a12] text-[#ece9e2]'
  if (model === 'fizz') return 'bg-grape text-foam'
  if (model === 'atelier') return 'bg-[#0b0c10] text-white'
  if (model === 'commerce') return 'bg-bone text-ink'
  return 'bg-bone text-ink'
}

const SHOP_FILES = [
  'src/lib/shop/products.js',
  'src/lib/shop/cartStore.js',
  'src/lib/shop/checkoutAdapter.js',
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

The hero's soda can is generated in code (no assets). To use your own model:

1. Export your model as **GLB** (binary glTF — single file; GLTF also works).
2. Drop it in \`public/\`, e.g. \`public/my-can.glb\`.
3. In \`src/App.jsx\`, pass it to the hero: \`<HeroBubbles modelUrl="/my-can.glb" />\`.

The model is auto-centered and auto-scaled; it keeps the scroll rotation, the pointer parallax and the rising bubbles. A hosted \`https://\` URL also works. Without \`modelUrl\`, the placeholder can renders (label color via \`flavor\`: berry / citrus / tropical / mint).

## Custom can images (carousel)

The lineup cans are inline SVG placeholders. To replace each one:

1. Export your art as **SVG**, PNG, WebP or JPG.
2. Drop files in \`public/\`, e.g. \`public/can-1.svg\`.
3. Pass them to the carousel: \`<CanCarousel can1Image="/can-1.svg" can2Image="/can-2.png" … />\`.

A hosted \`https://\` URL also works. Without \`canNImage\`, the SVG placeholder renders (\`canLabel\` prints on it).
`,
  monolith: `## Custom 3D model (hero)

The hero's wireframe object is a preset (\`shape\`). To use your own model:

1. Export your model as **GLB** (binary glTF — single file; GLTF also works).
2. Drop it in \`public/\`, e.g. \`public/my-object.glb\`.
3. In \`src/App.jsx\`, pass it to the hero: \`<HeroThree modelUrl="/my-object.glb" />\`.

The model is auto-centered, auto-scaled and re-materialized as a carbon wireframe to keep the brutalist look. A hosted \`https://\` URL also works.
`,
}

function rewritePageToApp(content, model) {
  // ChaptersPage etc. import from '../components/...' — in packaged App they live under ./components
  return content
    .replaceAll("from '../components/", "from './components/")
    .replaceAll(`export default function ${model.charAt(0).toUpperCase() + model.slice(1)}Page`, 'export default function App')
    .replace(/export default function \w+Page/, 'export default function App')
}

/**
 * Pack a fixed model template into a zip at destPath.
 */
export async function packFixedTemplate({ model, destPath, licenseMeta }) {
  const cfg = MODEL_FILES[model]
  if (!cfg) throw new Error(`Unknown model: ${model}`)

  ensureDir(path.dirname(destPath))
  const output = fs.createWriteStream(destPath)
  const archive = archiver('zip', { zlib: { level: 9 } })

  const done = new Promise((resolve, reject) => {
    output.on('close', resolve)
    archive.on('error', reject)
  })

  archive.pipe(output)

  for (const rel of SHARED) {
    const abs = path.join(ROOT, rel)
    if (!fs.existsSync(abs)) continue
    let body = fs.readFileSync(abs)
    if (rel === 'package.json') {
      const pkg = JSON.parse(body.toString())
      pkg.name = `scrolllab-${model}`
      pkg.private = true
      delete pkg.devDependencies?.['@eslint/js']
      body = Buffer.from(JSON.stringify(pkg, null, 2))
    }
    if (rel === 'index.html') {
      body = Buffer.from(
        buildTemplateIndexHtml(`${model.toUpperCase()} — SCROLLLAB template`),
      )
    }
    archive.append(body, { name: rel === 'src/main.jsx' ? 'src/main.jsx' : rel })
  }

  // main.jsx already imports App — we write App.jsx from the model page
  const pageSrc = rewritePageToApp(read(cfg.page), model)
  archive.append(pageSrc, { name: 'src/App.jsx' })

  const sectionsAbs = path.join(ROOT, cfg.sectionsDir)
  for (const file of fs.readdirSync(sectionsAbs)) {
    if (!file.endsWith('.jsx')) continue
    const raw = fs.readFileSync(path.join(sectionsAbs, file), 'utf8')
    archive.append(rewriteImportsInSections(raw), {
      name: `src/components/sections/${model}/${file}`,
    })
  }

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

  archive.append(
    `# ${model.toUpperCase()} — SCROLLLAB\n\n\`\`\`\nnpm install\nnpm run dev\n\`\`\`\n\nSee LICENSE.txt for usage terms.\n${
      MODEL_3D_NOTES[model] ? `\n${MODEL_3D_NOTES[model]}` : ''
    }`,
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
  ensureDir(path.dirname(destPath))
  const output = fs.createWriteStream(destPath)
  const archive = archiver('zip', { zlib: { level: 9 } })
  const done = new Promise((resolve, reject) => {
    output.on('close', resolve)
    archive.on('error', reject)
  })
  archive.pipe(output)

  for (const rel of SHARED) {
    const abs = path.join(ROOT, rel)
    if (!fs.existsSync(abs)) continue
    let body = fs.readFileSync(abs)
    if (rel === 'package.json') {
      const pkg = JSON.parse(body.toString())
      pkg.name = 'scrolllab-custom'
      body = Buffer.from(JSON.stringify(pkg, null, 2))
    }
    if (rel === 'index.html') {
      body = Buffer.from(buildTemplateIndexHtml('Custom composition — SCROLLLAB'))
    }
    archive.append(body, { name: rel })
  }

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
      const body = rel.endsWith('.jsx')
        ? rewriteImportsInSections(fs.readFileSync(abs, 'utf8'))
        : fs.readFileSync(abs)
      archive.append(body, { name: rel })
    }
  }

  const imports = []
  const renderLines = []
  const seen = new Set()
  const packedModels = new Set()

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
        for (const file of fs.readdirSync(modelDir)) {
          if (!file.endsWith('.jsx')) continue
          const rel = path.posix.join('src/components/sections', model, file)
          const raw = fs.readFileSync(path.join(modelDir, file), 'utf8')
          archive.append(rewriteImportsInSections(raw), { name: rel })
        }
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
    const attrs = propsToJsx(entry.props)
    renderLines.push(
      `        <div key="${i}" className="${wrapper}"><${Comp}${attrs} /></div>`,
    )
  })

  let appSrc
  if (needsShop) {
    appSrc = `import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SmoothScrollProvider from './components/SmoothScrollProvider'
import ProductDetail from './components/sections/commerce/ProductDetail'
import Checkout from './components/sections/commerce/Checkout'
import ShopChrome from './components/sections/commerce/ShopChrome'
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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/product/:productId"
          element={
            <div className="min-h-svh bg-bone text-ink">
              <ProductDetail />
              <ShopChrome />
            </div>
          }
        />
        <Route
          path="/checkout"
          element={
            <div className="min-h-svh bg-bone text-ink">
              <Checkout />
              <ShopChrome />
            </div>
          }
        />
      </Routes>
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
  archive.append(appSrc, { name: 'src/App.jsx' })

  const idList = entries.map((e) => e.id).filter(Boolean)
  let readme = `# Composición custom — SCROLLLAB\n\nReceta:\n${idList.map((r) => `- ${r}`).join('\n')}\n\n\`\`\`\nnpm install\nnpm run dev\n\`\`\`\n`
  if (
    idList.includes('fizz/HeroBubbles') ||
    idList.includes('fizz/CanCarousel')
  ) {
    readme += `\n${MODEL_3D_NOTES.fizz}`
  }
  if (idList.includes('monolith/HeroThree')) readme += `\n${MODEL_3D_NOTES.monolith}`
  if (needsShop) {
    readme += `\n## Commerce kit\n\nThe scroll page includes the product grid. Shop flows use routes:\n\n- \`/\` — story + ProductGrid\n- \`/product/:productId\` — PDP\n- Cart — overlay drawer (Cart button)\n- \`/checkout\` — summary + mock pay\n\nFiles: \`src/lib/shop/\` + commerce components.\n\nCheckout ships in **mock** mode. To connect payments:\n\n1. Open \`src/lib/shop/checkoutAdapter.js\`\n2. Replace \`createCheckout\` with your Mercado Pago / Stripe backend call\n3. Keep the same return shape: \`{ ok, orderId, message, mode }\`\n`
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
