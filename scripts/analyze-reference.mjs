/**
 * Analiza una página modelo (URL) y escribe un mapa beat-a-beat al segundo cerebro.
 *
 * Estrategia (preciso + eficiente):
 * 1) Playwright muestrea el scroll y solo guarda beats donde cambia la “firma”
 *    (sticky, transforms, tipografía visible, fondo, media).
 * 2) Screenshot JPEG liviano por beat (no cada frame).
 * 3) Gemini opcional (GEMINI_API_KEY / GOOGLE_API_KEY): una sola pasada sobre
 *    los diffs — anota fondo / figura / texto. Sin key = solo captura mecánima.
 *
 * Uso:
 *   npm run analyze:ref -- <url> --sku unity --name "Unity"
 *   npm run analyze:ref -- <url> --sku x --steps 40 --no-ai
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DEFAULT_VAULT = 'C:\\Users\\Guido\\Documents\\Obsidian\\ScrollLab'

function parseArgs(argv) {
  const args = {
    url: null,
    sku: null,
    name: null,
    vault: process.env.SCROLLLAB_VAULT || DEFAULT_VAULT,
    steps: 32,
    shots: true,
    ai: true,
  }
  const rest = [...argv]
  while (rest.length) {
    const a = rest.shift()
    if (a === '--sku') args.sku = rest.shift()
    else if (a === '--name') args.name = rest.shift()
    else if (a === '--vault') args.vault = rest.shift()
    else if (a === '--steps') args.steps = Math.max(8, Number(rest.shift()) || 32)
    else if (a === '--no-shots') args.shots = false
    else if (a === '--no-ai') args.ai = false
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

function geminiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
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

/** Snapshot estructurado del viewport (firma + capas visibles). */
async function captureScene(page) {
  return page.evaluate(() => {
    const vh = window.innerHeight
    const vw = window.innerWidth
    const inView = (el) => {
      const r = el.getBoundingClientRect()
      return r.bottom > 40 && r.top < vh - 40 && r.right > 0 && r.left < vw
    }
    const label = (el) =>
      el.getAttribute('data-framer-name') ||
      el.getAttribute('aria-label') ||
      el.id ||
      el.tagName.toLowerCase()

    const bodyBg = getComputedStyle(document.body).backgroundColor
    const htmlBg = getComputedStyle(document.documentElement).backgroundColor

    const sticky = [...document.querySelectorAll('*')]
      .filter((el) => {
        const p = getComputedStyle(el).position
        return (p === 'sticky' || p === 'fixed') && inView(el)
      })
      .slice(0, 16)
      .map((el) => {
        const cs = getComputedStyle(el)
        return {
          name: label(el),
          pos: cs.position,
          opacity: cs.opacity,
          transform: cs.transform === 'none' ? null : cs.transform.slice(0, 72),
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48),
        }
      })

    const movers = [...document.querySelectorAll('[data-framer-name], [style*="transform"], canvas, video, img')]
      .filter((el) => inView(el))
      .map((el) => {
        const cs = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        const area = Math.max(0, r.width) * Math.max(0, r.height)
        return {
          el,
          name: label(el),
          tag: el.tagName.toLowerCase(),
          opacity: Number(cs.opacity),
          transform: cs.transform === 'none' ? null : cs.transform.slice(0, 72),
          area,
          src: el.currentSrc || el.src || el.getAttribute('src') || null,
        }
      })
      .filter((x) => x.opacity > 0.05 && x.area > 8000)
      .sort((a, b) => b.area - a.area)
      .slice(0, 14)
      .map(({ el: _e, ...rest }) => rest)

    const texts = [...document.querySelectorAll('h1,h2,h3,p,[data-framer-name]')]
      .filter((el) => inView(el))
      .map((el) => {
        const cs = getComputedStyle(el)
        const t = (el.textContent || '').replace(/\s+/g, ' ').trim()
        if (t.length < 2 || t.length > 120) return null
        if (Number(cs.opacity) < 0.15) return null
        const size = parseFloat(cs.fontSize) || 0
        if (size < 14) return null
        return {
          name: label(el),
          text: t.slice(0, 80),
          size: cs.fontSize,
          color: cs.color,
          weight: cs.fontWeight,
          font: cs.fontFamily.split(',')[0].replace(/['"]/g, ''),
        }
      })
      .filter(Boolean)
      .slice(0, 12)

    const framerVisible = [...document.querySelectorAll('[data-framer-name]')]
      .filter(inView)
      .map((el) => el.getAttribute('data-framer-name'))
      .filter(Boolean)
      .slice(0, 40)

    const signature = JSON.stringify({
      sticky: sticky.map((s) => [s.name, s.pos, s.opacity, s.transform]),
      movers: movers.map((m) => [m.name, m.tag, m.opacity, m.transform, Math.round(m.area / 1000)]),
      texts: texts.map((t) => [t.text, t.size]),
      bg: [bodyBg, htmlBg],
    })

    return {
      y: Math.round(window.scrollY),
      bodyBg,
      htmlBg,
      sticky,
      movers,
      texts,
      framerVisible,
      signature,
    }
  })
}

async function collectFramerNames(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-framer-name]')]
      .map((el) => el.getAttribute('data-framer-name'))
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 100),
  )
}

