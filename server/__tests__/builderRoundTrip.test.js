import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import { transformWithEsbuild } from 'vite'

import {
  SECTION_FIELDS,
  sanitizeProps,
  withoutEmptyRows,
} from '../../src/lib/sectionFields.js'
import { compositionToRecipe } from '../../src/lib/composition.js'
import { resolveSectionTheme } from '../../src/lib/sectionTheme.js'
import { checkoutPropsFromItems } from '../../src/lib/shop/checkoutProps.js'
import { sanitizeSectionProps } from '../sectionFields.js'
import { ALLOWED_SECTIONS } from '../sections.js'
import { BUILDER_HIDDEN_SKUS } from '../catalog.js'
import { validateRecipe } from '../validation.js'
import { packCustomTemplate } from '../packaging.js'
import { readZip } from './helpers/zip.js'

/**
 * Todo lo que el comprador edita en el builder tiene que llegar al ZIP tal
 * cual. El valor recorre cuatro manos: el editor (sanitizeProps, lo que pinta
 * el preview), el carrito (compositionToRecipe), el checkout del servidor
 * (validateRecipe) y el empaquetador (App.jsx). Si una de ellas descarta o
 * cambia algo que otra aceptó, el comprador ve una cosa y descarga otra.
 *
 * Estos tests lo cubren para cada campo editable de cada sección que vende el
 * builder, no para una muestra.
 */

const BUILDER_SECTIONS = [...ALLOWED_SECTIONS].filter(
  (id) => !BUILDER_HIDDEN_SKUS.includes(id.split('/')[0]),
)

/**
 * Las manos del lado de los datos para un solo campo. `preview` es lo que
 * dibuja CompositionCanvas: lo que aceptó el editor, sin filas vacías.
 */
function roundTrip(sectionId, key, value) {
  const preview = sanitizeProps(sectionId, { [key]: value })
  const [entry] = compositionToRecipe([{ uid: 'x', sectionId, props: preview }])
  const [saved] = validateRecipe([entry], 30)
  return {
    preview: withoutEmptyRows(preview)?.[key],
    cart: entry.props?.[key],
    server: saved.props?.[key],
    direct: sanitizeSectionProps(sectionId, entry.props)?.[key],
  }
}

// ——— valores de prueba por tipo: válidos, bordes y basura ———

const LONG = 'x'.repeat(2600)
const PROBES = {
  text: [
    'Hola',
    '  con espacios  ',
    'línea 1\nlínea 2',
    'Say "hola" </div> {x} \\ `y` ${z} — ñ 🙂',
    LONG,
    '',
    '   ',
    123,
    null,
    ['a'],
    { a: 1 },
  ],
  color: ['#abc', '#AABBCC', '#aabbccdd', 'rgb(1,2,3)', 'rgba(1, 2, 3, .5)', 'red', 'url(x)', '#12345', ' #abc '],
  href: [
    '#seccion',
    '/pagina',
    '/p?q=1#h',
    'https://a.com/c',
    'http://a.com',
    'mailto:a@b.co',
    'tel:+54 11 1234',
    'javascript:alert(1)',
    'ftp://x',
    'a b',
    ' https://a.com ',
    `https://a.com/${'x'.repeat(600)}`,
  ],
  asset: [
    'https://cdn.a.com/c.png',
    '/c.png',
    '/mi imagen.png',
    'http://a.com/c.png',
    'data:image/png;base64,AAA',
    'blob:http://localhost/1',
    ' /c.png ',
    `/${'x'.repeat(600)}`,
    'c.png',
  ],
}
PROBES.textarea = PROBES.text
PROBES.image = PROBES.asset
PROBES.url = [...PROBES.asset, '/api/contact', 'https://formspree.io/f/abc', 'Mi endpoint']

