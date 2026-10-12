import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import { BUNDLE_MODELS, PRODUCTS } from '../catalog.js'
import { packCustomTemplate, packFixedTemplate } from '../packaging.js'
import { ALLOWED_SECTIONS } from '../sections.js'
import { validateRecipe } from '../validation.js'
import { BUILDER_HIDDEN_SKUS, COMING_SOON_SKUS } from '../../src/domain/catalog.js'
import { sectionModelOf } from '../../src/domain/sections.js'
import { brokenImports, readZip } from './helpers/zip.js'
import { assertDepsCoverImports, assertRunnableProject, missingPublicAssets } from './helpers/zipProject.js'

/**
 * Todo lo que se puede comprar baja como un proyecto que arranca, sin tener que
 * acordarse de sumarlo a mano a otro test:
 *
 *  - el ZIP de cada template a la venta (packaging.test.js cubre los 8 del
 *    bundle; acá entran los que se venden sueltos: ATRIUM, MERIDIAN, KIN, APEX,
 *    FOLD y el que venga);
 *  - cada sección del builder empaquetada SOLA (lo que se lleva quien elige
 *    una sola sección de un modelo) y todas las de cada modelo juntas.
 *
 * Una sección nueva o un template nuevo entran solos: salen de las tablas de
 * dominio. Lo que esto no mide (que compile con Vite y se vea) lo hace
 * `npm run check:visual`; el procedimiento completo está en
 * docs/testing-sections.md.
 */

const LICENSE = { orderId: 'test-order', email: 'buyer@test.com', purchaseCode: 'SL-TEST-0000-0002' }

let tmp
before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scrolllab-pack-every-'))
})
after(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
})

let n = 0
async function pack(run) {
  const dest = path.join(tmp, `${n++}.zip`)
  await run(dest)
  return readZip(fs.readFileSync(dest))
}

function assertDownloadable(files, what) {
  assertRunnableProject(files)
  assertDepsCoverImports(files)
  assert.deepEqual(brokenImports(files), [], `${what}: imports rotos`)
  assert.deepEqual(missingPublicAssets(files), [], `${what}: pide archivos de public/ que no viajaron`)
  assert.match(files.get('LICENSE.txt')?.toString('utf8') || '', /buyer@test\.com/, `${what}: sin licencia`)
}

/** Lo que el builder deja elegir: lo permitido, sin los modelos ocultos. */
const BUILDER_SECTIONS = ALLOWED_SECTIONS.filter((id) => !BUILDER_HIDDEN_SKUS.includes(sectionModelOf(id)))
const BY_MODEL = new Map()
for (const id of BUILDER_SECTIONS) {
  const model = sectionModelOf(id)
  BY_MODEL.set(model, [...(BY_MODEL.get(model) || []), id])
}

const SOLD_ALONE = Object.keys(PRODUCTS).filter(
  (sku) => !['bundle', 'custom'].includes(sku) && !BUNDLE_MODELS.includes(sku) && !COMING_SOON_SKUS.includes(sku),
)

describe('ZIP de cada template que se vende suelto', () => {
  it('hay alguno (la lista sale del catálogo)', () => {
    assert.ok(SOLD_ALONE.includes('apex'), `SOLD_ALONE: ${SOLD_ALONE.join(', ')}`)
  })
  for (const model of SOLD_ALONE) {
    it(`${model}: proyecto completo, sin imports rotos ni archivos faltantes`, async () => {
      const files = await pack((destPath) => packFixedTemplate({ model, destPath, licenseMeta: LICENSE }))
      assertDownloadable(files, model)
    })
  }
})

describe('ZIP del builder: cada sección', () => {
  for (const [model, ids] of BY_MODEL) {
    it(`${model}: todas sus secciones juntas`, async () => {
      const recipe = validateRecipe(ids)
      const files = await pack((destPath) => packCustomTemplate({ recipe, destPath, licenseMeta: LICENSE }))
      assertDownloadable(files, `${model} (todas)`)
      const app = files.get('src/App.jsx').toString('utf8')
      for (const id of ids) {
        const name = id.split('/')[1]
        assert.match(app, new RegExp(`\\b${name}\\b`), `App.jsx no renderiza ${id}`)
        assert.ok(files.has(`src/components/sections/${id}.jsx`), `falta el archivo de ${id}`)
      }
    })

    for (const id of ids) {
      it(`${id} sola`, async () => {
        const files = await pack((destPath) =>
          packCustomTemplate({ recipe: validateRecipe([id]), destPath, licenseMeta: LICENSE }),
        )
        assertDownloadable(files, id)
        assert.ok(files.has(`src/components/sections/${id}.jsx`), `falta el archivo de ${id}`)
      })
    }
  }
})