async function collectHeadings(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('h1,h2')]
      .slice(0, 24)
      .map((h) => ({
        tag: h.tagName,
        text: h.textContent.replace(/\s+/g, ' ').trim().slice(0, 60),
        font: getComputedStyle(h).fontFamily.split(',')[0].replace(/"/g, ''),
        size: getComputedStyle(h).fontSize,
      })),
  )
}

function diffBeats(prev, next) {
  if (!prev) return ['beat inicial']
  const changes = []
  if (prev.bodyBg !== next.bodyBg || prev.htmlBg !== next.htmlBg) {
    changes.push(`fondo: ${prev.bodyBg} → ${next.bodyBg}`)
  }
  const prevStick = new Set(prev.sticky.map((s) => s.name))
  const nextStick = new Set(next.sticky.map((s) => s.name))
  for (const n of nextStick) if (!prevStick.has(n)) changes.push(`sticky entra: ${n}`)
  for (const n of prevStick) if (!nextStick.has(n)) changes.push(`sticky sale: ${n}`)

  const prevM = new Map(prev.movers.map((m) => [m.name, m]))
  for (const m of next.movers) {
    const p = prevM.get(m.name)
    if (!p) changes.push(`figura entra: ${m.name} (${m.tag})`)
    else if (p.transform !== m.transform || Math.abs(p.opacity - m.opacity) > 0.08) {
      changes.push(
        `figura mueve: ${m.name} opacity ${p.opacity}→${m.opacity}${m.transform ? ` t=${m.transform.slice(0, 40)}` : ''}`,
      )
    }
  }

  const prevT = new Set(prev.texts.map((t) => t.text))
  const nextT = new Set(next.texts.map((t) => t.text))
  for (const t of nextT) if (!prevT.has(t)) changes.push(`texto aparece: “${t.slice(0, 50)}”`)
  for (const t of prevT) if (!nextT.has(t)) changes.push(`texto sale: “${t.slice(0, 50)}”`)

  return changes.length ? changes : ['cambio sutil de composición']
}

async function sampleScrollAdaptive(page, { steps, shots, shotDir }) {
  const max = await page.evaluate(() =>
    Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
  )
  const beats = []
  let prev = null
  let kept = 0

  if (shots) fs.mkdirSync(shotDir, { recursive: true })

  for (let i = 0; i <= steps; i += 1) {
    const progress = i / steps
    const y = Math.round(max * progress)
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(i === 0 ? 400 : 160)

    const scene = await captureScene(page)
    const isEdge = i === 0 || i === steps
    const changed = !prev || scene.signature !== prev.signature

    if (!isEdge && !changed) continue

    const changes = diffBeats(prev, scene)
    const beatIndex = kept
    let shotRel = null
    if (shots) {
      const file = `beat-${String(beatIndex).padStart(2, '0')}.jpg`
      const abs = path.join(shotDir, file)
      await page.screenshot({
        path: abs,
        type: 'jpeg',
        quality: 52,
        fullPage: false,
      })
      shotRel = file
    }

    beats.push({
      index: beatIndex,
      progress: +progress.toFixed(3),
      y: scene.y,
      bodyBg: scene.bodyBg,
      sticky: scene.sticky,
      movers: scene.movers,
      texts: scene.texts,
      framerVisible: scene.framerVisible,
      changes,
      shot: shotRel,
    })
    prev = scene
    kept += 1
    // Cap beats for efficiency (precision via change detection, not volume)
    if (kept >= 48) break
  }

  await page.evaluate(() => window.scrollTo(0, 0))
  return { maxScroll: max, beats }
}

