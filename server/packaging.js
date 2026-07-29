import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import archiver from 'archiver'
import { buildLicenseText } from './license.js'
import { isAllowedSectionId } from './sections.js'

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
  return content.replaceAll("from '../../../lib/gsap'", "from '../../lib/gsap'")
    .replaceAll("from '../../../hooks/useReducedMotion'", "from '../../hooks/useReducedMotion'")
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
    `# ${model.toUpperCase()} — SCROLLLAB\n\n\`\`\`\nnpm install\nnpm run dev\n\`\`\`\n\nSee LICENSE.txt for usage terms.\n`,
    { name: 'README.md' },
  )

  await archive.finalize()
  await done
  return destPath
}

/**
 * Pack a custom builder recipe (array of section ids like "chapters/HeroKinetic").
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

  const imports = []
  const renderLines = []
  const seen = new Set()

  recipe.forEach((sectionId, i) => {
    if (!isAllowedSectionId(sectionId)) return
    const [model, component] = sectionId.split('/')
    if (!model || !component) return
    // Paths are constrained by allowlist + alphanumeric component names.
    const fileRel = path.posix.join(
      'src/components/sections',
      model,
      `${component}.jsx`,
    )
    const abs = path.join(ROOT, fileRel)
    const sectionsRoot = path.join(ROOT, 'src', 'components', 'sections')
    if (!abs.startsWith(sectionsRoot)) return
    if (!fs.existsSync(abs)) return

    if (!seen.has(sectionId)) {
      seen.add(sectionId)
      const raw = fs.readFileSync(abs, 'utf8')
      archive.append(rewriteImportsInSections(raw), { name: fileRel })
      imports.push(
        `import ${component}_${model} from './components/sections/${model}/${component}'`,
      )
    }

    const wrapper =
      model === 'chapters'
        ? 'bg-bone text-ink'
        : model === 'nocturne'
          ? 'bg-noir text-salt'
          : 'bg-concrete text-carbon'
    const Comp = `${component}_${model}`
    renderLines.push(
      `        <div key="${i}" className="${wrapper}"><${Comp} /></div>`,
    )
  })

  const appSrc = `import SmoothScrollProvider from './components/SmoothScrollProvider'
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
  archive.append(appSrc, { name: 'src/App.jsx' })

  archive.append(
    buildLicenseText({
      siteName: 'SCROLLLAB',
      orderId: licenseMeta.orderId,
      email: licenseMeta.email,
      sku: `custom:${recipe.join(',')}`,
      date: licenseMeta.date,
    }),
    { name: 'LICENSE.txt' },
  )
  archive.append(
    `# Composición custom — SCROLLLAB\n\nReceta:\n${recipe.map((r) => `- ${r}`).join('\n')}\n\n\`\`\`\nnpm install\nnpm run dev\n\`\`\`\n`,
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
