import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import { BUNDLE_MODELS } from '../catalog.js'
import {
  extractInvisibleMark,
  licenseFingerprint,
  packBundleTemplate,
  packCustomTemplate,
  packFixedTemplate,
  packOrderTemplate,
} from '../packaging.js'
import { purchaseCode } from '../license.js'
import { validateRecipe } from '../validation.js'
import { MODEL_WRAPPER_CLASS } from '../../src/lib/modelWrappers.js'
import { brokenImports, readZip } from './helpers/zip.js'
import { assertDepsCoverImports, assertRunnableProject, missingPublicAssets } from './helpers/zipProject.js'

/**
 * Lo que se vende es el ZIP, no el repo. Estos tests lo empaquetan de verdad,
 * lo abren y comprueban que sea un proyecto que arranca: que estén los
 * archivos de arranque y que ningún import relativo apunte a un archivo que
 * quedó afuera. Un ZIP roto no lo detecta ningún test del repo.
 */

const LICENSE = {
  orderId: 'test-order',
  email: 'buyer@test.com',
  purchaseCode: 'SL-TEST-0000-0001',
}

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
      assert.match(
        files.get('LICENSE.txt').toString('utf8'),
        /SL-TEST-0000-0001/,
        'la licencia no muestra el código de compra',
      )
      assert.deepEqual(brokenImports(files), [])

      for (const name of files.keys()) {
        assert.ok(
          !name.includes('src/lib/beat/'),
          `${model} no debe empaquetar el motor Beat: ${name}`,
        )
      }

      const app = files.get('src/App.jsx').toString('utf8')
      assert.match(app, /export default function App/)
      // Fingerprint embebido: una copia sin LICENSE.txt sigue siendo trazable.
      assert.match(app, /SCROLLLAB-LICENSE test-order/, 'App.jsx sin marca de licencia')
      assert.match(app, /buyer@test\.com/, 'App.jsx sin el comprador embebido')
    })
  }

  it('el bundle trae un proyecto por modelo', async () => {
    const files = await pack('bundle', (destPath) =>
      packBundleTemplate({ models: BUNDLE_MODELS, destPath, licenseMeta: LICENSE }),
    )

    for (const model of BUNDLE_MODELS) {
      assertRunnableProject(files, `${model}/`)
      assertDepsCoverImports(files, `${model}/`)
      assert.match(
        files.get(`${model}/src/App.jsx`).toString('utf8'),
        /SCROLLLAB-LICENSE test-order/,
        `${model}/src/App.jsx sin marca de licencia`,
      )
    }
    assert.ok(files.has('LICENSE.txt'), 'el bundle no trae licencia en la raíz')
    assert.deepEqual(brokenImports(files), [])

    for (const name of files.keys()) {
      assert.ok(!name.includes('src/lib/beat/'), `bundle regala Beat: ${name}`)
    }
  })

  it('incluye el formulario de contacto que la página importa', async () => {
    const files = await pack('contact', (destPath) =>
      packFixedTemplate({ model: 'monolith', destPath, licenseMeta: LICENSE }),
    )
    assert.ok(files.has('src/components/sections/contact/ContactForm.jsx'))
  })
})

