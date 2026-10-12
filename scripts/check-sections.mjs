/**
 * check:sections — el procedimiento completo de prueba para un template o una
 * sección, de una vez: que se descargue bien, que el builder la edite, que se
 * vea bien (PC, tablet, teléfono, con y sin movimiento) y, si es widget de LAB,
 * que ande embebida en un sitio ajeno. Corre las herramientas de siempre en
 * orden, sigue aunque una falle y al final deja un informe.
 *
 * Uso:
 *   npm run check:sections -- apex              un modelo entero
 *   npm run check:sections -- apex/Hero         una sección (o varias)
 *   npm run check:sections -- apex --fast       solo lo rápido (sin navegador pesado)
 *   npm run check:sections -- apex --skip=parity,motion
 *   npm run check:sections -- apex --only=mobile     un paso (el fixer reproduce y re-verifica con esto)
 *
 * Pasos (cada uno es un comando que también se puede correr suelto):
 *   zip        node --test packagingEverySection (cada sección sola y su modelo junto)
 *   editable   check:editable por sección (todo lo visible es un campo)
 *   builder    check:builder (lo editado aparece en la vista previa)
 *   builder-save check:builder-save (se guarda solo, se retoma en otro navegador, llega al ZIP comprado)
 *   colors     check:colors (todo lo visible sigue a sus colores)
 *   visual     check:visual (npm install + vite build + Chromium del ZIP del
 *              template y de la composición del builder con esas secciones)
 *   mobile     check:mobile --quick (320/390/768/1280 + reducir movimiento)
 *   motion     check:motion --quick (teléfono emulado, gestos táctiles)
 *   parity     check:parity (PC ↔ teléfono ↔ tablet)
 *   lab-screen screen:lab --deep (solo las que son widget de LAB)
 *   lab-flow   check:lab (editar → vista previa → publicar → sitio ajeno)
 *   lab-e2e    test:e2e de esas secciones (embed real, 3 anchos)
 *
 * Informe: storage/section-check/<objetivo>.md (y la salida de cada paso en
 * storage/section-check/<objetivo>/<paso>.log). El procedimiento y cuándo
 * correrlo: docs/testing-sections.md.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { PRODUCTS } from '../server/catalog.js'
import { ALLOWED_SECTIONS, HOSTABLE_SECTIONS } from '../server/sections.js'
import { BUILDER_HIDDEN_SKUS } from '../src/domain/catalog.js'
import { sectionModelOf } from '../src/domain/sections.js'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(REPO)

const argv = process.argv.slice(2)
const FAST = argv.includes('--fast')
const SKIP = new Set(
  argv
    .filter((a) => a.startsWith('--skip='))
    .flatMap((a) => a.slice('--skip='.length).split(','))
    .filter(Boolean),
)
// --only=paso[,paso]: solo esos (el fixer reproduce y re-verifica el paso que falló).
const ONLY = new Set(
  argv
    .filter((a) => a.startsWith('--only='))
    .flatMap((a) => a.slice('--only='.length).split(','))
    .filter(Boolean),
)
const targets = argv.filter((a) => !a.startsWith('-'))
if (!targets.length) {
  console.error('Uso: npm run check:sections -- <modelo | modelo/Sección …> [--fast] [--skip=paso,paso] [--only=paso,paso]')
  process.exit(1)
}

// Secciones del builder que cubre el pedido (un modelo = todas las suyas).
const builderIds = ALLOWED_SECTIONS.filter((id) => !BUILDER_HIDDEN_SKUS.includes(sectionModelOf(id)))
const ids = [
  ...new Set(
    targets.flatMap((t) => (t.includes('/') ? [t] : builderIds.filter((id) => sectionModelOf(id) === t))),
  ),
]
const unknown = targets.filter((t) => !ids.some((id) => id === t || sectionModelOf(id) === t))
if (unknown.length || !ids.length) {
  console.error(`✖ el builder no tiene: ${(unknown.length ? unknown : targets).join(', ')}`)
  process.exit(1)
}
const models = [...new Set(ids.map(sectionModelOf))]
// Los que tienen página de template (/templates/<modelo>) y se venden como ZIP.
const templateModels = models.filter((m) => m in PRODUCTS)
const hostable = ids.filter((id) => HOSTABLE_SECTIONS.includes(id))
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const slug = targets.join('+').replace(/[^\w+-]/g, '_')
const OUT = path.join(REPO, 'storage', 'section-check')
const LOGS = path.join(OUT, slug)
fs.mkdirSync(LOGS, { recursive: true })

const npm = (script, ...args) => ['npm', ['run', '-s', script, ...(args.length ? ['--', ...args] : [])]]
const nodeTest = (...args) => [process.execPath, ['--test', '--test-concurrency=1', ...args]]

/** [nombre, qué mide, comando[], rápido?] */
const STEPS = [
  [
    'zip',
    'el ZIP de cada sección sola y de su modelo junto arranca (imports, dependencias, archivos)',
    [nodeTest(`--test-name-pattern=(?:^|\\s)(${models.map(escape).join('|')})(/|:)`, 'server/__tests__/packagingEverySection.test.js')],
    true,
  ],
  ['editable', 'todo texto, foto, link y color visible es un campo', ids.map((id) => npm('check:editable', id)), true],
  ['builder', 'lo editado en el panel aparece en la vista previa', [npm('check:builder', ...ids)], false],
  ['builder-save', 'se guarda solo, se retoma en otro navegador y llega al ZIP comprado', [npm('check:builder-save', ...targets)], false],
  // check:colors toma un objetivo por vez (un modelo o una sección).
  ['colors', 'todo lo visible sigue a sus campos de color', targets.map((t) => npm('check:colors', t)), false],
  [
    'visual',
    'el comprador instala, compila y ve el ZIP (template y composición del builder)',
    [npm('check:visual', ...templateModels, ...models.map((m) => `custom:${m}`))],
    false,
  ],
  ['mobile', 'cada sección de 320 a 1280 y con «reducir movimiento»', templateModels.length ? [npm('check:mobile', ...templateModels, '--quick')] : [], false],
  ['motion', 'teléfono emulado con gestos táctiles: huecos, trabas, texto oculto', templateModels.length ? [npm('check:motion', ...templateModels, '--quick')] : [], false],
  ['parity', 'lo que anima en PC anima en el teléfono y la tablet', templateModels.length ? [npm('check:parity', ...templateModels)] : [], false],
  ['lab-screen', 'embebida en un sitio ajeno: modo, alto, texto oculto o cortado, fotos, fuentes', hostable.length ? [npm('screen:lab', ...hostable, '--deep', '--jobs', '1')] : [], false],
  ['lab-flow', 'LAB: editar → vista previa → publicar → verse en un sitio ajeno', hostable.length ? [npm('check:lab', ...hostable)] : [], false],
  [
    'lab-e2e',
    'el embed real a 375/768/1280 con sus props',
    hostable.length
      ? [npm('build:embed'), nodeTest(`--test-name-pattern=(${hostable.map(escape).join('|')}) — `, 'embed/test/e2e/hosted-sections.e2e.mjs')]
      : [],
    false,
  ],
]

