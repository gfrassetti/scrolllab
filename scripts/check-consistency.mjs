/**
 * Cross-file invariants that no test covers: the client and the server keep
 * duplicated tables (prices, section allowlists, i18n keys) that silently
 * drift apart. Run with `npm run check`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PRODUCTS,
  BUNDLE_MODELS,
  COMMERCE_PACK_SURCHARGE_USD as SERVER_SURCHARGE,
  CUSTOM_BASE_SECTIONS as SERVER_BASE_SECTIONS,
  CUSTOM_EXTRA_SECTION_USD as SERVER_EXTRA_SECTION,
} from '../server/catalog.js'
import { ALLOWED_SECTIONS } from '../server/sections.js'
import { ALLOWED_PROPS_BY_SECTION } from '../server/sectionFields.js'
import {
  TEMPLATE_PRICES_USD,
  CUSTOM_BASE_PRICE_USD,
  CUSTOM_BASE_SECTIONS as CLIENT_BASE_SECTIONS,
  CUSTOM_EXTRA_SECTION_USD as CLIENT_EXTRA_SECTION,
  MAX_CUSTOM_SECTIONS,
  COMMERCE_PACK_SURCHARGE_USD as CLIENT_SURCHARGE,
  BUNDLE_PRICE_USD,
} from '../src/lib/pricing.js'
import { SECTION_FIELDS } from '../src/lib/sectionFields.js'
import { THEMED_MODELS, THEME_ADAPTIVE_SECTIONS } from '../src/lib/sectionTheme.js'
import { SECTION_KINDS } from '../src/lib/sectionKinds.js'
import { checkoutPropsFrom } from '../src/lib/shop/checkoutProps.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

const problems = []
const fail = (area, msg) => problems.push(`${area}: ${msg}`)

/** Section ids declared in the JSX registry (not importable from node). */
const registrySrc = read('src/lib/sectionRegistry.jsx')
const registryIds = [...registrySrc.matchAll(/id:\s*'([a-z]+\/[A-Za-z0-9]+)'/g)].map(
  (m) => m[1],
)

const diff = (a, b) => a.filter((x) => !b.includes(x))

// 1. Prices: server catalog is the source of truth, client must mirror it.
for (const [sku, usd] of Object.entries(TEMPLATE_PRICES_USD)) {
  const server = PRODUCTS[sku]
  if (!server) fail('precios', `'${sku}' está en pricing.js pero no en catalog.js`)
  else if (server.unit_price_usd !== usd) {
    fail('precios', `'${sku}': cliente USD ${usd} vs servidor USD ${server.unit_price_usd}`)
  }
}
for (const sku of Object.keys(PRODUCTS)) {
  if (['bundle', 'custom'].includes(sku)) continue
  if (!(sku in TEMPLATE_PRICES_USD)) {
    fail('precios', `'${sku}' está en catalog.js pero no en pricing.js`)
  }
}
if (PRODUCTS.custom.unit_price_usd !== CUSTOM_BASE_PRICE_USD) {
  fail('precios', `custom: cliente ${CUSTOM_BASE_PRICE_USD} vs servidor ${PRODUCTS.custom.unit_price_usd}`)
}
if (PRODUCTS.bundle.unit_price_usd !== BUNDLE_PRICE_USD) {
  fail('precios', `bundle: cliente ${BUNDLE_PRICE_USD} vs servidor ${PRODUCTS.bundle.unit_price_usd}`)
}
if (SERVER_SURCHARGE !== CLIENT_SURCHARGE) {
  fail('precios', `recargo commerce: cliente ${CLIENT_SURCHARGE} vs servidor ${SERVER_SURCHARGE}`)
}
if (SERVER_BASE_SECTIONS !== CLIENT_BASE_SECTIONS) {
  fail('precios', `secciones incluidas: cliente ${CLIENT_BASE_SECTIONS} vs servidor ${SERVER_BASE_SECTIONS}`)
}
if (SERVER_EXTRA_SECTION !== CLIENT_EXTRA_SECTION) {
  fail('precios', `sección extra: cliente USD ${CLIENT_EXTRA_SECTION} vs servidor USD ${SERVER_EXTRA_SECTION}`)
}

// 1b. El tope que muestra el builder tiene que ser el que aplica el checkout.
const configSrc = read('server/config.js')
const maxRecipeSections = Number(
  (configSrc.match(/maxRecipeSections:\s*(\d+)/) || [])[1],
)
if (maxRecipeSections !== MAX_CUSTOM_SECTIONS) {
  fail(
    'precios',
    `tope de secciones: pricing.js ${MAX_CUSTOM_SECTIONS} vs config.js ${maxRecipeSections}`,
  )
}

// 1c. El piso del builder tiene que quedar arriba del template más caro: si no,
// armar una composición sale menos que comprar un modelo entero.
const priciestTemplate = Math.max(...Object.values(TEMPLATE_PRICES_USD))
if (CUSTOM_BASE_PRICE_USD <= priciestTemplate) {
  fail(
    'precios',
    `la base del builder (USD ${CUSTOM_BASE_PRICE_USD}) no supera al template más caro (USD ${priciestTemplate})`,
  )
}

