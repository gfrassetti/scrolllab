import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import { BUNDLE_MODELS } from '../catalog.js'
import {
  packBundleTemplate,
  packCustomTemplate,
  packFixedTemplate,
} from '../packaging.js'
import { brokenImports, readZip } from './helpers/zip.js'

/**
 * Lo que se vende es el ZIP, no el repo. Estos tests lo empaquetan de verdad,
 * lo abren y comprueban que sea un proyecto que arranca: que estén los
 * archivos de arranque y que ningún import relativo apunte a un archivo que
 * quedó afuera. Un ZIP roto no lo detecta ningún test del repo.
 */

const LICENSE = { orderId: 'test-order', email: 'buyer@test.com' }

let tmp

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scrolllab-pack-'))
})

after(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
})

async function pack(name, run) {
  const dest = path.join(tmp, `${name}.zip`)
  await run(dest)
  const buf = fs.readFileSync(dest)
  assert.equal(buf.subarray(0, 2).toString('latin1'), 'PK', 'no es un ZIP')
  return readZip(buf)
}

/** Un proyecto Vite que arranca necesita al menos esto. */
function assertRunnableProject(files, prefix = '') {
  for (const required of [
    'package.json',
    'index.html',
    'vite.config.js',
    'src/main.jsx',
    'src/App.jsx',
    'src/index.css',
  ]) {
    assert.ok(files.has(prefix + required), `falta ${prefix}${required}`)
  }
  const pkg = JSON.parse(files.get(`${prefix}package.json`).toString('utf8'))

  // El README le dice al comprador que corra esto: tiene que funcionar con lo
  // que hay en el ZIP, sin carpetas del marketplace.
  assert.equal(pkg.scripts.dev, 'vite')
  assert.equal(pkg.scripts.build, 'vite build')
  for (const [name, script] of Object.entries(pkg.scripts)) {
    assert.doesNotMatch(
      script,
      /server\/|scripts\/|nodemon|concurrently/,
      `el script '${name}' apunta a archivos que el ZIP no trae: ${script}`,
    )
  }

  // Nadie que compra una landing debería instalar la infra del marketplace.
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  for (const server of [
    'express',
    'mongoose',
    'mongodb',
    'passport',
    'mercadopago',
    'resend',
    'archiver',
    'jsonwebtoken',
    'bcryptjs',
    'supertest',
    'playwright',
    'nodemon',
  ]) {
    assert.ok(!(server in deps), `el template arrastra '${server}'`)
  }

  assert.ok(pkg.dependencies.react, 'falta react')
  assert.ok(pkg.devDependencies.vite, 'falta vite')
  return pkg
}

/** Todo paquete importado por el código tiene que estar declarado. */
function assertDepsCoverImports(files, prefix = '') {
  const pkg = JSON.parse(files.get(`${prefix}package.json`).toString('utf8'))
  const declared = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ])

  for (const [name, content] of files) {
    if (!name.startsWith(prefix) || !/\.(jsx?|tsx?)$/.test(name)) continue
    const specs = [
      ...content.toString('utf8').matchAll(/from\s+'([^'.][^']*)'/g),
    ].map((m) => m[1])
    for (const spec of specs) {
      if (spec.startsWith('node:')) continue
      const dep = spec.startsWith('@')
        ? spec.split('/').slice(0, 2).join('/')
        : spec.split('/')[0]
      assert.ok(declared.has(dep), `${name} importa '${dep}' y no está en package.json`)
    }
  }
}

describe('ZIP de cada template', () => {
  for (const model of BUNDLE_MODELS) {
    it(`${model} es un proyecto completo y sin imports rotos`, async () => {
      const files = await pack(model, (destPath) =>
        packFixedTemplate({ model, destPath, licenseMeta: LICENSE }),
      )

      assertRunnableProject(files)
      assertDepsCoverImports(files)
      assert.ok(files.has('LICENSE.txt'), 'falta LICENSE.txt')
      assert.match(
        files.get('LICENSE.txt').toString('utf8'),
        /buyer@test\.com/,
        'la licencia no lleva el watermark del comprador',
      )
      assert.deepEqual(brokenImports(files), [])

      const app = files.get('src/App.jsx').toString('utf8')
      assert.match(app, /export default function App/)
    })
  }

  it('el bundle trae un proyecto por modelo', async () => {
    const files = await pack('bundle', (destPath) =>
      packBundleTemplate({ models: BUNDLE_MODELS, destPath, licenseMeta: LICENSE }),
    )

    for (const model of BUNDLE_MODELS) {
      assertRunnableProject(files, `${model}/`)
      assertDepsCoverImports(files, `${model}/`)
    }
    assert.ok(files.has('LICENSE.txt'), 'el bundle no trae licencia en la raíz')
    assert.deepEqual(brokenImports(files), [])
  })

  it('incluye el formulario de contacto que la página importa', async () => {
    const files = await pack('contact', (destPath) =>
      packFixedTemplate({ model: 'monolith', destPath, licenseMeta: LICENSE }),
    )
    assert.ok(files.has('src/components/sections/contact/ContactForm.jsx'))
  })
})