function probesFor(field) {
  if (field.type === 'select') {
    return [...(field.options || []).map((o) => o.value), 'nope', '']
  }
  if (field.type !== 'list') return PROBES[field.type] || PROBES.text
  const max = field.max ?? 12
  const sub = field.item || []
  const valid = Object.fromEntries(sub.map((s) => [s.key, validValue(s, 'fila')]))
  // Una fila por cada valor raro de cada sub-campo.
  const edgeRows = sub.flatMap((s) =>
    (PROBES[s.type] || PROBES.text).map((v) => ({ ...valid, [s.key]: v })),
  )
  return [
    [],
    [{}],
    [valid],
    [valid, {}, 'texto', null, { desconocido: 'x' }],
    Array.from({ length: max + 3 }, (_, i) => ({ ...valid, [sub[0].key]: `${i}` })),
    'no es lista',
    ...chunk(edgeRows, max),
  ]
}

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

/** Un valor válido y distinto del default, por tipo. */
function validValue(field, tag) {
  const slug = tag.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  switch (field.type) {
    case 'select':
      return field.options[field.options.length - 1].value
    case 'color':
      return '#1a2b3c'
    case 'href':
      return `https://example.com/${slug}`
    case 'image':
      return `https://cdn.example.com/${slug}.webp`
    case 'url':
      return `https://api.example.com/${slug}`
    default:
      // Bordes con espacios, salto de línea y caracteres que rompen JSX o JSON.
      return `  Editado ${tag}\n"comillas" {llaves} \\ </div> \${x} ñ 🙂  `
  }
}

/** El texto más largo que acepta el editor: tiene que llegar entero. */
const longText = (tag) => validValue({ type: 'text' }, tag).padEnd(2000, '·')

describe('builder → ZIP: cada campo editable llega igual', () => {
  it('lo que acepta el editor lo guardan igual el carrito y el servidor (todos los campos, todos los tipos)', () => {
    const broken = []
    let checked = 0
    for (const sectionId of BUILDER_SECTIONS) {
      for (const field of SECTION_FIELDS[sectionId] || []) {
        for (const value of probesFor(field)) {
          const r = roundTrip(sectionId, field.key, value)
          checked += 1
          for (const [hand, got] of [
            ['carrito', r.cart],
            ['servidor', r.server],
            ['servidor directo', r.direct],
          ]) {
            try {
              assert.deepEqual(got, r.preview)
            } catch {
              broken.push(
                `${sectionId}.${field.key} (${field.type}) ${JSON.stringify(value)?.slice(0, 60)}: ` +
                  `preview ${JSON.stringify(r.preview)?.slice(0, 80)} ≠ ${hand} ${JSON.stringify(got)?.slice(0, 80)}`,
              )
            }
          }
        }
      }
    }
    assert.ok(checked > 1000, `se probaron solo ${checked} combinaciones`)
    assert.deepEqual([...new Set(broken)], [])
  })
})

// ——— de punta a punta: una composición con todo editado, empaquetada ———

/**
 * Ejecuta el App.jsx del ZIP con los componentes reemplazados por stubs y
 * devuelve, en orden, las props que recibe cada sección. Es exactamente lo que
 * le pasa el código vendido a cada componente.
 */
async function appInstances(source) {
  // Los imports pasan a ser stubs con nombre; el resto del App.jsx se ejecuta tal cual.
  const body = source
    .replace(
      /^import\s+(\w+)\s+from\s+'([^']+)'\s*$/gm,
      (_, name, spec) => `const ${name} = __stub(${JSON.stringify(spec)})`,
    )
    .replace(
      /^import\s+\{([^}]+)\}\s+from\s+'([^']+)'\s*$/gm,
      (_, names, spec) => `const {${names}} = __named(${JSON.stringify(spec)})`,
    )
    .replace(/^export default function App/m, 'function App')
  assert.doesNotMatch(body, /^\s*(import|export)\b/m, 'quedó un import/export sin reemplazar')
  const { code } = await transformWithEsbuild(
    `function __app() {\n${body}\nreturn App\n}`,
    'App.jsx',
    { loader: 'jsx', jsx: 'transform', jsxFactory: 'h', jsxFragment: 'Fragment' },
  )
  const stubs = new Map()
  const stub = (name) => {
    if (!stubs.has(name)) {
      const fn = () => null
      fn.stubName = name
      stubs.set(name, fn)
    }
    return stubs.get(name)
  }
  const named = (spec) => new Proxy({}, { get: (_, key) => stub(`${spec}#${String(key)}`) })
  const h = (type, props, ...children) => ({ type, props: props || {}, children })
  const App = new Function('h', 'Fragment', '__stub', '__named', `${code}\nreturn __app()`)(
    h,
    'Fragment',
    stub,
    named,
  )

  const found = []
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(walk)
    const { type, props, children } = node
    if (typeof type === 'function' && !type.stubName) return walk(type(props))
    if (typeof type === 'function' && type.stubName.startsWith('./components/sections/')) {
      found.push({ id: type.stubName.replace('./components/sections/', ''), props })
    }
    if (props.element) walk(props.element)
    walk(children)
  }
  walk(h(App, {}))
  return found
}