// 2. Sellable sections: registry (client) vs allowlist (server).
for (const id of diff(registryIds, [...ALLOWED_SECTIONS])) {
  fail('secciones', `'${id}' está en sectionRegistry pero no en server/sections.js`)
}
for (const id of diff([...ALLOWED_SECTIONS], registryIds)) {
  fail('secciones', `'${id}' está en server/sections.js pero no en sectionRegistry`)
}

// 2b. sectionKinds.js es el mapa plano que usa composition.js (y sus tests).
// Tiene que coincidir con el registry: si no, el builder deja agregar algo
// que el preview no sabe renderizar, o al revés.
const kindIds = Object.keys(SECTION_KINDS)
for (const id of diff(registryIds, kindIds)) {
  fail('secciones', `'${id}' está en el registry pero no en sectionKinds.js — corré node scripts/gen-section-kinds.mjs`)
}
for (const id of diff(kindIds, registryIds)) {
  fail('secciones', `'${id}' está en sectionKinds.js pero no en el registry`)
}

// 3. Editable props: builder fields vs server allowlist.
for (const [id, fields] of Object.entries(SECTION_FIELDS)) {
  const server = ALLOWED_PROPS_BY_SECTION[id]
  if (!server) {
    fail('props', `'${id}' tiene campos en el builder pero no en server/sectionFields.js`)
    continue
  }
  for (const key of diff(fields.map((f) => f.key), server)) {
    fail('props', `'${id}.${key}' es editable en el builder pero el servidor lo descarta`)
  }
}
for (const [id, keys] of Object.entries(ALLOWED_PROPS_BY_SECTION)) {
  if (!SECTION_FIELDS[id]) {
    fail('props', `'${id}' está en server/sectionFields.js pero no en el builder`)
    continue
  }
  const clientKeys = SECTION_FIELDS[id].map((f) => f.key)
  for (const key of diff(keys, clientKeys)) {
    fail('props', `'${id}.${key}' lo acepta el servidor pero no es editable en el builder`)
  }
}

// 3b. Select options must survive the server's preset allowlists, otherwise the
// builder offers a value that gets silently dropped from the sold ZIP.
const serverFieldsSrc = read('server/sectionFields.js')
const presetSets = Object.fromEntries(
  [...serverFieldsSrc.matchAll(/const ([A-Z]+)_PRESETS = new Set\(\[([^\]]*)\]/g)].map(
    ([, name, body]) => [
      name.toLowerCase(),
      [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]),
    ],
  ),
)
for (const [id, fields] of Object.entries(SECTION_FIELDS)) {
  for (const field of fields) {
    const presets = presetSets[field.key]
    if (!presets || !field.options) continue
    for (const value of diff(field.options.map((o) => o.value), presets)) {
      fail('props', `'${id}.${field.key}' ofrece '${value}' y el servidor no lo acepta`)
    }
  }
}

// 3c. An editable field whose key is not a prop of the component is a no-op:
// the builder shows an input that changes nothing in the sold ZIP.
function componentProps(file) {
  const src = fs.readFileSync(file, 'utf8')
  const start = src.indexOf('export default function')
  if (start === -1) return null
  const open = src.indexOf('{', src.indexOf('(', start))
  if (open === -1) return null

  let depth = 0
  let end = -1
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1
    else if (src[i] === '}') {
      depth -= 1
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) return null

  // Top-level commas only: defaults can be arrays or objects with commas inside.
  const body = src.slice(open + 1, end)
  const parts = []
  let level = 0
  let current = ''
  for (const ch of body) {
    if ('{[('.includes(ch)) level += 1
    else if ('}])'.includes(ch)) level -= 1
    if (ch === ',' && level === 0) {
      parts.push(current)
      current = ''
    } else current += ch
  }
  parts.push(current)

  return new Set(
    parts
      .map((p) => p.trim().split(/[=:]/)[0].trim())
      .filter((p) => /^[A-Za-z_$][\w$]*$/.test(p)),
  )
}

const COMMERCE_GRID_ID = 'commerce/ProductGrid'
const checkoutProps = componentProps(
  path.join(ROOT, 'src/components/sections/commerce/Checkout.jsx'),
)

for (const [id, fields] of Object.entries(SECTION_FIELDS)) {
  const [model, component] = id.split('/')
  const file = path.join(ROOT, 'src/components/sections', model, `${component}.jsx`)
  if (!fs.existsSync(file)) {
    fail('secciones', `'${id}' no tiene archivo en src/components/sections`)
    continue
  }
  const props = componentProps(file)
  if (!props) continue
  for (const field of fields) {
    // El checkout es una ruta, no una sección: sus textos se editan desde el
    // ProductGrid con prefijo `checkout` y se reenvían a Checkout.jsx.
    if (id === COMMERCE_GRID_ID && field.key.startsWith('checkout')) {
      const forwarded = checkoutPropsFrom({ [field.key]: 'x' })
      const [target] = Object.keys(forwarded)
      if (!target || !checkoutProps?.has(target)) {
        fail('props', `'${id}.${field.key}' es editable pero Checkout no recibe '${target}'`)
      }
      continue
    }
    if (!props.has(field.key)) {
      fail('props', `'${id}.${field.key}' es editable pero ${component} no recibe esa prop`)
    }
  }
}

