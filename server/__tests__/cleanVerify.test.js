import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  applyOverlay,
  cleanVerify,
  copyEnv,
  failureExcerpt,
  normalizePaths,
  removeCopy,
} from '../../scripts/lib/clean-verify.mjs'

/**
 * scripts/lib/clean-verify.mjs: `verify` en una copia limpia de HEAD con solo
 * los archivos que se pidan encima. Lo usan qa:sweep y los agentes de QA para
 * no verificar (ni «arreglar») el trabajo a medias de otra sesión.
 */
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const THIS_FILE = 'server/__tests__/cleanVerify.test.js'

describe('normalizePaths', () => {
  it('deja rutas relativas con «/», sin repetir, y acepta absolutas dentro del repo', () => {
    const out = normalizePaths(
      ['server\\app.js', './server/app.js', path.join(REPO, 'src', 'domain', 'catalog.js'), 'docs/x.md'],
      REPO,
    )
    assert.deepEqual(out, ['server/app.js', 'src/domain/catalog.js', 'docs/x.md'])
  })

  it('rechaza lo que sale del repo y lo que no se puede pisar', () => {
    for (const bad of ['../fuera.js', 'node_modules/x.js', 'storage/y.js', '.git/config', '', '   ']) {
      assert.throws(() => normalizePaths([bad], REPO), undefined, bad)
    }
    assert.throws(() => normalizePaths([path.resolve(REPO, '..', 'otro.js')], REPO))
  })

  it('sin rutas devuelve una lista vacía (verifica HEAD tal cual)', () => {
    assert.deepEqual(normalizePaths([], REPO), [])
    assert.deepEqual(normalizePaths(undefined, REPO), [])
  })
})