function run([cmd, args], logFile) {
  return new Promise((resolve) => {
    // npm en Windows es npm.cmd: necesita shell. node va directo (los patrones
    // de --test-name-pattern llevan | y paréntesis que la shell rompería).
    const child = spawn(cmd, args, { cwd: REPO, shell: cmd === 'npm' && process.platform === 'win32', env: process.env })
    const log = fs.createWriteStream(logFile, { flags: 'a' })
    log.write(`$ ${cmd} ${args.join(' ')}\n`)
    child.stdout.pipe(log, { end: false })
    child.stderr.pipe(log, { end: false })
    child.on('close', (code) => {
      log.end(`\n(exit ${code})\n`)
      resolve(code)
    })
  })
}

const tail = (file, n = 12) => fs.readFileSync(file, 'utf8').trimEnd().split('\n').slice(-n).join('\n')

console.log(`check:sections — ${ids.length} sección(es): ${ids.join(', ')}`)
console.log(`  modelos con template: ${templateModels.join(', ') || '—'} · widgets de LAB: ${hostable.length}\n`)

const results = []
for (const [name, what, commands, fast] of STEPS) {
  if (SKIP.has(name) || (ONLY.size && !ONLY.has(name)) || (FAST && !fast && !ONLY.has(name))) {
    results.push({ name, what, status: 'salteado' })
    continue
  }
  if (!commands.length) {
    results.push({ name, what, status: 'no aplica' })
    continue
  }
  const logFile = path.join(LOGS, `${name}.log`)
  fs.rmSync(logFile, { force: true })
  process.stdout.write(`· ${name.padEnd(11)} ${what} … `)
  const t0 = Date.now()
  let failed = false
  for (const command of commands) {
    if ((await run(command, logFile)) !== 0) failed = true
  }
  const secs = Math.round((Date.now() - t0) / 1000)
  console.log(failed ? `✖ (${secs} s)` : `ok (${secs} s)`)
  if (failed) console.log(tail(logFile).replace(/^/gm, '    '))
  results.push({ name, what, status: failed ? 'FALLA' : 'ok', secs, log: path.relative(REPO, logFile) })
}

const failed = results.filter((r) => r.status === 'FALLA')
const report = [
  `# check:sections — ${targets.join(' ')}`,
  '',
  `${new Date().toISOString()} · ${ids.length} sección(es) · widgets de LAB: ${hostable.join(', ') || '—'}`,
  '',
  '| Paso | Qué mide | Resultado | Tiempo | Salida |',
  '|---|---|---|---|---|',
  ...results.map((r) => `| ${r.name} | ${r.what} | ${r.status} | ${r.secs != null ? `${r.secs} s` : ''} | ${r.log || ''} |`),
  '',
  'Las láminas de LAB quedan en storage/lab-screen/ y las capturas del ZIP en storage/visual-check/: mirarlas.',
  '',
].join('\n')
fs.writeFileSync(path.join(OUT, `${slug}.md`), report)

console.log(`\nInforme: ${path.relative(REPO, path.join(OUT, `${slug}.md`))}`)
if (failed.length) {
  console.error(`✖ fallaron: ${failed.map((r) => r.name).join(', ')}`)
  process.exit(1)
}
console.log('✓ todo en verde. Falta mirar las láminas de LAB y las capturas del ZIP.')
