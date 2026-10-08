import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HOSTABLE_SECTIONS } from '../../server/sections.js'

/**
 * El frame del embed no carga el CSS del sitio: trae su propia lista de
 * fuentes (index.html) y de tokens (main.css). Una sección hosteable que usa
 * una familia o una clase `font-*` que el frame no trae se ve con la fuente de
 * reemplazo — y la clase que falta no rompe el build, se nota solo mirando
 * (fue el bug de ScopeSerif con `.atrium-lead`). Esto lo fija para cada
 * sección de HOSTABLE_SECTIONS.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8')

const html = read('embed/frame/index.html')
const css = read('embed/frame/main.css')
const registry = read('embed/src/registry.js')

const googleFamilies = new Set(
  [...html.matchAll(/family=([^&:"]+)/g)].map((m) => decodeURIComponent(m[1]).replace(/\+/g, ' ')),
)
const fontTokens = new Map(
  [...css.matchAll(/--font-([a-z-]+):\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]),
)
// Utilidades `font-*` de Tailwind que no son familias.
const NOT_A_FAMILY = new Set([
  'thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black',
  'sans', 'serif', 'stretch', 'size', 'feature', 'variant', 'smoothing',
])
const SYSTEM = /^(ui-|system-ui|sans-serif|serif|monospace|Georgia|SFMono)/

const source = (id) => read(`src/components/sections/${id}.jsx`)

describe('frame del embed — fuentes de las secciones hosteables', () => {
  it('cada token --font-* de main.css apunta a una familia que index.html carga', () => {
    for (const [token, family] of fontTokens) {
      assert.ok(googleFamilies.has(family), `--font-${token}: "${family}" no está en el <link> de Google Fonts`)
    }
  })

  for (const id of HOSTABLE_SECTIONS) {
    it(`${id}: cada clase font-* y cada fontFamily inline existe en el frame`, () => {
      const src = source(id)
      for (const [, name] of src.matchAll(/(?<![\w-])font-([a-z]+)(?![\w-])/g)) {
        if (NOT_A_FAMILY.has(name)) continue
        assert.ok(fontTokens.has(name), `font-${name}: falta --font-${name} en embed/frame/main.css`)
      }
      for (const [, list] of src.matchAll(/fontFamily[:=]\s*\{?\s*["'`]([^"'`]+)["'`]/g)) {
        const first = list.split(',')[0].trim().replace(/^'|'$/g, '')
        if (SYSTEM.test(first)) continue
        assert.ok(googleFamilies.has(first), `fontFamily "${first}" no está en embed/frame/index.html`)
      }
    })
  }
})

describe('frame del embed — registro', () => {
  const registered = new Set([...registry.matchAll(/^\s*'([a-z]+\/[A-Za-z0-9]+)':/gm)].map((m) => m[1]))

  it('cada sección de HOSTABLE_SECTIONS tiene componente en embed/src/registry.js', () => {
    for (const id of HOSTABLE_SECTIONS) assert.ok(registered.has(id), id)
  })

  it('el registro no carga secciones que el servidor no deja hostear (pesan en cada embed)', () => {
    for (const id of registered) assert.ok(HOSTABLE_SECTIONS.includes(id), id)
  })
})
