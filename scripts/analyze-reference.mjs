/**
 * Analiza una página modelo (URL) y escribe un mapa al segundo cerebro Obsidian.
 *
 * 1) Detecta librerías (Lenis, GSAP, Framer, Three, Motion…).
 * 2) Muestrea el scroll: sticky/fixed, transforms, data-framer-name, tipografía.
 * 3) Escribe Markdown en la bóveda ScrollLab.
 *
 * Uso:
 *   node scripts/analyze-reference.mjs <url> [--sku unity] [--name "Unity"]
 *   npm run analyze:ref -- https://united-in-football.framer.website/ --sku unity
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const DEFAULT_VAULT = 'C:\\Users\\Guido\\Documents\\Obsidian\\ScrollLab'

function parseArgs(argv) {
  const args = { url: null, sku: null, name: null, vault: process.env.SCROLLLAB_VAULT || DEFAULT_VAULT }
  const rest = [...argv]
  while (rest.length) {
    const a = rest.shift()
    if (a === '--sku') args.sku = rest.shift()
    else if (a === '--name') args.name = rest.shift()
    else if (a === '--vault') args.vault = rest.shift()
    else if (!a.startsWith('-') && !args.url) args.url = a
  }
  return args
}

function guessSku(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host.split('.')[0].slice(0, 24)
  } catch {
    return 'reference'
  }
}

async function detectLibraries(page) {
  return page.evaluate(() => {
    const html = document.documentElement.outerHTML
    const scripts = [...document.querySelectorAll('script[src]')].map((s) => s.src)
    const blob = [html, ...scripts].join('\n')
    const classes = document.documentElement.className || ''
    const checks = [
      ['lenis', /lenis/i, classes.includes('lenis') || !!window.Lenis],
      ['gsap', /gsap|ScrollTrigger/i, !!(window.gsap || window.ScrollTrigger)],
      [
        'framer',
        /framerusercontent|framer\.com|data-framer/i,
        !!document.querySelector('[data-framer-name]'),
      ],
      ['framer-motion', /framer-motion/i, !!(window.Motion || window.FramerMotion)],
      ['three', /three(\.module|\.min)?\.js|THREE\./i, !!window.THREE],
      ['lottie', /lottie|dotlottie/i, false],
      ['locomotive', /locomotive/i, false],
      ['swiper', /swiper/i, false],
      ['react', /react/i, !!window.React],
      ['next', /_next\//i, false],
      ['webflow', /webflow/i, false],
    ]
    const found = []
    for (const [id, re, extra] of checks) {
      if (extra || re.test(blob) || re.test(classes)) found.push(id)
    }
    const fonts = [...document.fonts]
      .filter((f) => f.status === 'loaded')
      .map((f) => f.family)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 24)
    return {
      found: [...new Set(found)],
      scripts: scripts.slice(0, 30),
      htmlClass: classes,
      fonts,
      title: document.title,
    }
  })
}

async function sampleScroll(page) {
  return page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const max = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
    )
    const steps = 10
    const samples = []
    const named = new Set()

    for (let i = 0; i <= steps; i += 1) {
      const y = Math.round((max * i) / steps)
      window.scrollTo(0, y)
      await sleep(180)

      document.querySelectorAll('[data-framer-name]').forEach((el) => {
        named.add(el.getAttribute('data-framer-name'))
      })

      const sticky = [...document.querySelectorAll('*')]
        .filter((el) => {
          const p = getComputedStyle(el).position
          return p === 'sticky' || p === 'fixed'
        })
        .slice(0, 12)
        .map((el) => ({
          name: el.getAttribute('data-framer-name') || el.tagName.toLowerCase(),
          pos: getComputedStyle(el).position,
          text: (el.textContent || '').trim().slice(0, 40),
        }))

      const moving = [...document.querySelectorAll('[data-framer-name], [style*="transform"]')]
        .filter((el) => {
          const t = getComputedStyle(el).transform
          return t && t !== 'none'
        })
        .slice(0, 10)
        .map((el) => ({
          name: el.getAttribute('data-framer-name') || el.tagName.toLowerCase(),
          transform: getComputedStyle(el).transform.slice(0, 80),
        }))

      samples.push({
        progress: +(i / steps).toFixed(2),
        y,
        sticky,
        moving,
      })
    }

    window.scrollTo(0, 0)

    const headings = [...document.querySelectorAll('h1,h2')]
      .slice(0, 24)
      .map((h) => ({
        tag: h.tagName,
        text: h.textContent.replace(/\s+/g, ' ').trim().slice(0, 60),
        font: getComputedStyle(h).fontFamily.split(',')[0].replace(/"/g, ''),
        size: getComputedStyle(h).fontSize,
      }))

    return {
      maxScroll: max,
      framerNames: [...named].slice(0, 80),
      headings,
      samples,
    }
  })
}

function inferTechniques(libs, scroll) {
  const tech = []
  if (libs.found.includes('lenis')) tech.push('Smooth scroll: Lenis')
  if (libs.found.includes('gsap')) tech.push('Motion: GSAP / ScrollTrigger')
  if (libs.found.includes('framer')) {
    tech.push('Builder: Framer (scroll components / variants)')
    tech.push('SCROLLLAB port target: Lenis + GSAP ScrollTrigger')
  }
  if (libs.found.includes('three')) tech.push('3D: three.js')
  if (scroll.framerNames.some((n) => /pin|sticky|pinned/i.test(n))) {
    tech.push('Pinned / sticky stages detected by name')
  }
  if (scroll.framerNames.some((n) => /panel|track|slider|marquee/i.test(n))) {
    tech.push('Horizontal panel / track / slider pattern')
  }
  if (scroll.framerNames.some((n) => /parallax|drift|zoom|immersive/i.test(n))) {
    tech.push('Parallax / zoom / immersive scrub markers')
  }
  const stickyHits = scroll.samples.flatMap((s) => s.sticky.map((x) => x.name))
  const uniqSticky = [...new Set(stickyHits)].slice(0, 20)
  if (uniqSticky.length) tech.push(`Sticky/fixed nodes: ${uniqSticky.join(', ')}`)
  return tech
}

function buildMarkdown({ url, sku, name, libs, scroll, tech }) {
  const title = name || sku
  const date = new Date().toISOString().slice(0, 10)
  const sampleTable = scroll.samples
    .map((s) => {
      const st = s.sticky
        .slice(0, 4)
        .map((x) => x.name)
        .join(', ')
      const mv = s.moving
        .slice(0, 3)
        .map((x) => x.name)
        .join(', ')
      return `| ${s.progress} | ${s.y} | ${st || '—'} | ${mv || '—'} |`
    })
    .join('\n')

  return `---
tags:
  - scrolllab
  - reference-analysis
  - ${sku}
aliases:
  - ${title} analysis
  - analyze ${sku}
analyzed: ${date}
source: ${url}
---

# ${title} — análisis de referencia

Generado por \`scripts/analyze-reference.mjs\` el ${date}.

**URL:** ${url}  
**SKU sugerido:** \`${sku}\`  
**Title:** ${libs.title || '—'}

## Librerías detectadas

${libs.found.length ? libs.found.map((id) => `- \`${id}\``).join('\n') : '- (ninguna heurística matcheó)'}

### Scripts (muestra)

${libs.scripts.slice(0, 12).map((s) => `- \`${s}\``).join('\n') || '- —'}

### Fonts cargadas

${libs.fonts.length ? libs.fonts.map((f) => `- ${f}`).join('\n') : '- —'}

\`html.class\`: \`${libs.htmlClass || ''}\`

## Técnicas inferidas

${tech.map((t) => `- ${t}`).join('\n')}

## Capas Framer (\`data-framer-name\`)

${scroll.framerNames.length ? scroll.framerNames.map((n) => `- ${n}`).join('\n') : '- (no Framer names)'}

## Headings

| Tag | Texto | Font | Size |
|---|---|---|---|
${scroll.headings.map((h) => `| ${h.tag} | ${h.text.replace(/\|/g, '/')} | ${h.font} | ${h.size} |`).join('\n')}

## Muestreo de scroll (${scroll.samples.length} pasos, max=${scroll.maxScroll}px)

| Progress | Y | Sticky/fixed | Transforms |
|---|---|---|---|
${sampleTable}

## Port a SCROLLLAB

1. Smooth scroll → \`SmoothScrollProvider\` (Lenis)
2. Pins / scrubs → GSAP \`ScrollTrigger\` (\`usePinnedScrub\` o timeline local)
3. Copy genérico (Headline N / Link N / lorem)
4. Actualizar [[Template reference index]] + mapa del SKU

## Gaps (llenar a mano tras mirar)

- [ ] Hero
- [ ] Sección firma (la más difícil)
- [ ] Footer
`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.url) {
    console.error(
      'Uso: node scripts/analyze-reference.mjs <url> [--sku unity] [--name "Unity"] [--vault path]',
    )
    process.exit(1)
  }

  const sku = (args.sku || guessSku(args.url)).toLowerCase().replace(/[^a-z0-9-]/g, '')
  const name = args.name || sku.toUpperCase()

  console.log(`Analizando ${args.url}…`)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  // Heavy scrolly sites never reach networkidle (video sequences, lazy media).
  await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(4000)
  await page.waitForTimeout(1200)

  const libs = await detectLibraries(page)
  const scroll = await sampleScroll(page)
  const tech = inferTechniques(libs, scroll)
  await browser.close()

  const md = buildMarkdown({ url: args.url, sku, name, libs, scroll, tech })
  const outName = `${name} - analisis de referencia.md`
  const outPath = path.join(args.vault, outName)
  fs.mkdirSync(args.vault, { recursive: true })
  fs.writeFileSync(outPath, md, 'utf8')

  // Also keep a copy in repo for CI / agents without Obsidian path
  const localDir = path.join(ROOT, 'docs', 'reference-analysis')
  fs.mkdirSync(localDir, { recursive: true })
  const localPath = path.join(localDir, `${sku}.md`)
  fs.writeFileSync(localPath, md, 'utf8')

  console.log(`✓ Librerías: ${libs.found.join(', ') || '(ninguna)'}`)
  console.log(`✓ Framer names: ${scroll.framerNames.length}`)
  console.log(`✓ Obsidian: ${outPath}`)
  console.log(`✓ Repo copy: ${localPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
