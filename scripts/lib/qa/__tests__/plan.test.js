import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  MAX_FIX_ATTEMPTS,
  findingId,
  fixQueue,
  modelsToCheck,
  nextInRotation,
  normalizeDetail,
  parseFailures,
  reconcile,
  recordAttempt,
} from '../plan.js'

const MODELS = ['chapters', 'apex', 'kin', 'meridian']

describe('modelsToCheck', () => {
  it('una sección, sus campos, su página y su public/ apuntan a su modelo', () => {
    assert.deepEqual(
      modelsToCheck(
        [
          'src/components/sections/apex/Hero.jsx',
          'src/domain/sectionFields/fields/kin.js',
          'src/pages/MeridianPage.jsx',
          'public/apex/hero.mp4',
          'docs/algo.md',
        ],
        MODELS,
      ),
      { all: false, models: ['apex', 'kin', 'meridian'] },
    )
  })
  it('un archivo compartido (motor, embed, empaquetador, las pruebas) prueba todo', () => {
    for (const f of ['src/lib/motion.js', 'embed/frame/main.jsx', 'server/packaging.js', 'scripts/check-mobile.mjs']) {
      assert.equal(modelsToCheck([f], MODELS).all, true, f)
    }
  })
  it('con algo compartido igual dice qué modelos cambiaron (esos van enteros)', () => {
    assert.deepEqual(modelsToCheck(['src/lib/motion.js', 'src/components/sections/kin/Press.jsx'], MODELS), {
      all: true,
      models: ['kin'],
    })
    assert.deepEqual(modelsToCheck(['src/lib/motion.js'], MODELS), { all: true, models: [] })
  })
  it('sin cambios en secciones, nada; un modelo que no existe no cuenta', () => {
    assert.deepEqual(modelsToCheck(['README.md', 'src/components/sections/plum/X.jsx'], MODELS), { all: false, models: [] })
  })
  it('rutas de Windows', () => {
    assert.deepEqual(modelsToCheck(['src\\components\\sections\\kin\\Press.jsx'], MODELS).models, ['kin'])
  })
})

describe('rotación', () => {
  it('sigue la lista y vuelve al principio', () => {
    assert.equal(nextInRotation(MODELS, null), 'chapters')
    assert.equal(nextInRotation(MODELS, 'apex'), 'kin')
    assert.equal(nextInRotation(MODELS, 'meridian'), 'chapters')
  })
})

describe('id estable', () => {
  it('la misma falla con otras medidas es el mismo hallazgo', () => {
    const a = findingId('apex', 'mobile', '[Hero] clipped 34px en alto @320')
    const b = findingId('apex', 'mobile', '[Hero] clipped 77px en alto @1280')
    assert.equal(a, b)
    assert.notEqual(a, findingId('apex', 'mobile', '[Story] clipped 34px en alto @320'))
    assert.notEqual(a, findingId('kin', 'mobile', '[Hero] clipped 34px en alto @320'))
  })
  it('saca URLs, hashes y números', () => {
    assert.equal(normalizeDetail('GET http://localhost:5173/x 500 a1b2c3d4e5f6 en 12.5 s'), 'get URL # H en # s')
  })
})

describe('parseFailures', () => {
  it('toma las líneas ✗ / ✖ / «- » y no el resumen', () => {
    const log = [
      'Revisando…',
      '  ✗ [Hero] text<11 10px <a> «LINK» @1280 (normal)',
      '✖ 2 problema(s):',
      '  - apex/Story: la vista previa no muestra "Rótulo" editado',
      '  - apex/Story: la vista previa no muestra "Rótulo" editado',
    ].join('\n')
    assert.deepEqual(parseFailures(log), [
      '[Hero] text<11 10px <a> «LINK» @1280 (normal)',
      'apex/Story: la vista previa no muestra "Rótulo" editado',
    ])
  })
  it('el «Call log:» de Playwright no cuenta como hallazgos', () => {
    const log = [
      '  ✗ [(página)] error falló la auditoría: TimeoutError: page.screenshot: Timeout 60000ms exceeded.',
      '    Call log:',
      '      - taking page screenshot',
      '      - waiting for fonts to load...',
      '      - fonts loaded',
      '  ✗ [Hero] text<11 10px',
    ].join('\n')
    assert.deepEqual(parseFailures(log), [
      '[(página)] error falló la auditoría: TimeoutError: page.screenshot: Timeout 60000ms exceeded.',
      '[Hero] text<11 10px',
    ])
  })
  it('un aviso de Vite no es un hallazgo; el motivo de una prueba de node --test que falló, sí', () => {
    const log = [
      '(!) Some chunks are larger than 500 kB after minification. Consider:',
      '- Using dynamic import() to code-split the application',
      '- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.',
      '✓ built in 2.00s',
      '    not ok 299 - kin/Intro — tablet 768px: sin overflow y visible',
      "      error: 'kin/Intro @tablet: el alto no converge (1973px → 1990px)'",
      'not ok 1 - embed e2e — todas las HOSTABLE_SECTIONS',
      "  error: '2 subtests failed'",
      '(exit 1)',
    ].join('\n')
    assert.deepEqual(parseFailures(log), ['kin/Intro @tablet: el alto no converge (1973px → 1990px)'])
  })
  it('sin líneas de error, el final de la salida', () => {
    assert.match(parseFailures('a\nb\nError: boom')[0], /Error: boom/)
  })
})

