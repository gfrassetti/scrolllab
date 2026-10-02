/**
 * Versiones livianas de las fotos de los templates.
 *
 * Los originales (PNG de 1–3 MB que salen de Higgsfield) viven en
 * design/masters/<sku>/: no entran al build del sitio ni al ZIP que se vende.
 * Este script genera, en src/components/sections/<sku>/assets/:
 *
 *   <nombre>.webp       mismo tamaño que el original, calidad 80 (respeta el
 *                       alfa de los recortes)
 *   <nombre>-1080.webp  si el original es bastante más ancho: teléfonos DPR 2–3
 *   <nombre>-640.webp   ídem, para medias columnas y miniaturas
 *   <nombre>-320.webp   solo recortes con alfa (latas, marcas): se muestran chicos
 *   images.js           la URL de cada foto y su srcset (ver
 *                       src/lib/responsiveImage.js)
 *
 * Solo reprocesa los originales más nuevos que su .webp; el encoder es
 * determinista, así que regenerar lo que no cambió no ensucia el diff.
 *
 * Uso:
 *   npm run images                 # todos los templates con originales
 *   npm run images -- unity comic  # solo esos
 *   npm run images -- --force      # regenera todo
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MASTERS = path.join(REPO, 'design', 'masters')
const SECTIONS = path.join(REPO, 'src', 'components', 'sections')

/** Anchos intermedios; cada uno se genera solo si el original es ≥15 % más ancho. */
const WIDTHS = [640, 1080]
const CUTOUT_WIDTHS = [320]
const WEBP = { quality: 80, effort: 5, smartSubsample: true, alphaQuality: 90 }
const SOURCE_EXT = /\.(png|jpe?g)$/i

const camel = (file) =>
  file
    .replace(SOURCE_EXT, '')
    .replace(/[^a-z0-9]+(.)/gi, (_, c) => c.toUpperCase())
    .replace(/^[^a-z]+/i, '')

const isStale = (src, out) => !fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs

async function processSku(sku, force) {
  const masterDir = path.join(MASTERS, sku)
  const assetDir = path.join(SECTIONS, sku, 'assets')
  fs.mkdirSync(assetDir, { recursive: true })
  const files = fs
    .readdirSync(masterDir)
    .filter((f) => SOURCE_EXT.test(f))
    .sort()

  let written = 0
  let before = 0
  let after = 0
  const entries = []
  for (const file of files) {
    const src = path.join(masterDir, file)
    const base = file.replace(SOURCE_EXT, '')
    const meta = await sharp(src).metadata()
    const outputs = [{ width: meta.width, file: `${base}.webp` }]
    for (const w of meta.hasAlpha ? CUTOUT_WIDTHS : WIDTHS) if (meta.width >= w * 1.15) outputs.push({ width: w, file: `${base}-${w}.webp` })

    for (const out of outputs) {
      const dest = path.join(assetDir, out.file)
      if (force || isStale(src, dest)) {
        const img = sharp(src)
        if (out.width !== meta.width) img.resize({ width: out.width })
        await img.webp(WEBP).toFile(dest)
        written++
      }
    }
    before += fs.statSync(src).size
    after += fs.statSync(path.join(assetDir, outputs[0].file)).size
    entries.push({ name: camel(file), base, width: meta.width, height: meta.height, outputs })
  }

  // Los .webp de originales que ya no existen quedan huérfanos: se borran.
  const expected = new Set(entries.flatMap((e) => e.outputs.map((o) => o.file)))
  for (const f of fs.readdirSync(assetDir)) {
    if (f.endsWith('.webp') && !expected.has(f)) fs.rmSync(path.join(assetDir, f))
  }

  const ident = (e, o) => (o.width === e.width ? e.name : `${e.name}W${o.width}`)
  const lines = [
    `// Generado por scripts/gen-image-variants.mjs desde design/masters/${sku}/ — no editar a mano.`,
    '// Cada foto de ejemplo en WebP, con versiones más angostas para el srcset.',
    ...entries.flatMap((e) => e.outputs.map((o) => `import ${ident(e, o)} from './${o.file}'`)),
    '',
    `export { ${entries.map((e) => e.name).join(', ')} }`,
    '',
    '/** srcset y tamaño intrínseco de cada foto, por URL: ver src/lib/responsiveImage.js. */',
    'export const variants = {',
    ...entries.map((e) => {
      const set = [...e.outputs]
        .sort((a, b) => a.width - b.width)
        .map((o) => `\${${ident(e, o)}} ${o.width}w`)
        .join(', ')
      return `  [${e.name}]: { srcSet: \`${set}\`, width: ${e.width}, height: ${e.height} },`
    }),
    '}',
    '',
  ]
  fs.writeFileSync(path.join(assetDir, 'images.js'), lines.join('\n'))
  return { sku, files: files.length, written, before, after }
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const only = args.filter((a) => !a.startsWith('--'))
  if (!fs.existsSync(MASTERS)) {
    console.error(`No existe ${path.relative(REPO, MASTERS)}`)
    process.exit(1)
  }
  const skus = fs
    .readdirSync(MASTERS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (!only.length || only.includes(d.name)))
    .map((d) => d.name)
  const missing = only.filter((s) => !skus.includes(s))
  if (missing.length) {
    console.error(`Sin originales en design/masters/: ${missing.join(', ')}`)
    process.exit(1)
  }
  const mb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`
  for (const sku of skus) {
    const r = await processSku(sku, force)
    console.log(
      `${sku}: ${r.files} fotos · ${r.written} archivos escritos · ${mb(r.before)} → ${mb(r.after)} (tamaño completo)`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
