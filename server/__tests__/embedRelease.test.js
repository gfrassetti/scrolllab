import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import zlib from 'node:zlib'

import {
  classify,
  compareVersions,
  comparablePackageJson,
  diffFiles,
  parseVersion,
  readTgz,
  sha256,
} from '../../scripts/lib/embed-release.mjs'

/**
 * La lógica de «¿hay que publicar @scrolllab/embed?» (scripts/check-embed-
 * release.mjs, .github/workflows/embed-release.yml). Pura: sin red ni disco.
 */

describe('versiones', () => {
  it('parsea x.y.z con pre-release y rechaza lo que no es una versión', () => {
    assert.deepEqual(parseVersion('0.2.0'), { major: 0, minor: 2, patch: 0, pre: '' })
    assert.equal(parseVersion('1.0.0-beta.1').pre, 'beta.1')
    for (const bad of ['', '1', '1.2', 'v1.2.3', '1.2.x', 'latest']) assert.equal(parseVersion(bad), null, bad)
  })

  it('compara por número, no por texto', () => {
    assert.equal(compareVersions('0.2.0', '0.10.0'), -1)
    assert.equal(compareVersions('1.0.0', '0.99.99'), 1)
    assert.equal(compareVersions('0.2.1', '0.2.1'), 0)
    assert.equal(compareVersions('0.3.0-beta.1', '0.3.0'), -1, 'una beta es menor que la estable')
    assert.throws(() => compareVersions('x', '1.0.0'))
  })
})

describe('classify', () => {
  const none = { changed: [], added: [], removed: [] }

  it('versión que npm no tiene y mayor que la última → publish', () => {
    const r = classify({ localVersion: '0.2.1', publishedVersions: ['0.1.0', '0.2.0'], latest: '0.2.0' })
    assert.equal(r.status, 'publish')
    assert.match(r.reason, /0\.2\.1/)
  })

  it('un paquete que nunca se publicó → publish', () => {
    assert.equal(classify({ localVersion: '0.1.0', publishedVersions: [], latest: null }).status, 'publish')
  })

  it('la misma versión con contenido distinto → needs-bump (npm no deja repetirla)', () => {
    const r = classify({
      localVersion: '0.2.0',
      publishedVersions: ['0.1.0', '0.2.0'],
      latest: '0.2.0',
      diff: { changed: ['react.js'], added: [], removed: [] },
    })
    assert.equal(r.status, 'needs-bump')
    assert.match(r.reason, /subir la versión/)
  })

  it('un archivo nuevo o sacado también cuenta como cambio', () => {
    for (const diff of [
      { changed: [], added: ['index.d.ts'], removed: [] },
      { changed: [], added: [], removed: ['vue.d.ts'] },
    ]) {
      assert.equal(
        classify({ localVersion: '0.2.0', publishedVersions: ['0.2.0'], latest: '0.2.0', diff }).status,
        'needs-bump',
      )
    }
  })

  it('igual a lo publicado → up-to-date', () => {
    const r = classify({ localVersion: '0.2.0', publishedVersions: ['0.2.0'], latest: '0.2.0', diff: none })
    assert.equal(r.status, 'up-to-date')
  })

  it('una versión que npm no tiene pero es menor que la última → version-behind', () => {
    const r = classify({ localVersion: '0.1.5', publishedVersions: ['0.1.0', '0.2.0'], latest: '0.2.0' })
    assert.equal(r.status, 'version-behind')
  })

  it('una versión inválida corta con un error claro', () => {
    assert.throws(() => classify({ localVersion: 'abc', publishedVersions: [], latest: null }), /no es válida/)
  })
})

describe('comparación de contenido', () => {
  it('diffFiles distingue cambiados, nuevos y sacados', () => {
    const local = new Map([
      ['a.js', '1'],
      ['b.js', '2'],
      ['nuevo.js', '3'],
    ])
    const remote = new Map([
      ['a.js', '1'],
      ['b.js', 'OTRO'],
      ['viejo.js', '4'],
    ])
    assert.deepEqual(diffFiles(local, remote), { changed: ['b.js'], added: ['nuevo.js'], removed: ['viejo.js'] })
  })

  it('el hash ignora CRLF: se publica desde Windows y se chequea en Linux', () => {
    assert.equal(sha256(Buffer.from('a\r\nb\r\n')), sha256(Buffer.from('a\nb\n')))
    assert.notEqual(sha256(Buffer.from('a\nb\n')), sha256(Buffer.from('a\nc\n')))
  })

  it('comparablePackageJson ignora lo que npm normaliza al publicar', () => {
    const base = { name: '@x/y', version: '1.0.0', files: ['a.js'], exports: { '.': './a.js' } }
    const published = { ...base, scripts: {}, _id: '@x/y@1.0.0', gitHead: 'abc', homepage: 'https://x' }
    assert.equal(comparablePackageJson(published), comparablePackageJson(base))
  })

  it('comparablePackageJson sí ve un cambio de exports, versión o archivos', () => {
    const base = { name: '@x/y', version: '1.0.0', files: ['a.js'], exports: { '.': './a.js' } }
    for (const change of [{ version: '1.0.1' }, { files: ['a.js', 'b.js'] }, { exports: { '.': './b.js' } }]) {
      assert.notEqual(comparablePackageJson({ ...base, ...change }), comparablePackageJson(base))
    }
  })

  it('comparablePackageJson no depende del orden de las claves', () => {
    const a = { name: 'n', version: '1.0.0', exports: { '.': { types: 't.d.ts', default: 'a.js' } } }
    const b = { exports: { '.': { default: 'a.js', types: 't.d.ts' } }, version: '1.0.0', name: 'n' }
    assert.equal(comparablePackageJson(a), comparablePackageJson(b))
  })
})

/** Un tar mínimo (ustar) con archivos regulares, como el que arma npm. */
function tar(entries) {
  const blocks = []
  for (const [name, content] of entries) {
    const body = Buffer.from(content)
    const header = Buffer.alloc(512)
    header.write(name, 0, 'utf8')
    header.write('0000644\0', 100)
    header.write('0000000\0', 108)
    header.write('0000000\0', 116)
    header.write(`${body.length.toString(8).padStart(11, '0')}\0`, 124)
    header.write('00000000000\0', 136)
    header.write('        ', 148)
    header.write('0', 156)
    header.write('ustar\0', 257)
    header.write('00', 263)
    let sum = 0
    for (const b of header) sum += b
    header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148)
    blocks.push(header, body, Buffer.alloc((512 - (body.length % 512)) % 512))
  }
  blocks.push(Buffer.alloc(1024))
  return Buffer.concat(blocks)
}

describe('readTgz', () => {
  it('lee los archivos de un .tgz de npm y saca el prefijo package/', () => {
    const tgz = zlib.gzipSync(
      tar([
        ['package/package.json', '{"name":"@x/y"}'],
        ['package/react.js', 'export default 1\n'],
        ['package/README.md', 'x'.repeat(700)],
      ]),
    )
    const files = readTgz(tgz)
    assert.deepEqual([...files.keys()].sort(), ['README.md', 'package.json', 'react.js'])
    assert.equal(files.get('react.js').toString(), 'export default 1\n')
    assert.equal(files.get('README.md').length, 700, 'un archivo de más de un bloque entra entero')
    assert.equal(JSON.parse(files.get('package.json').toString()).name, '@x/y')
  })

  it('un .tgz vacío da un mapa vacío', () => {
    assert.equal(readTgz(zlib.gzipSync(Buffer.alloc(1024))).size, 0)
  })
})