describe('ZIP del builder', () => {
  const recipe = [
    'chapters/HeroKinetic',
    'nocturne/SplitReveals',
    { id: 'contact/ContactForm', props: { title: 'Hablemos' } },
    'atelier/FooterAtelier',
  ]

  it('arma un proyecto completo con secciones de varios modelos', async () => {
    const files = await pack('custom', (destPath) =>
      packCustomTemplate({ recipe, destPath, licenseMeta: LICENSE }),
    )

    assertRunnableProject(files)
    assertDepsCoverImports(files)
    assert.deepEqual(brokenImports(files), [])

    const app = files.get('src/App.jsx').toString('utf8')
    for (const id of ['HeroKinetic', 'SplitReveals', 'ContactForm', 'FooterAtelier']) {
      assert.match(app, new RegExp(id), `App.jsx no renderiza ${id}`)
    }
  })

  it('resuelve el tema del contact form al de la sección de arriba', async () => {
    const files = await pack('custom-theme', (destPath) =>
      packCustomTemplate({ recipe, destPath, licenseMeta: LICENSE }),
    )
    const app = files.get('src/App.jsx').toString('utf8')
    const tag = app.match(/<ContactForm_contact[^/]*\/>/)?.[0] || ''
    assert.match(tag, /theme=\{"nocturne"\}/, `tema sin resolver: ${tag}`)
    assert.match(tag, /title=\{"Hablemos"\}/, 'se perdió el texto del usuario')
  })

  it('respeta el tema que el usuario eligió a mano', async () => {
    const files = await pack('custom-explicit', (destPath) =>
      packCustomTemplate({
        recipe: [
          'chapters/HeroKinetic',
          { id: 'contact/ContactForm', props: { theme: 'fizz' } },
        ],
        destPath,
        licenseMeta: LICENSE,
      }),
    )
    const app = files.get('src/App.jsx').toString('utf8')
    assert.match(app.match(/<ContactForm_contact[^/]*\/>/)?.[0] || '', /theme=\{"fizz"\}/)
  })

  it('usa la sección de abajo cuando el formulario abre la página', async () => {
    const files = await pack('custom-first', (destPath) =>
      packCustomTemplate({
        recipe: ['contact/ContactForm', 'velocity/HeroStrike'],
        destPath,
        licenseMeta: LICENSE,
      }),
    )
    const app = files.get('src/App.jsx').toString('utf8')
    assert.match(
      app.match(/<ContactForm_contact[^/]*\/>/)?.[0] || '',
      /theme=\{"velocity"\}/,
    )
  })

  it('incluye el kit de commerce cuando la receta lo pide', async () => {
    const files = await pack('custom-shop', (destPath) =>
      packCustomTemplate({
        recipe: [
          'nocturne/HeroCinematic',
          { id: 'commerce/ProductGrid', props: { theme: 'auto' } },
        ],
        destPath,
        licenseMeta: LICENSE,
      }),
    )
    assert.ok(files.has('src/components/sections/commerce/ProductGrid.jsx'))
    assert.ok(files.has('src/lib/shop/ShopTheme.jsx'))
    const app = files.get('src/App.jsx').toString('utf8')
    assert.match(
      app,
      /theme="nocturne"/,
      'el shop del ZIP debe heredar el color del vecino',
    )
    assert.deepEqual(brokenImports(files), [])
    assertDepsCoverImports(files)

    const pkg = JSON.parse(files.get('package.json').toString('utf8'))
    assert.ok(pkg.dependencies['react-router-dom'], 'el kit de shop usa rutas')
    assert.ok(pkg.dependencies.zustand, 'el carrito usa zustand')
  })

  it('no arrastra three cuando la receta no lo usa', async () => {
    const files = await pack('custom-light', (destPath) =>
      packCustomTemplate({
        recipe: ['chapters/HeroKinetic', 'chapters/QuoteBreak'],
        destPath,
        licenseMeta: LICENSE,
      }),
    )
    const pkg = JSON.parse(files.get('package.json').toString('utf8'))
    assert.ok(!pkg.dependencies.three, 'three sobra en una composición 2D')
  })
})
