/**
 * Cross-file invariants that no test covers: the client and the server keep
 * duplicated tables (prices, section allowlists, i18n keys) that silently
 * drift apart. Run with `npm run check`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { PRODUCTS } from '../server/catalog.js'
import { ASSET_URL_KEYS, COLOR_PROP_KEYS, isHrefKey } from '../server/sectionFields.js'
import {
  TEMPLATE_PRICES_USD,
  CUSTOM_BASE_PRICE_USD,
  COMING_SOON_SKUS,
  LOCAL_ONLY_SKUS,
  BUILDER_HIDDEN_SKUS,
  BUNDLE_MODELS,
} from '../src/domain/catalog.js'
import { SECTION_FIELDS } from '../src/lib/sectionFields.js'
import { THEMED_MODELS, THEME_ADAPTIVE_SECTIONS } from '../src/lib/sectionTheme.js'
import { SECTION_KINDS, SECTION_IDS } from '../src/domain/sections.js'
import { checkoutPropsFrom } from '../src/lib/shop/checkoutProps.js'
import { BUILDER_SEO, LAB_SEO, SITE_SEO } from '../src/lib/site.js'
import { TEMPLATE_META } from '../src/features/home/templateMeta.js'

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

// 1. Precios: los dos lados importan src/domain/catalog.js, así que no hay
// espejo que comparar. Lo que sí puede faltar es el copy de Checkout Pro:
// cada SKU con precio necesita su producto en server/catalog.js.
for (const sku of Object.keys(TEMPLATE_PRICES_USD)) {
  if (!PRODUCTS[sku]) fail('precios', `'${sku}' tiene precio pero no producto en server/catalog.js`)
}
for (const sku of Object.keys(PRODUCTS)) {
  if (['bundle', 'custom'].includes(sku)) continue
  if (!(sku in TEMPLATE_PRICES_USD)) {
    fail('precios', `'${sku}' está en server/catalog.js sin precio en src/domain/catalog.js`)
  }
}

// 1c. El piso del builder tiene que quedar arriba del template más caro EN
// VENTA: si no, armar una composición sale menos que comprar un modelo
// entero. Los `coming soon` (ej. ratio) no cuentan — no se pueden comprar
// todavía, así que no deberían fijar el piso del builder.
const priciestTemplate = Math.max(
  ...Object.entries(TEMPLATE_PRICES_USD)
    .filter(([sku]) => !COMING_SOON_SKUS.includes(sku))
    .map(([, usd]) => usd),
)
if (CUSTOM_BASE_PRICE_USD <= priciestTemplate) {
  fail(
    'precios',
    `la base del builder (USD ${CUSTOM_BASE_PRICE_USD}) no supera al template más caro en venta (USD ${priciestTemplate})`,
  )
}

// Modelos solo locales (LOCAL_ONLY_SKUS: en producción su ruta redirige a la
// home y validateRecipe rechaza sus secciones): no se venden, así que no se
// les exige allowlist del server ni copy del builder. Ej. PLUM y SIGNAL, que
// no se van a terminar.
const isLocalOnlyModel = (id) => LOCAL_ONLY_SKUS.includes(String(id).split('/')[0])

// 2. Secciones: la tabla de src/domain/sections.js es la fuente (ids, kind y
// orden de la paleta); la allowlist del servidor se deriva de ahí y la fija
// server/__tests__/sections.test.js. El registry JSX suma componente, nombre
// y blurb, y tiene que cubrir exactamente la misma tabla.
const registryKinds = new Map(
  [...registrySrc.matchAll(/id:\s*'([a-z]+\/[A-Za-z0-9]+)'[\s\S]*?kind:\s*'([^']+)'/g)].map(
    (m) => [m[1], m[2]],
  ),
)
for (const id of diff(registryIds, SECTION_IDS)) {
  fail('secciones', `'${id}' está en sectionRegistry pero no en src/domain/sections.js`)
}
for (const id of diff(SECTION_IDS, registryIds)) {
  fail('secciones', `'${id}' está en src/domain/sections.js pero no en sectionRegistry`)
}
if (
  !diff(registryIds, SECTION_IDS).length &&
  !diff(SECTION_IDS, registryIds).length &&
  registryIds.join(',') !== SECTION_IDS.join(',')
) {
  fail('secciones', 'sectionRegistry y src/domain/sections.js tienen las secciones en distinto orden')
}
for (const [id, kind] of registryKinds) {
  if (SECTION_KINDS[id] && SECTION_KINDS[id] !== kind) {
    fail('secciones', `'${id}': kind '${kind}' en el registry vs '${SECTION_KINDS[id]}' en src/domain/sections.js`)
  }
}

// 3. Props editables: el servidor deriva su allowlist y el schema de listas de
// SECTION_FIELDS (server/sectionFields.js), así que no hay espejo que comparar.
// Lo que sigue chequea las reglas que el servidor aplica por su cuenta.

// 3a3. Tipos que el server valida: una imagen o un modelo que el server no
// valida como URL viaja al ZIP con cualquier cosa (un `blob:` del preview, un
// texto suelto).
for (const [id, fields] of Object.entries(SECTION_FIELDS)) {
  for (const field of fields) {
    const isAsset = ['image', 'url'].includes(field.type)
    if (isAsset && !ASSET_URL_KEYS.has(field.key)) {
      fail('props', `'${id}.${field.key}' es ${field.type} en el builder pero el server no lo valida como URL`)
    }
    if (!isAsset && ASSET_URL_KEYS.has(field.key) && field.type !== 'list') {
      fail('props', `'${id}.${field.key}' el server lo valida como URL pero en el builder es '${field.type}'`)
    }
  }
}

// 3a4. El servidor reconoce colores y links por el NOMBRE de la prop
// (COLOR_PROP_KEYS, isHrefKey en server/sectionFields.js), no por el `type` del
// campo. Un campo color/href con otro nombre se valida como texto libre: un
// `javascript:` en un href o CSS suelto en un style llegaría al ZIP / a LAB.
for (const [id, fields] of Object.entries(SECTION_FIELDS)) {
  for (const field of fields) {
    const ref = `${id}.${field.key}`
    if (field.type === 'href' && !isHrefKey(field.key)) {
      fail('props', `'${ref}' es href pero el server lo valida como texto: renombrala a *Href o sumá la regla`)
    }
    if (field.type === 'color' && !COLOR_PROP_KEYS.has(field.key)) {
      fail('props', `'${ref}' es color pero el server lo valida como texto: usá bg/fg/accent o sumá la clave a COLOR_PROP_KEYS`)
    }
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
  // Sin comentarios: sus paréntesis/comas partirían mal la lista. Solo líneas
  // que arrancan con `//` (un `//` suelto puede ser parte de una URL default).
  const body = src
    .slice(open + 1, end)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
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

for (const sku of COMING_SOON_SKUS) {
  if (BUNDLE_MODELS.includes(sku)) {
    fail('catálogo', `'${sku}' está en COMING_SOON_SKUS y también en BUNDLE_MODELS`)
  }
}
for (const sku of BUILDER_HIDDEN_SKUS) {
  if (!COMING_SOON_SKUS.includes(sku)) {
    fail(
      'catálogo',
      `'${sku}' está en BUILDER_HIDDEN_SKUS pero no en COMING_SOON_SKUS — no ocultes un modelo en venta`,
    )
  }
}
for (const sku of LOCAL_ONLY_SKUS) {
  if (!COMING_SOON_SKUS.includes(sku)) {
    fail('catálogo', `'${sku}' es local-only pero no está en COMING_SOON_SKUS`)
  }
  if (!BUILDER_HIDDEN_SKUS.includes(sku)) {
    fail('catálogo', `'${sku}' es local-only pero sigue en la paleta del builder`)
  }
}

// 3d. `auto` can only resolve to a model the form actually knows how to paint.
// Paletas = todo SKU vendible individualmente (bundle/custom no tienen tema propio),
// esté o no en el bundle de 8, esté o no todavía en COMING_SOON_SKUS.
const themedExpected = Object.keys(PRODUCTS).filter((sku) => !['bundle', 'custom'].includes(sku))
for (const model of diff(THEMED_MODELS, themedExpected)) {
  fail('temas', `THEMED_MODELS incluye '${model}' pero no es un modelo del catálogo`)
}
for (const model of diff(themedExpected, THEMED_MODELS)) {
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
  if (isLocalOnlyModel(id)) continue
  const key = `builder.sections.${id.replace('/', '.')}`
  for (const [name, keys] of [['es', esKeys], ['en', enKeys]]) {
    if (!keys.includes(`${key}.name`)) fail('i18n', `falta '${key}.name' en ${name}.json`)
    if (!keys.includes(`${key}.blurb`)) fail('i18n', `falta '${key}.blurb' en ${name}.json`)
  }
}

// 6. Catalog home: every listed model needs a route, a page and its copy.
const appSrc = read('src/App.jsx')
// Se importa (no regex sobre el JSX): si la lista se mueve o queda vacía, falla.
const listed = TEMPLATE_META.map((m) => m.sku)
if (listed.length === 0) {
  fail('catálogo', 'TEMPLATE_META (src/features/home/templateMeta.js) está vacío')
}
for (const sku of LOCAL_ONLY_SKUS) {
  if (listed.includes(sku)) {
    fail('catálogo', `'${sku}' es local-only pero se lista en la home`)
  }
}
for (const sku of COMING_SOON_SKUS) {
  if (LOCAL_ONLY_SKUS.includes(sku)) continue
  if (!listed.includes(sku)) {
    fail('catálogo', `'${sku}' es próximamente pero no se lista en la home`)
  }
}
for (const sku of COMING_SOON_SKUS) {
  if (!appSrc.includes(`/templates/${sku}`)) {
    fail('catálogo', `'${sku}' no tiene ruta en App.jsx`)
  }
  if (
    !new RegExp(
      `path="/templates/${sku}"[\\s\\S]{0,280}import\\.meta\\.env\\.DEV[\\s\\S]{0,160}Navigate to="/"`,
    ).test(appSrc)
  ) {
    fail(
      'catálogo',
      `'${sku}' es próximamente / local: en local debe renderizar la demo y en prod redirigir a /`,
    )
  }
}
for (const sku of listed) {
  if (!PRODUCTS[sku]) fail('catálogo', `'${sku}' se lista en la home pero no existe en catalog.js`)
  if (!appSrc.includes(`/templates/${sku}`)) {
    fail('catálogo', `'${sku}' se lista en la home pero no tiene ruta en App.jsx`)
  }
  const comingSoon = COMING_SOON_SKUS.includes(sku)
  if (comingSoon && !TEMPLATE_META.find((m) => m.sku === sku)?.comingSoon) {
    fail('catálogo', `'${sku}' es próximamente pero la home no lo marca comingSoon`)
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

const indexHtml = read('index.html')
if (!indexHtml.includes(SITE_SEO.title)) {
  fail('seo', 'el <title> de index.html no coincide con SITE_SEO.title')
}
if (!indexHtml.includes(SITE_SEO.description)) {
  fail('seo', 'la meta description de index.html no coincide con SITE_SEO.description')
}
if (!indexHtml.includes(BUILDER_SEO.title) || !indexHtml.includes(BUILDER_SEO.description)) {
  fail('seo', 'el boot de index.html no espeja BUILDER_SEO')
}
if (!indexHtml.includes(LAB_SEO.title) || !indexHtml.includes(LAB_SEO.description)) {
  fail('seo', 'el boot de index.html no espeja LAB_SEO')
}
const sitemapSrc = read('public/sitemap.xml')
if (!sitemapSrc.includes('/plantillas/')) {
  fail('seo', 'sitemap.xml debe listar las product pages /plantillas/<sku> (son las que indexan)')
}
if (!sitemapSrc.includes('https://www.scrolllab.com.ar/builder')) {
  fail('seo', 'sitemap.xml debe incluir /builder')
}

if (problems.length) {
  console.error(`\n✖ ${problems.length} inconsistencia(s):\n`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log('✓ Invariantes cliente/servidor OK')