async function annotateWithGemini({ url, name, beats, shotDir }) {
  const key = geminiKey()
  if (!key) return null

  // Una sola request: texto de diffs + hasta 8 screenshots clave (eficiente).
  const pick = []
  const n = beats.length
  if (n <= 8) pick.push(...beats)
  else {
    pick.push(beats[0])
    const mid = [0.2, 0.35, 0.5, 0.65, 0.8].map((p) =>
      beats.reduce((best, b) =>
        Math.abs(b.progress - p) < Math.abs(best.progress - p) ? b : best,
      ),
    )
    for (const b of mid) if (!pick.includes(b)) pick.push(b)
    pick.push(beats[n - 1])
  }

  const parts = [
    {
      text: `Sos un director de motion para scrollytelling. URL: ${url}. Sitio: ${name}.
Para cada beat listado, anotá en español rioplatense, breve y accionable:
- fondo (color / atmósfera)
- figuras / media (qué se mueve)
- texto (qué dice / tipografía)
- tipo de motion (pin, fade, parallax, scrub, horizontal…)
Respondé SOLO Markdown con ## Beat N (progress) por cada uno.`,
    },
  ]

  for (const b of pick) {
    parts.push({
      text: `\n### Input Beat ${b.index} (progress ${b.progress}, y=${b.y})\nCambios:\n${b.changes.map((c) => `- ${c}`).join('\n')}\nTextos: ${b.texts.map((t) => t.text).join(' | ') || '—'}\nSticky: ${b.sticky.map((s) => s.name).join(', ') || '—'}\nMovers: ${b.movers.map((m) => m.name).join(', ') || '—'}`,
    })
    if (b.shot && shotDir) {
      const abs = path.join(shotDir, b.shot)
      if (fs.existsSync(abs)) {
        const buf = fs.readFileSync(abs)
        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: buf.toString('base64'),
          },
        })
      }
    }
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    console.warn(`⚠ Gemini ${res.status}: ${errText.slice(0, 200)}`)
    return null
  }
  const json = await res.json()
  const text =
    json?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n') ||
    null
  return text
}

function inferTechniques(libs, framerNames, beats) {
  const tech = []
  if (libs.found.includes('lenis')) tech.push('Smooth scroll: Lenis')
  if (libs.found.includes('gsap')) tech.push('Motion: GSAP / ScrollTrigger')
  if (libs.found.includes('framer')) {
    tech.push('Builder: Framer (scroll components / variants)')
    tech.push('SCROLLLAB port target: Lenis + GSAP ScrollTrigger')
  }
  if (libs.found.includes('three')) tech.push('3D: three.js')
  if (framerNames.some((n) => /pin|sticky|pinned/i.test(n))) {
    tech.push('Pinned / sticky stages detected by name')
  }
  if (framerNames.some((n) => /panel|track|slider|marquee/i.test(n))) {
    tech.push('Horizontal panel / track / slider pattern')
  }
  if (framerNames.some((n) => /parallax|drift|zoom|immersive/i.test(n))) {
    tech.push('Parallax / zoom / immersive scrub markers')
  }
  const stickyHits = beats.flatMap((b) => b.sticky.map((x) => x.name))
  const uniqSticky = [...new Set(stickyHits)].slice(0, 20)
  if (uniqSticky.length) tech.push(`Sticky/fixed nodes: ${uniqSticky.join(', ')}`)
  tech.push(`Beats significativos: ${beats.length} (solo cambios de firma)`)
  return tech
}