describe('applyOverlay', () => {
  let repo
  let dir

  before(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-cv-repo-'))
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-cv-copy-'))
    fs.mkdirSync(path.join(repo, 'a', 'b'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'a', 'b', 'nuevo.js'), 'nuevo')
    fs.writeFileSync(path.join(repo, 'a', 'cambiado.js'), 'versión del árbol')
    fs.mkdirSync(path.join(repo, 'carpeta'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'carpeta', 'uno.txt'), '1')
    fs.writeFileSync(path.join(repo, 'carpeta', 'dos.txt'), '2')
    // La copia tiene la versión de HEAD y un archivo que el árbol ya borró.
    fs.mkdirSync(path.join(dir, 'a'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'a', 'cambiado.js'), 'versión de HEAD')
    fs.writeFileSync(path.join(dir, 'a', 'borrado.js'), 'existía')
    fs.writeFileSync(path.join(dir, 'a', 'intacto.js'), 'no se toca')
  })

  after(() => {
    fs.rmSync(repo, { recursive: true, force: true })
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('copia lo que existe, crea las carpetas y borra lo que el árbol ya no tiene', () => {
    const out = applyOverlay({
      repo,
      dir,
      paths: ['a/b/nuevo.js', 'a/cambiado.js', 'a/borrado.js', 'carpeta'],
    })
    assert.deepEqual(out.copied.sort(), ['a/b/nuevo.js', 'a/cambiado.js', 'carpeta'])
    assert.deepEqual(out.deleted, ['a/borrado.js'])
    assert.equal(fs.readFileSync(path.join(dir, 'a', 'b', 'nuevo.js'), 'utf8'), 'nuevo')
    assert.equal(fs.readFileSync(path.join(dir, 'a', 'cambiado.js'), 'utf8'), 'versión del árbol')
    assert.equal(fs.existsSync(path.join(dir, 'a', 'borrado.js')), false)
    assert.equal(fs.readFileSync(path.join(dir, 'carpeta', 'dos.txt'), 'utf8'), '2')
  })

  it('lo que no se pidió queda como estaba en HEAD', () => {
    assert.equal(fs.readFileSync(path.join(dir, 'a', 'intacto.js'), 'utf8'), 'no se toca')
  })

  it('no escribe fuera de la copia', () => {
    assert.throws(() => applyOverlay({ repo, dir, paths: ['../escapa.js'] }), /sale de la copia/)
  })
})

describe('copyEnv', () => {
  it('cada copia tiene su propia caché de Vite, dentro de la copia (se borra con ella)', () => {
    const a = path.join(REPO, 'storage', 'clean-verify', 'copia-a')
    const b = path.join(REPO, 'storage', 'clean-verify', 'copia-b')
    const envA = copyEnv(a)
    assert.equal(envA.VITE_CACHE_DIR, path.join(a, 'storage', '.vite-cache'))
    assert.ok(envA.VITE_CACHE_DIR.startsWith(a + path.sep), 'adentro de la copia')
    assert.notEqual(envA.VITE_CACHE_DIR, copyEnv(b).VITE_CACHE_DIR)
    // Nunca la caché del repo real (la que comparte el junction de node_modules).
    assert.ok(!envA.VITE_CACHE_DIR.includes(path.join('node_modules', '.vite')))
  })
})

describe('failureExcerpt', () => {
  it('muestra el archivo y el error, no las advertencias que lo tapan', () => {
    const warnings = Array.from(
      { length: 40 },
      (_, i) => `  ${i + 1}:1  warning  Fast refresh only works when a file only exports components`,
    )
    const log = [
      'src/a.jsx',
      ...warnings,
      'server/roto.js',
      '  1:7  error  Parsing error: Unexpected token =',
      'src/z.jsx',
      ...warnings,
      '✖ 81 problems (1 error, 80 warnings)',
    ].join('\n')
    const out = failureExcerpt(log, { tail: 2 })
    const head = out.split('\n…\n')[0].split('\n')
    assert.deepEqual(head.slice(0, 2), ['server/roto.js', '  1:7  error  Parsing error: Unexpected token ='])
    // El resumen «80 warnings» puede estar; las advertencias línea por línea, no.
    assert.ok(!head.some((l) => /\bwarning\b/.test(l)), 'sin advertencias en la parte de errores')
    assert.ok(out.includes('✖ 81 problems'))
  })

  it('un test roto no queda tapado por el console.error esperado de los demás', () => {
    const noise = Array.from({ length: 50 }, (_, i) => `# MP payment fetch failed payment=pre${i} error=fake`)
    const log = [...noise, '    not ok 7 - el pago rechazado avisa una vez', ...noise].join('\n')
    const head = failureExcerpt(log).split('\n…\n')[0]
    assert.match(head, /not ok 7 - el pago rechazado avisa una vez/)
    assert.ok(!head.includes('MP payment fetch failed'), 'el ruido no entra mientras haya algo inequívoco')
  })

  it('encuentra errores de tipos y tests rotos', () => {
    const log = 'bla\nserver/x.js(3,1): error TS2322: Type mismatch\nok 1 - bien\nnot ok 2 - mal\nfin'
    const head = failureExcerpt(log).split('\n…\n')[0]
    assert.match(head, /TS2322/)
    assert.match(head, /not ok 2 - mal/)
  })
})

// Una copia de `git archive` no tiene .git: ahí no hay HEAD para archivar.
// (En el CI y en el árbol de trabajo sí.)
const NO_GIT = fs.existsSync(path.join(REPO, '.git')) ? false : 'sin .git (copia de git archive)'

describe('cleanVerify', () => {
  it('arma la copia con HEAD + lo pedido, corre los pasos y la borra sin tocar node_modules', { skip: NO_GIT }, async () => {
    const out = await cleanVerify({ paths: [THIS_FILE], steps: ['check'], keep: true })
    try {
      assert.equal(out.ok, true, JSON.stringify(out.results.map((r) => [r.step, r.ok])))
      assert.deepEqual(out.results.map((r) => r.step), ['check'])
      assert.match(out.head, /^[0-9a-f]{7,}$/)
      assert.deepEqual(out.overlay.copied, [THIS_FILE])
      // El archivo del árbol (todavía sin commitear, quizá) está en la copia.
      assert.ok(fs.existsSync(path.join(out.dir, THIS_FILE)))
      // El árbol real no se tocó: la copia vive aparte.
      assert.notEqual(path.resolve(out.dir), REPO)
      assert.ok(out.dir.startsWith(path.join(REPO, 'storage', 'clean-verify')))
    } finally {
      removeCopy(out.dir, REPO)
    }
    assert.equal(fs.existsSync(out.dir), false, 'la copia se borró')
    assert.ok(fs.existsSync(path.join(REPO, 'node_modules')), 'el node_modules del repo sigue ahí')
  })

  it('sin keep borra la copia al terminar', { skip: NO_GIT }, async () => {
    const out = await cleanVerify({ steps: ['check'] })
    assert.equal(out.ok, true)
    assert.equal(out.kept, false)
    assert.equal(fs.existsSync(out.dir), false)
    assert.ok(fs.existsSync(path.join(REPO, 'node_modules')))
  })

  it('rechaza un paso desconocido y una ruta prohibida antes de armar nada', async () => {
    await assert.rejects(cleanVerify({ steps: ['build'] }), /Paso desconocido/)
    await assert.rejects(cleanVerify({ paths: ['node_modules/x.js'], steps: ['check'] }), /no permitida/)
  })
})
