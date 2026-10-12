/**
 * Las comprobaciones de «el ZIP es un proyecto que arranca», compartidas por
 * packaging.test.js y packagingEverySection.test.js.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..')
const PUBLIC_REF = /["'`(](\/[\w./-]+\.(?:png|jpe?g|webp|avif|svg|glb|gltf|mp4|webm|json))\b/g

/**
 * Rutas absolutas (`/meridian/map/map.webp`) que el código del ZIP pide y que
 * el marketplace sirve desde su public/, pero que no viajaron en el ZIP. Una
 * ruta que no existe en el repo (un ejemplo en un comentario) no cuenta.
 */
export function missingPublicAssets(files, prefix = '') {
  const missing = new Set()
  for (const [name, buf] of files) {
    if (!name.startsWith(prefix) || !/\.(jsx?|css|html)$/.test(name)) continue
    for (const [, ref] of buf.toString('utf8').matchAll(PUBLIC_REF)) {
      if (!fs.existsSync(path.join(REPO_ROOT, 'public', ref))) continue
      if (!files.has(`${prefix}public${ref}`)) missing.add(ref)
    }
  }
  return [...missing]
}

/** Un proyecto Vite que arranca necesita al menos esto. */
export function assertRunnableProject(files, prefix = '') {
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
export function assertDepsCoverImports(files, prefix = '') {
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