describe('ZIP de una orden', () => {
  // El carrito deja comprar varias cosas juntas. Antes el ZIP traía solo la
  // primera: quien compraba dos templates pagaba los dos y recibía uno.
  it('con varios ítems trae todos: una carpeta por proyecto y una licencia que los cubre', async () => {
    const recipe = ['chapters/HeroKinetic', 'atelier/FooterAtelier']
    const files = await pack('order-multi', (destPath) =>
      packOrderTemplate({
        items: [{ sku: 'chapters' }, { sku: 'nocturne' }, { sku: 'custom:x', recipe }],
        destPath,
        licenseMeta: LICENSE,
        bundleModels: BUNDLE_MODELS,
      }),
    )

    for (const prefix of ['chapters/', 'nocturne/', 'custom/']) {
      assertRunnableProject(files, prefix)
      assertDepsCoverImports(files, prefix)
      assert.match(
        files.get(`${prefix}src/App.jsx`).toString('utf8'),
        /SCROLLLAB-LICENSE test-order/,
        `${prefix}src/App.jsx sin marca de licencia`,
      )
    }
    assert.deepEqual(brokenImports(files), [])
    assert.match(files.get('custom/src/App.jsx').toString('utf8'), /HeroKinetic_chapters/)

    const license = files.get('LICENSE.txt').toString('utf8')
    for (const sku of ['chapters', 'nocturne', 'custom:chapters/HeroKinetic']) {
      assert.ok(license.includes(sku), `la licencia no cubre ${sku}`)
    }
    const readme = files.get('README.md').toString('utf8')
    for (const folder of ['chapters/', 'nocturne/', 'custom/']) {
      assert.ok(readme.includes(`\`${folder}\``), `el README no lista ${folder}`)
    }
    const atRoot = [...files.keys()].filter((name) => !name.includes('/'))
    assert.deepEqual(atRoot.sort(), ['LICENSE.txt', 'README.md'])
  })

  it('con un solo ítem es el ZIP de siempre: el proyecto en la raíz', async () => {
    const files = await pack('order-single', (destPath) =>
      packOrderTemplate({
        items: [{ sku: 'chapters' }],
        destPath,
        licenseMeta: LICENSE,
        bundleModels: BUNDLE_MODELS,
      }),
    )
    assertRunnableProject(files)
    assert.ok(!files.has('chapters/package.json'))
    assert.match(files.get('LICENSE.txt').toString('utf8'), /chapters/)
  })

  it('bundle + composición: cada modelo del bundle y la composición en su carpeta', async () => {
    const files = await pack('order-bundle-custom', (destPath) =>
      packOrderTemplate({
        items: [{ sku: 'bundle' }, { sku: 'custom:y', recipe: ['nocturne/SplitReveals'] }],
        destPath,
        licenseMeta: LICENSE,
        bundleModels: BUNDLE_MODELS,
      }),
    )
    for (const model of BUNDLE_MODELS) assertRunnableProject(files, `${model}/`)
    assertRunnableProject(files, 'custom/')
    assert.deepEqual(brokenImports(files), [])
  })
})

describe('purchase code', () => {
  it('es determinístico por orden y con formato SL-XXXX-XXXX-XXXX', () => {
    const a = purchaseCode('order-abc', 'secret-1')
    assert.equal(a, purchaseCode('order-abc', 'secret-1'), 'no es estable para la misma orden')
    assert.match(a, /^SL-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/, 'formato inesperado')
    assert.notEqual(a, purchaseCode('order-xyz', 'secret-1'), 'dos órdenes dan el mismo código')
    assert.doesNotMatch(a.slice(3), /[ILOU]/, 'usa letras ambiguas (I/L/O/U) en el cuerpo')
    assert.equal(purchaseCode('', 'secret-1'), null, 'sin orderId debería ser null')
  })
})