function buildMarkdown({
  url,
  sku,
  name,
  libs,
  framerNames,
  headings,
  maxScroll,
  beats,
  tech,
  aiNotes,
  shotDirRel,
}) {
  const title = name || sku
  const date = new Date().toISOString().slice(0, 10)

  const beatBlocks = beats
    .map((b) => {
      const shotLine = b.shot
        ? `\n![beat ${b.index}](${shotDirRel}/${b.shot})`
        : ''
      const movers = b.movers
        .slice(0, 6)
        .map((m) => `- **${m.name}** (${m.tag}) opacity=${m.opacity}${m.transform ? ` · \`${m.transform}\`` : ''}`)
        .join('\n')
      const texts = b.texts
        .slice(0, 6)
        .map((t) => `- “${t.text.replace(/\|/g, '/')}” · ${t.size} ${t.font}`)
        .join('\n')
      return `### Beat ${b.index} — ${(b.progress * 100).toFixed(0)}% (y=${b.y})
${shotLine}

**Cambios vs anterior**
${b.changes.map((c) => `- ${c}`).join('\n')}

**Fondo:** \`${b.bodyBg}\`

**Figuras / media**
${movers || '- —'}

**Texto visible**
${texts || '- —'}

**Sticky:** ${b.sticky.map((s) => s.name).join(', ') || '—'}
`
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
beats: ${beats.length}
---

# ${title} — análisis de referencia

Generado por \`scripts/analyze-reference.mjs\` el ${date}.

**URL:** ${url}  
**SKU sugerido:** \`${sku}\`  
**Title:** ${libs.title || '—'}  
**Beats:** ${beats.length} (muestreo adaptativo; solo cambios) · maxScroll=${maxScroll}px

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

${framerNames.length ? framerNames.map((n) => `- ${n}`).join('\n') : '- (no Framer names)'}

## Headings

| Tag | Texto | Font | Size |
|---|---|---|---|
${headings.map((h) => `| ${h.tag} | ${h.text.replace(/\|/g, '/')} | ${h.font} | ${h.size} |`).join('\n')}

## Beats (fondo / figura / texto)

${beatBlocks}

${aiNotes ? `## Anotación IA (Gemini)\n\n${aiNotes}\n` : '## Anotación IA\n\n_Sin `GEMINI_API_KEY` / `GOOGLE_API_KEY` — solo captura mecánica._\n'}

## Port a SCROLLLAB

1. Smooth scroll → \`SmoothScrollProvider\` (Lenis)
2. Cada beat → primitivo del cookbook (\`docs/motion-cookbook.md\`) + sección en \`src/components/sections/${sku}/\`
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
      'Uso: npm run analyze:ref -- <url> [--sku unity] [--name "Unity"] [--steps 32] [--no-shots] [--no-ai]',
    )
    process.exit(1)
  }

  const sku = (args.sku || guessSku(args.url)).toLowerCase().replace(/[^a-z0-9-]/g, '')
  const name = args.name || sku.toUpperCase()
  const localDir = path.join(ROOT, 'docs', 'reference-analysis')
  const shotDir = path.join(localDir, sku, 'beats')
  const shotDirRel = `${sku}/beats`

  console.log(`Analizando ${args.url}… (steps≤${args.steps}, shots=${args.shots}, ai=${args.ai})`)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(4000)

  const libs = await detectLibraries(page)
  const framerNames = await collectFramerNames(page)
  const headings = await collectHeadings(page)
  const { maxScroll, beats } = await sampleScrollAdaptive(page, {
    steps: args.steps,
    shots: args.shots,
    shotDir,
  })
  const tech = inferTechniques(libs, framerNames, beats)

  let aiNotes = null
  if (args.ai && geminiKey()) {
    console.log('Anotando beats con Gemini…')
    aiNotes = await annotateWithGemini({
      url: args.url,
      name,
      beats,
      shotDir,
    })
  } else if (args.ai) {
    console.log('IA omitida (definí GEMINI_API_KEY o GOOGLE_API_KEY en .env)')
  }

  await browser.close()

  const md = buildMarkdown({
    url: args.url,
    sku,
    name,
    libs,
    framerNames,
    headings,
    maxScroll,
    beats,
    tech,
    aiNotes,
    shotDirRel,
  })

  const outName = `${name} - analisis de referencia.md`
  const outPath = path.join(args.vault, outName)
  fs.mkdirSync(args.vault, { recursive: true })
  fs.writeFileSync(outPath, md, 'utf8')

  fs.mkdirSync(localDir, { recursive: true })
  const localPath = path.join(localDir, `${sku}.md`)
  fs.writeFileSync(localPath, md, 'utf8')

  // JSON machine-readable for the agent / future template creator
  const jsonPath = path.join(localDir, sku, 'beats.json')
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ url: args.url, sku, name, maxScroll, libs: libs.found, beats }, null, 2),
    'utf8',
  )

  console.log(`✓ Librerías: ${libs.found.join(', ') || '(ninguna)'}`)
  console.log(`✓ Beats: ${beats.length}`)
  console.log(`✓ Obsidian: ${outPath}`)
  console.log(`✓ Repo: ${localPath}`)
  console.log(`✓ JSON: ${jsonPath}`)
  if (args.shots) console.log(`✓ Shots: ${shotDir}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
