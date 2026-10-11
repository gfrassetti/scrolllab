/**
 * audit:editable — lo que `check:editable` (SSR) no ve: el CÓDIGO de cada
 * sección del builder (ella + lo que importa dentro de sections/).
 *
 * Por sección lista:
 *   colores fijos   hex/rgb/hsl/0x… y clases de color de Tailwind que no salen
 *                   de un campo (lo que es default de una prop con campo no
 *                   cuenta; el resto el comprador no lo puede cambiar)
 *   bg / fg         si tiene campo de fondo y de texto
 *   adornos         capas decorativas (burbujas, partículas, grano, cursor,
 *                   marquesina…) sin un campo para quitarlas
 *   fotos fijas     imágenes importadas que no tienen campo de imagen
 *
 * Es una lupa, no un juez: lo que marca hay que mirarlo. Uso:
 *   node scripts/audit-editable.mjs            resumen por modelo
 *   node scripts/audit-editable.mjs fizz       detalle de un modelo
 *   node scripts/audit-editable.mjs --json     todo, para otra herramienta
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SECTION_FIELDS } from '../src/domain/sectionFields/fields.js'
import { SECTION_IDS } from '../src/domain/sections.js'
import { BUILDER_HIDDEN_SKUS } from '../src/domain/catalog.js'
import { sectionFileClosure } from '../server/packaging.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const asJson = args.includes('--json')
const onlyModel = args.find((a) => !a.startsWith('--'))

const COLOR_LITERAL = /(['"`])\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))\s*\1|0x[0-9a-fA-F]{6}\b/g
// Clases de color de Tailwind con valor fijo (arbitrario o de paleta).
const TW_COLOR = /\b(?:bg|text|border|fill|stroke|from|via|to|ring|outline|decoration|shadow|accent|caret)-\[(?:#|rgb|hsl)[^\]]*\]/g
const DECOR = {
  burbujas: /bubble/i,
  partículas: /particle|confetti|sparkle|dust/i,
  grano: /\bgrain\b|\bnoise\b|scanline/i,
  cursor: /custom ?cursor|cursorRef|data-cursor/i,
  marquesina: /marquee/i,
  brillo: /\bglow\b|\bblob\b|\borb\b/i,
}

function fieldKeys(sectionId) {
  const keys = new Set()
  const walk = (fields) => {
    for (const f of fields || []) {
      keys.add(f.key)
      if (f.item) walk(f.item)
    }
  }
  walk(SECTION_FIELDS[sectionId])
  return keys
}

function fieldTypes(sectionId) {
  const types = new Set()
  const walk = (fields) => {
    for (const f of fields || []) {
      types.add(f.type)
      if (f.item) walk(f.item)
    }
  }
  walk(SECTION_FIELDS[sectionId])
  return types
}

function audit(sectionId) {
  const [model, component] = sectionId.split('/')
  const entry = path.join(ROOT, 'src/components/sections', model, `${component}.jsx`)
  if (!fs.existsSync(entry)) return null
  const files = [...sectionFileClosure(entry)].filter((f) => /\.(jsx?|mjs)$/.test(f))
  const keys = fieldKeys(sectionId)
  const types = fieldTypes(sectionId)

  const colors = []
  const decor = new Set()
  const images = []
  for (const file of files) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/')
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, i) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
      // default de una prop con campo: `bg = '#2c4bff',`
      const def = trimmed.match(/^(\w+)\s*=\s*['"`]/)
      const isFieldDefault = def && keys.has(def[1])
      for (const m of line.matchAll(COLOR_LITERAL)) {
        if (isFieldDefault) continue
        colors.push({ file: rel, line: i + 1, value: m[2] || m[0], code: trimmed.slice(0, 110) })
      }
      for (const m of line.matchAll(TW_COLOR)) {
        colors.push({ file: rel, line: i + 1, value: m[0], code: trimmed.slice(0, 110) })
      }
      // Los adornos se buscan en la sección misma, no en sus helpers (la
      // botella de FIZZ trae sus burbujas de adentro: son parte del objeto).
      if (file === entry) {
        for (const [name, re] of Object.entries(DECOR)) {
          if (re.test(line)) decor.add(name)
        }
      }
      const img = trimmed.match(/^import\s+(\w+)\s+from\s+['"](\.\.?\/[^'"]+\.(?:png|jpe?g|webp|avif|svg|mp4|webm))['"]/i)
      if (img) images.push(img[2])
    })
  }
  // Un adorno cuenta como controlable si hay un campo con su nombre (show…/…On/…).
  const decorWithoutSwitch = [...decor].filter((name) => {
    const re = DECOR[name]
    return ![...keys].some((k) => re.test(k))
  })
  return {
    sectionId,
    model,
    hasBg: keys.has('bg') || [...keys].some((k) => /bg$|Bg$|background/i.test(k)),
    hasFg: keys.has('fg') || [...keys].some((k) => /fg$|Ink$|ink$|textColor/i.test(k)),
    colors,
    decorWithoutSwitch,
    fixedImages: types.has('image') ? [] : images,
    fileCount: files.length,
  }
}

const sections = SECTION_IDS.filter((id) => !BUILDER_HIDDEN_SKUS.includes(id.split('/')[0]))
  .filter((id) => !onlyModel || id.startsWith(`${onlyModel}/`))
const results = sections.map(audit).filter(Boolean)

if (asJson) {
  console.log(JSON.stringify(results, null, 2))
  process.exit(0)
}

if (onlyModel) {
  for (const r of results) {
    console.log(`\n■ ${r.sectionId}  bg:${r.hasBg ? 'sí' : 'NO'} fg:${r.hasFg ? 'sí' : 'NO'}  adornos sin interruptor: ${r.decorWithoutSwitch.join(', ') || '—'}  fotos fijas: ${r.fixedImages.length}`)
    for (const c of r.colors) console.log(`   ${c.file}:${c.line}  ${c.value}   ${c.code}`)
  }
  process.exit(0)
}

const byModel = {}
for (const r of results) {
  const m = (byModel[r.model] ||= { sections: 0, noBg: [], noFg: [], colorLines: 0, withColors: 0, decor: 0, images: 0 })
  m.sections += 1
  if (!r.hasBg) m.noBg.push(r.sectionId.split('/')[1])
  if (!r.hasFg) m.noFg.push(r.sectionId.split('/')[1])
  m.colorLines += r.colors.length
  if (r.colors.length) m.withColors += 1
  if (r.decorWithoutSwitch.length) m.decor += 1
  if (r.fixedImages.length) m.images += 1
}
console.table(
  Object.fromEntries(
    Object.entries(byModel).map(([model, m]) => [
      model,
      {
        secciones: m.sections,
        'sin bg': m.noBg.length,
        'sin fg': m.noFg.length,
        'con colores fijos': m.withColors,
        'colores fijos (líneas)': m.colorLines,
        'adornos sin interruptor': m.decor,
        'fotos sin campo': m.images,
      },
    ]),
  ),
)
const total = results.length
console.log(
  `${total} secciones · sin bg: ${results.filter((r) => !r.hasBg).length} · con colores fijos: ${results.filter((r) => r.colors.length).length} · adornos sin interruptor: ${results.filter((r) => r.decorWithoutSwitch.length).length} · fotos sin campo: ${results.filter((r) => r.fixedImages.length).length}`,
)