describe('fingerprint distribuido + invisible', () => {
  const EDGE = '⁠⁠'

  it('reparte la marca visible + invisible en varios archivos', async () => {
    const files = await pack('fp', (destPath) =>
      packFixedTemplate({ model: 'chapters', destPath, licenseMeta: LICENSE }),
    )

    const app = files.get('src/App.jsx').toString('utf8')
    const css = files.get('src/index.css').toString('utf8')
    const readme = files.get('README.md').toString('utf8')
    const carriers = [
      ['App.jsx', app],
      ['index.css', css],
      ['README.md', readme],
    ]

    // 1 · marca VISIBLE repartida: borrar el encabezado de App.jsx no borra la traza.
    for (const [name, body] of carriers) {
      assert.match(body, /SCROLLLAB-LICENSE test-order/, `${name} sin marca visible`)
    }

    // 2 · marca INVISIBLE recuperable e idéntica en los tres archivos.
    const expected = licenseFingerprint(LICENSE)
    assert.ok(expected, 'no se derivó el fingerprint')
    for (const [name, body] of carriers) {
      assert.equal(
        extractInvisibleMark(body),
        expected,
        `${name} sin marca invisible recuperable`,
      )
    }

    // 3 · el fingerprint es determinístico por orden y distinto para otra compra.
    assert.notEqual(expected, licenseFingerprint({ orderId: 'otra', email: 'x@y.com' }))

    // 4 · la marca invisible vive SÓLO dentro de comentarios (no rompe el build):
    //     en App.jsx cae dentro del bloque /** */ del encabezado.
    assert.ok(app.includes(EDGE), 'App.jsx sin marca invisible')
    assert.ok(
      app.indexOf(EDGE) < app.indexOf('*/'),
      'la marca invisible de App.jsx quedó fuera del comentario',
    )
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
    assert.match(app, /SCROLLLAB-LICENSE test-order/, 'App.jsx custom sin marca de licencia')
    assert.match(app, /buyer@test\.com/, 'App.jsx custom sin el comprador embebido')
  })

  it('trae solo las secciones elegidas y lo que importan, no la carpeta entera del modelo', async () => {
    // Antes: una sección de cada modelo se llevaba el modelo entero (casi el
    // bundle por el precio del builder).
    const files = await pack('custom-solo', (destPath) =>
      packCustomTemplate({ recipe: ['chapters/HeroKinetic', 'kin/Hero'], destPath, licenseMeta: LICENSE }),
    )
    const sections = [...files.keys()].filter((f) => f.startsWith('src/components/sections/')).sort()
    assert.ok(sections.includes('src/components/sections/chapters/HeroKinetic.jsx'))
    assert.ok(sections.includes('src/components/sections/kin/Hero.jsx'))
    assert.ok(sections.includes('src/components/sections/kin/barGlyphs.js'), 'lo que importa la sección')
    for (const notChosen of ['chapters/StackingCards.jsx', 'chapters/BigNumbers.jsx', 'kin/Collection.jsx', 'kin/Rooms.jsx']) {
      assert.ok(!sections.includes(`src/components/sections/${notChosen}`), `no tiene que traer ${notChosen}`)
    }
    assertRunnableProject(files)
    assertDepsCoverImports(files)
    assert.deepEqual(brokenImports(files), [])
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

  it('con tipografía global: la prende en <html>, suma la familia al <link> y lo dice en el README', async () => {
    const recipe = [
      { id: 'chapters/HeroKinetic', font: 'geist' },
      { id: 'chapters/FooterCTA', props: { ctaWord: 'Hola' }, font: 'geist' },
    ]
    const files = await pack('custom-font', (destPath) =>
      packCustomTemplate({ recipe, destPath, licenseMeta: LICENSE }),
    )
    const app = files.get('src/App.jsx').toString('utf8')
    assert.match(app, /setAttribute\('data-user-font', ''\)/)
    assert.match(app, /setProperty\('--user-font', "'Geist', ui-sans-serif/)
    // El módulo la prende antes de montar la app, y las props de la sección siguen.
    assert.ok(app.indexOf('data-user-font') < app.indexOf('export default function App'))
    assert.match(app, /ctaWord=\{"Hola"\}/)
    // Geist no venía en el <link> del ZIP: se suma.
    const html = files.get('index.html').toString('utf8')
    assert.match(html, /family=Geist:wght@100\.\.900&display=swap/)
    assert.match(files.get('README.md').toString('utf8'), /## Font[\s\S]*Geist/)
    // La regla que la aplica viaja en el CSS del ZIP.
    assert.match(files.get('src/index.css').toString('utf8'), /\[data-user-font\]/)
    assert.deepEqual(brokenImports(files), [])
  })

  it('con una tipografía que el <link> ya trae no lo toca; sin tipografía el App queda como siempre', async () => {
    const withArchivo = await pack('custom-font-archivo', (destPath) =>
      packCustomTemplate({
        recipe: [{ id: 'chapters/HeroKinetic', font: 'archivo' }],
        destPath,
        licenseMeta: LICENSE,
      }),
    )
    const html = withArchivo.get('index.html').toString('utf8')
    assert.equal(html.match(/family=Archivo/g)?.length, 1, 'Archivo ya estaba: no se repite')
    const plain = await pack('custom-font-none', (destPath) =>
      packCustomTemplate({ recipe: ['chapters/HeroKinetic'], destPath, licenseMeta: LICENSE }),
    )
    assert.doesNotMatch(plain.get('src/App.jsx').toString('utf8'), /data-user-font/)
    assert.doesNotMatch(plain.get('README.md').toString('utf8'), /## Font/)
  })

  it('una fuente que no está en la lista nunca llega al ZIP (la receta se limpia antes)', async () => {
    const clean = validateRecipe([{ id: 'chapters/HeroKinetic', font: "x'); alert(1)//" }], 30)
    assert.deepEqual(clean, [{ id: 'chapters/HeroKinetic' }])
    const files = await pack('custom-font-bad', (destPath) =>
      packCustomTemplate({ recipe: clean, destPath, licenseMeta: LICENSE }),
    )
    assert.doesNotMatch(files.get('src/App.jsx').toString('utf8'), /data-user-font|alert\(1\)/)
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
    // El catálogo que comparten grilla, ficha, carrito y checkout.
    assert.ok(files.has('src/lib/shop/ShopCatalog.jsx'))
    assert.ok(files.has('src/lib/shop/catalog.js'))
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

  // Las secciones de MERIDIAN piden los frames del hero, la galería y el mapa a
  // public/. El ZIP del builder no los copiaba: compilaba igual, pero el hero
  // rompía el canvas y las fotos salían rotas.
  it('trae los archivos de public/ que piden sus secciones', async () => {
    const recipe = ['meridian/Hero', 'meridian/GallerySlider', 'meridian/Location']
    const files = await pack('custom-public', (destPath) =>
      packCustomTemplate({ recipe, destPath, licenseMeta: LICENSE }),
    )
    assert.deepEqual(missingPublicAssets(files), [])
    assert.ok(files.has('public/meridian/hero/seq/0001.webp'), 'faltan los frames del hero')

    const order = await pack('order-custom-public', (destPath) =>
      packOrderTemplate({
        items: [{ sku: 'chapters' }, { sku: 'custom:m', recipe }],
        destPath,
        licenseMeta: LICENSE,
        bundleModels: BUNDLE_MODELS,
      }),
    )
    assert.deepEqual(missingPublicAssets(order, 'custom/'), [])
    assert.ok(order.has('custom/public/meridian/hero/seq/0001.webp'))
  })

  // Lo editado en una lista (links, stats, cards…) quedaba en la orden y se
  // veía en el preview, pero el App.jsx del ZIP salía con los de ejemplo.
  it('lleva al App.jsx lo editado en las listas, tal cual', async () => {
    const tricky = 'Say "hola" </div> {x} \\ `y` ${z} — ñ'
    const recipe = validateRecipe([
      {
        id: 'chapters/BigNumbers',
        props: { stats: [{ value: '42', suffix: '%', label: tricky }] },
      },
      {
        id: 'chapters/BigNumbers',
        props: { stats: [{ value: '7', label: 'Otra' }, { value: '9', label: 'Más' }] },
      },
      {
        id: 'chapters/FooterCTA',
        props: {
          ctaWord: 'Escribime',
          links: [{ label: 'Instagram', href: 'https://instagram.com/x' }],
        },
      },
    ])
    const files = await pack('custom-lists', (destPath) =>
      packCustomTemplate({ recipe, destPath, licenseMeta: LICENSE }),
    )
    const app = files.get('src/App.jsx').toString('utf8')
    const listProp = (component, prop, nth = 0) => {
      const tags = [...app.matchAll(new RegExp(`<${component}_chapters[^>]*/>`, 'g'))]
      const name = tags[nth]?.[0].match(new RegExp(`${prop}=\\{(\\w+)\\}`))?.[1]
      assert.ok(name, `${component} #${nth} no recibe ${prop}`)
      const literal = app.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n\\])`))?.[1]
      assert.ok(literal, `falta la constante ${name}`)
      return new Function(`return ${literal}`)()
    }
    assert.deepEqual(listProp('BigNumbers', 'stats', 0), recipe[0].props.stats)
    assert.deepEqual(listProp('BigNumbers', 'stats', 1), recipe[1].props.stats)
    assert.deepEqual(listProp('FooterCTA', 'links'), recipe[2].props.links)
    assert.match(app, /ctaWord=\{"Escribime"\}/)
  })

  // El fondo de cada sección salía de dos tablas (preview y ZIP) que se habían
  // despegado: UNITY y MERIDIAN bajaban con otro color que el aprobado.
  it('pinta cada sección con el mismo fondo que el preview', async () => {
    const files = await pack('custom-wrappers', (destPath) =>
      packCustomTemplate({
        recipe: ['unity/HeroTwin', 'meridian/Concept', 'atrium/ScopeSerif'],
        destPath,
        licenseMeta: LICENSE,
      }),
    )
    const app = files.get('src/App.jsx').toString('utf8')
    for (const model of ['unity', 'meridian', 'atrium']) {
      assert.ok(
        app.includes(`className="${MODEL_WRAPPER_CLASS[model]}"`),
        `${model} no usa el fondo del preview`,
      )
    }
  })

  // Los productos editados en el builder llegan a la grilla y a la tienda
  // (ficha, carrito, checkout) desde la misma constante.
  it('los productos editados van a la grilla y al catálogo de la tienda', async () => {
    const products = [
      { name: 'Mate', price: '15000', blurb: 'Calabaza', img: 'https://cdn.x/mate.jpg' },
      { name: 'Bombilla', price: '12,50' },
    ]
    const files = await pack('custom-products', (destPath) =>
      packCustomTemplate({
        recipe: validateRecipe([{ id: 'commerce/ProductGrid', props: { products } }]),
        destPath,
        licenseMeta: LICENSE,
      }),
    )
    const app = files.get('src/App.jsx').toString('utf8')
    assert.match(app, /<ProductGrid_commerce[^>]*products=\{productGridProducts\}/)
    assert.match(app, /<ShopCatalogProvider products=\{productGridProducts\}>/)
    assert.match(app, /name: "Bombilla", price: "12,50"/)
    assert.match(files.get('README.md').toString('utf8'), /`productGridProducts` in `src\/App\.jsx`/)
    assert.deepEqual(brokenImports(files), [])
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