// 3d. `auto` can only resolve to a model the form actually knows how to paint.
for (const model of diff(THEMED_MODELS, BUNDLE_MODELS)) {
  fail('temas', `THEMED_MODELS incluye '${model}' pero no es un modelo del catálogo`)
}
for (const model of diff(BUNDLE_MODELS, THEMED_MODELS)) {
  fail('temas', `'${model}' es un modelo del catálogo pero no tiene paleta en THEMED_MODELS`)
}
for (const id of THEME_ADAPTIVE_SECTIONS) {
  const field = (SECTION_FIELDS[id] || []).find((f) => f.key === 'theme')
  if (!field) {
    fail('temas', `'${id}' se resuelve por contexto pero no tiene campo 'theme'`)
    continue
  }
  const offered = field.options.map((o) => o.value).filter((v) => v !== 'auto')
  for (const model of diff(THEMED_MODELS, offered)) {
    fail('temas', `'${id}' puede resolverse a '${model}' pero no lo ofrece el select`)
  }
}

// 4. i18n: both locales must expose the same keys.
const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? flatten(v, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  )
const es = JSON.parse(read('src/i18n/locales/es.json'))
const en = JSON.parse(read('src/i18n/locales/en.json'))
const esKeys = flatten(es)
const enKeys = flatten(en)
for (const k of diff(esKeys, enKeys)) fail('i18n', `'${k}' falta en en.json`)
for (const k of diff(enKeys, esKeys)) fail('i18n', `'${k}' falta en es.json`)

// 5. Every registry section needs its builder copy in both locales.
for (const id of registryIds) {
  const key = `builder.sections.${id.replace('/', '.')}`
  for (const [name, keys] of [['es', esKeys], ['en', enKeys]]) {
    if (!keys.includes(`${key}.name`)) fail('i18n', `falta '${key}.name' en ${name}.json`)
    if (!keys.includes(`${key}.blurb`)) fail('i18n', `falta '${key}.blurb' en ${name}.json`)
  }
}

// 6. Catalog home: every listed model needs a route, a page and its copy.
const indexSrc = read('src/pages/TemplatesIndex.jsx')
const appSrc = read('src/App.jsx')
const metaBlock = indexSrc.slice(
  indexSrc.indexOf('const TEMPLATE_META'),
  indexSrc.indexOf('function TemplatePoster'),
)
const listed = [...metaBlock.matchAll(/sku:\s*'([a-z]+)'/g)].map((m) => m[1])
for (const sku of listed) {
  if (!PRODUCTS[sku]) fail('catálogo', `'${sku}' se lista en la home pero no existe en catalog.js`)
  if (!appSrc.includes(`/templates/${sku}`)) {
    fail('catálogo', `'${sku}' se lista en la home pero no tiene ruta en App.jsx`)
  }
  for (const [name, keys] of [['es', esKeys], ['en', enKeys]]) {
    if (!keys.includes(`templates.${sku}.description`)) {
      fail('i18n', `falta 'templates.${sku}.description' en ${name}.json`)
    }
  }
}

// 7. Packable models: bundle + fixed SKUs must have packaging config.
const packagingSrc = read('server/packaging.js')
const modelFiles = packagingSrc.slice(
  packagingSrc.indexOf('const MODEL_FILES'),
  packagingSrc.indexOf('const SHARED'),
)
for (const model of BUNDLE_MODELS) {
  if (!new RegExp(`\\b${model}:\\s*\\{`).test(modelFiles)) {
    fail('packaging', `'${model}' está en BUNDLE_MODELS pero no en MODEL_FILES`)
  }
}
for (const sku of Object.keys(PRODUCTS)) {
  if (['bundle', 'custom'].includes(sku)) continue
  if (!new RegExp(`\\b${sku}:\\s*\\{`).test(modelFiles)) {
    fail('packaging', `el SKU '${sku}' no tiene entrada en MODEL_FILES`)
  }
}

// 8. Pages must not import sections the ZIP will not carry.
const crossDirs = [...packagingSrc.matchAll(/CROSS_MODEL_DIRS = \[([^\]]*)\]/g)]
  .flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]))
for (const model of BUNDLE_MODELS) {
  const pageRel = `src/pages/${model[0].toUpperCase()}${model.slice(1)}Page.jsx`
  if (!fs.existsSync(path.join(ROOT, pageRel))) continue
  const pageSrc = read(pageRel)
  const dirs = [...pageSrc.matchAll(/sections\/([a-z]+)\//g)].map((m) => m[1])
  for (const dir of [...new Set(dirs)]) {
    if (dir !== model && !crossDirs.includes(dir)) {
      fail('packaging', `${pageRel} importa 'sections/${dir}' y el ZIP de '${model}' no lo incluye`)
    }
  }
}

if (problems.length) {
  console.error(`\n✖ ${problems.length} inconsistencia(s):\n`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log('✓ Invariantes cliente/servidor OK')