describe('builder → ZIP: una composición con todo editado', () => {
  let tmp
  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scrolllab-roundtrip-'))
  })
  after(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('el App.jsx le pasa a cada sección exactamente lo que mostró el preview', async () => {
    let edited = 0
    const items = BUILDER_SECTIONS.map((sectionId, i) => {
      const raw = {}
      let longDone = false
      for (const field of SECTION_FIELDS[sectionId] || []) {
        edited += 1
        const isText = field.type === 'text' || field.type === 'textarea'
        if (isText && !longDone) {
          longDone = true
          raw[field.key] = longText(`${sectionId}.${field.key}`)
          continue
        }
        raw[field.key] =
          field.type === 'list'
            ? Array.from({ length: field.max ?? 12 }, (_, row) =>
                Object.fromEntries(
                  (field.item || []).map((s) => [
                    s.key,
                    validValue(s, `${sectionId}.${field.key}[${row}].${s.key}`),
                  ]),
                ),
              )
            : validValue(field, `${sectionId}.${field.key}`)
      }
      return { uid: `u${i}`, sectionId, props: sanitizeProps(sectionId, raw) }
    })

    // Cada campo que el editor ofrece quedó editado en el preview.
    for (const [i, item] of items.entries()) {
      for (const field of SECTION_FIELDS[item.sectionId] || []) {
        assert.ok(
          item.props?.[field.key] !== undefined,
          `el editor descartó ${items[i].sectionId}.${field.key}: el valor de prueba no es válido`,
        )
      }
    }
    const offered = BUILDER_SECTIONS.reduce(
      (sum, id) => sum + (SECTION_FIELDS[id] || []).length,
      0,
    )
    assert.ok(offered > 300, `el builder ofrece solo ${offered} campos`)
    assert.equal(edited, offered, 'quedaron campos del builder sin editar en la prueba')

    const recipe = validateRecipe(compositionToRecipe(items), items.length)
    const dest = path.join(tmp, 'all.zip')
    await packCustomTemplate({
      recipe,
      destPath: dest,
      licenseMeta: { orderId: 'rt', email: 'rt@test.com', purchaseCode: 'SL-RT', date: '2026-09-27' },
    })
    const app = readZip(fs.readFileSync(dest)).get('src/App.jsx').toString('utf8')
    const found = await appInstances(app)

    const sections = found.filter((f) => !['commerce/Checkout', 'commerce/ProductDetail', 'commerce/ShopChrome'].includes(f.id))
    assert.deepEqual(
      sections.map((s) => s.id),
      items.map((item) => item.sectionId),
      'el ZIP no trae las mismas secciones en el mismo orden',
    )

    const modelIds = items.map((item) => item.sectionId.split('/')[0])
    for (const [i, item] of items.entries()) {
      const theme = resolveSectionTheme(item.sectionId, item.props, modelIds, i)
      const expected = { ...(item.props || {}), ...(theme ? { theme } : {}) }
      if (item.sectionId === 'commerce/ProductGrid') {
        for (const key of Object.keys(expected)) if (key.startsWith('checkout')) delete expected[key]
      }
      assert.deepEqual(sections[i].props, expected, `${item.sectionId}: el ZIP no recibe lo editado`)
    }

    // Los textos del checkout se editan en la grilla y viajan a la ruta /checkout.
    const checkout = found.find((f) => f.id === 'commerce/Checkout')
    assert.ok(checkout, 'falta el Checkout del kit')
    assert.deepEqual(checkout.props, checkoutPropsFromItems(items))
  })
})
