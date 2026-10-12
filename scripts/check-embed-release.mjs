/**
 * check:embed-release — ¿hay que publicar @scrolllab/embed en npm?
 *
 * Compara packages/embed (lo que se publicaría) con lo que hay en el registro:
 *  - `publish`        la versión del repo todavía no está en npm → hay que publicarla
 *  - `needs-bump`     la versión ya está en npm pero el contenido cambió → subir la versión
 *  - `up-to-date`     coincide con lo publicado
 *  - `version-behind` la versión del repo es menor o igual que la última publicada
 *
 * No publica nada ni necesita credenciales (solo lee el registro público). La
 * publicación la hace una persona, con su cuenta y su verificación en dos pasos;
 * este chequeo corre en el CI (.github/workflows/embed-release.yml) y abre un
 * aviso. Ver docs/embed-release.md.
 *
 * Uso: node scripts/check-embed-release.mjs [--json] [--dir=packages/embed]
 * Exit: 0 con cualquier estado; 2 si no pudo comparar (sin red, registro caído).
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  classify,
  comparablePackageJson,
  diffFiles,
  readTgz,
  sha256,
} from './lib/embed-release.mjs'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const asJson = args.includes('--json')
const dirArg = args.find((a) => a.startsWith('--dir='))?.slice('--dir='.length)
const PKG_DIR = path.resolve(REPO, dirArg || path.join('packages', 'embed'))

const REGISTRY = 'https://registry.npmjs.org'
const UA = { 'User-Agent': 'scrolllab-embed-release-check' }

async function getJson(url) {
  const r = await fetch(url, { headers: { ...UA, Accept: 'application/json' } })
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`${r.status} al pedir ${url}`)
  return r.json()
}

async function getBuffer(url) {
  const r = await fetch(url, { headers: UA })
  if (!r.ok) throw new Error(`${r.status} al bajar ${url}`)
  return Buffer.from(await r.arrayBuffer())
}

/** Los archivos que `npm publish` subiría, tal cual los calcula npm (files + README + LICENSE). */
function packedFiles() {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--silent'], {
    cwd: PKG_DIR,
    encoding: 'utf8',
    shell: true,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const start = out.indexOf('[')
  const info = JSON.parse(out.slice(start))
  return info[0].files.map((f) => f.path)
}

function localMap(paths) {
  const m = new Map()
  for (const p of paths) {
    if (p === 'package.json') continue
    m.set(p, sha256(fs.readFileSync(path.join(PKG_DIR, p))))
  }
  return m
}

function remoteMap(tgzFiles) {
  const m = new Map()
  for (const [p, buf] of tgzFiles) {
    if (p === 'package.json') continue
    m.set(p, sha256(buf))
  }
  return m
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(PKG_DIR, 'package.json'), 'utf8'))
  const packument = await getJson(`${REGISTRY}/${pkg.name.replace('/', '%2f')}`)
  const publishedVersions = packument ? Object.keys(packument.versions || {}) : []
  const latest = packument?.['dist-tags']?.latest || null

  const paths = packedFiles()
  const local = localMap(paths)

  // Se compara contra la versión del repo si ya está publicada y, si no, contra
  // la última (solo para contar qué cambió: el estado lo decide la versión).
  const compareWith = publishedVersions.includes(pkg.version) ? pkg.version : latest
  let diff = { changed: [], added: [], removed: [] }
  if (compareWith) {
    const tarball = packument.versions[compareWith].dist.tarball
    const remoteFiles = readTgz(await getBuffer(tarball))
    diff = diffFiles(local, remoteMap(remoteFiles))
    const remotePkg = remoteFiles.get('package.json')
    if (
      remotePkg &&
      comparablePackageJson(JSON.parse(remotePkg.toString('utf8'))) !== comparablePackageJson(pkg)
    ) {
      diff.changed.push('package.json')
      diff.changed.sort()
    }
  }

  const verdict = classify({ localVersion: pkg.version, publishedVersions, latest, diff })
  return {
    ...verdict,
    name: pkg.name,
    localVersion: pkg.version,
    latest,
    comparedWith: compareWith,
    diff,
    files: paths.length,
  }
}

main().then(
  (r) => {
    if (asJson) {
      console.log(JSON.stringify(r, null, 2))
    } else {
      const icon = { publish: '⬆', 'needs-bump': '✎', 'up-to-date': '✓', 'version-behind': '⚠' }[r.status]
      console.log(`${icon} ${r.name}@${r.localVersion}  [${r.status}]`)
      console.log(r.reason)
      const { changed, added, removed } = r.diff
      for (const [label, list] of [['cambiados', changed], ['nuevos', added], ['sacados', removed]]) {
        if (list.length) console.log(`  ${label} frente a ${r.comparedWith}: ${list.join(', ')}`)
      }
    }
    process.exit(0)
  },
  (err) => {
    console.error(`No pude comparar con npm: ${err?.message || err}`)
    process.exit(2)
  },
)