describe('reconcile', () => {
  const now = '2026-10-12T03:00:00.000Z'
  const later = '2026-10-13T03:00:00.000Z'
  const f = { model: 'apex', step: 'mobile', detail: '[Hero] clipped 34px' }

  it('abre lo nuevo, suma lo repetido y cierra lo que ya no aparece en un paso que corrió', () => {
    const one = reconcile({}, [f], [{ model: 'apex', step: 'mobile' }], now)
    const id = Object.keys(one)[0]
    assert.equal(one[id].status, 'open')
    const two = reconcile(one, [{ ...f, detail: '[Hero] clipped 40px' }], [{ model: 'apex', step: 'mobile' }], later)
    assert.equal(two[id].timesSeen, 2)
    assert.equal(two[id].firstSeen, now)
    const three = reconcile(two, [], [{ model: 'apex', step: 'mobile' }], later)
    assert.equal(three[id].status, 'fixed')
  })
  it('no lo cierra si ese paso no corrió (otro modelo, otro paso)', () => {
    const one = reconcile({}, [f], [{ model: 'apex', step: 'mobile' }], now)
    const id = Object.keys(one)[0]
    assert.equal(reconcile(one, [], [{ model: 'kin', step: 'mobile' }], later)[id].status, 'open')
    assert.equal(reconcile(one, [], [{ model: 'apex', step: 'parity' }], later)[id].status, 'open')
  })
  it('un arreglado que vuelve a aparecer se reabre y lo dice', () => {
    const one = reconcile({}, [f], [{ model: 'apex', step: 'mobile' }], now)
    const fixed = reconcile(one, [], [{ model: 'apex', step: 'mobile' }], now)
    const back = reconcile(fixed, [f], [{ model: 'apex', step: 'mobile' }], later)
    const id = Object.keys(back)[0]
    assert.equal(back[id].status, 'open')
    assert.equal(back[id].reopened, later)
  })
  it('no toca el registro que recibe', () => {
    const ledger = reconcile({}, [f], [], now)
    const copy = structuredClone(ledger)
    reconcile(ledger, [], [{ model: 'apex', step: 'mobile' }], later)
    assert.deepEqual(ledger, copy)
  })
})

describe('fixer', () => {
  const now = '2026-10-12T03:00:00.000Z'
  it(`al intento ${MAX_FIX_ATTEMPTS} sin arreglo pasa a una persona; uno que alcanza lo cierra`, () => {
    let ledger = reconcile({}, [{ model: 'kin', step: 'mobile', detail: 'x' }], [], now)
    const id = Object.keys(ledger)[0]
    ledger = recordAttempt(ledger, id, { ok: false, note: 'no', now })
    assert.equal(ledger[id].status, 'open')
    ledger = recordAttempt(ledger, id, { ok: false, note: 'tampoco', now })
    assert.equal(ledger[id].status, 'needs-person')
    assert.deepEqual(fixQueue(ledger), [])
    const other = reconcile({}, [{ model: 'kin', step: 'mobile', detail: 'y' }], [], now)
    const oid = Object.keys(other)[0]
    assert.equal(recordAttempt(other, oid, { ok: true, note: 'listo', now })[oid].status, 'fixed')
  })
  it('la cola respeta el tope y empieza por lo que más se repite', () => {
    let ledger = {}
    for (const d of ['a', 'b', 'c']) ledger = reconcile(ledger, [{ model: 'kin', step: 'mobile', detail: d }], [], now)
    ledger = reconcile(ledger, [{ model: 'kin', step: 'mobile', detail: 'c' }], [], now)
    const q = fixQueue(ledger, 2)
    assert.equal(q.length, 2)
    assert.equal(q[0].detail, 'c')
  })
})
