/**
 * qa:sweep — el barrido de pruebas de secciones (builder + LAB). Sin IA: decide
 * qué probar, lo prueba en una copia limpia de HEAD y anota los hallazgos.
 * Arquitectura y porqué: docs/adr/0007-pruebas-continuas-de-secciones.md.
 *
 *   1. Qué probar: los modelos que cambiaron desde la última corrida (git diff;
 *      un archivo compartido prueba todo) + uno en rotación, para que todo se
 *      pruebe entero cada tanto aunque nadie lo toque.
 *   2. Dónde: una copia de `git archive HEAD` (scripts/lib/clean-verify.mjs),
 *      nunca el árbol de trabajo: el trabajo a medias de otra sesión daría rojos
 *      falsos.
 *   3. Qué corre: `check:sections -- <modelo>` por modelo (incluye guardar y
 *      retomar en el builder, y los pasos de LAB si el modelo tiene widgets).
 *   4. Qué queda: storage/qa/findings.json (abierto / arreglado / necesita
 *      persona; lo aceptado vive en el código con motivo, no acá),
 *      storage/qa/report.md, las salidas en storage/qa/runs/<fecha>/ y una línea
 *      en la bitácora de Obsidian.
 *
 * Uso:
 *   npm run qa:sweep                     lo que cambió + uno en rotación
 *   npm run qa:sweep -- --models apex,kin
 *   npm run qa:sweep -- --all            todos los modelos (lento: horas)
 *   npm run qa:sweep -- --fast           solo los pasos rápidos de check:sections
 *   npm run qa:sweep -- --queue [N]      hallazgos abiertos para el fixer (JSON)
 *   npm run qa:sweep -- --mark <id> --ok|--fail --note "…"   el fixer anota un intento
 */
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ALLOWED_SECTIONS } from '../server/sections.js'
import { BUILDER_HIDDEN_SKUS } from '../src/domain/catalog.js'
import { sectionModelOf } from '../src/domain/sections.js'
import { cleanVerify, removeCopy } from './lib/clean-verify.mjs'
import { fixQueue, modelsToCheck, nextInRotation, parseFailures, reconcile, recordAttempt } from './lib/qa/plan.js'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const QA = path.join(REPO, 'storage', 'qa')
const LEDGER = path.join(QA, 'findings.json')
const STATE = path.join(QA, 'state.json')
const LOCK = path.join(QA, '.lock')
const VAULT_NOTE = path.join(os.homedir(), 'Documents', 'Obsidian', 'ScrollLab', 'QA — bitácora de pruebas.md')
fs.mkdirSync(QA, { recursive: true })

const argv = process.argv.slice(2)
const has = (f) => argv.includes(f)
const valueOf = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : undefined)
const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}
const writeJson = (file, data) => {
  fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(data, null, 2)}\n`)
  fs.renameSync(`${file}.tmp`, file)
}
const now = () => new Date().toISOString()

// --- el fixer: cola e intentos -------------------------------------------------

if (has('--queue')) {
  const n = Number(valueOf('--queue')) || 5
  console.log(JSON.stringify(fixQueue(readJson(LEDGER, {}), n), null, 2))
  process.exit(0)
}
if (has('--mark')) {
  const id = valueOf('--mark')
  const ok = has('--ok')
  if (!ok && !has('--fail')) {
    console.error('✖ --mark <id> necesita --ok o --fail')
    process.exit(1)
  }
  const ledger = recordAttempt(readJson(LEDGER, {}), id, { ok, note: valueOf('--note') || '', now: now() })
  writeJson(LEDGER, ledger)
  console.log(`${id}: ${ledger[id].status} (intentos: ${ledger[id].attempts || 0})`)
  process.exit(0)
}

// --- candado: un barrido por vez ------------------------------------------------

const STALE_MS = 8 * 60 * 60 * 1000
if (fs.existsSync(LOCK)) {
  const lock = readJson(LOCK, {})
  if (Date.now() - Date.parse(lock.at || 0) < STALE_MS) {
    console.error(`✖ ya hay un barrido corriendo (pid ${lock.pid}, desde ${lock.at}). Si no es así, borrá ${path.relative(REPO, LOCK)}.`)
    process.exit(2)
  }
}
writeJson(LOCK, { pid: process.pid, at: now() })
const releaseLock = () => fs.rmSync(LOCK, { force: true })
process.on('exit', releaseLock)

// --- qué probar ------------------------------------------------------------------

const git = (...args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim()
const MODELS = [...new Set(ALLOWED_SECTIONS.filter((id) => !BUILDER_HIDDEN_SKUS.includes(sectionModelOf(id))).map(sectionModelOf))]
const state = readJson(STATE, {})
const head = git('rev-parse', 'HEAD')

let models
let why
if (has('--all')) {
  models = [...MODELS]
  why = 'todos (--all)'
} else if (valueOf('--models')) {
  models = valueOf('--models').split(',').filter((m) => MODELS.includes(m))
  why = 'pedidos (--models)'
} else {
  let changed = []
  try {
    changed = state.lastCommit ? git('diff', '--name-only', `${state.lastCommit}..${head}`).split('\n').filter(Boolean) : []
  } catch {
    changed = [] // el commit de la corrida anterior ya no existe (historia reescrita)
  }
  const plan = state.lastCommit ? modelsToCheck(changed, MODELS) : { all: false, models: [] }
  const rotate = nextInRotation(MODELS, state.rotation || null)
  models = plan.all ? [...MODELS] : [...new Set([...plan.models, rotate])]
  why = plan.all
    ? `cambió algo compartido desde ${state.lastCommit.slice(0, 7)}`
    : `cambiaron: ${plan.models.join(', ') || 'ninguno'} · rotación: ${rotate}`
  state.rotation = rotate
}

const stamp = now().replace(/[:.]/g, '-')
const RUN = path.join(QA, 'runs', stamp)
fs.mkdirSync(RUN, { recursive: true })
console.log(`qa:sweep @ ${head.slice(0, 7)} — ${models.join(', ') || '(nada)'} — ${why}`)

// --- correr en la copia limpia ----------------------------------------------------

function run(cwd, args, logFile) {
  return new Promise((resolve) => {
    // VITE_CACHE_DIR propio: la copia usa el node_modules real por un link y, con
    // el caché de Vite compartido, chocaba con el Vite de quien está trabajando.
    const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', VITE_CACHE_DIR: path.join(cwd, 'storage', '.vite-cache') }
    const child = spawn(process.execPath, args, { cwd, env })
    const out = fs.createWriteStream(logFile)
    child.stdout.pipe(out, { end: false })
    child.stderr.pipe(out, { end: false })
    child.on('close', (code) => {
      out.end()
      resolve(code)
    })
  })
}

const found = []
const covered = []
const summary = []
const copy = await cleanVerify({ steps: [], keep: true })
const COPY = copy.dir
try {
  const FAST = has('--fast') ? ['--fast'] : []
  for (const model of models) {
    const log = path.join(RUN, `${model}.log`)
    const t0 = Date.now()
    const code = await run(COPY, ['scripts/check-sections.mjs', model, ...FAST], log)
    // El informe por paso de check:sections: qué corrió y qué falló.
    const steps = path.join(COPY, 'storage', 'section-check', model)
    for (const file of fs.existsSync(steps) ? fs.readdirSync(steps) : []) {
      const step = file.replace(/\.log$/, '')
      const text = fs.readFileSync(path.join(steps, file), 'utf8')
      fs.copyFileSync(path.join(steps, file), path.join(RUN, `${model}.${file}`))
      covered.push({ model, step })
      // Un paso puede correr varios comandos: falla si alguno salió distinto de 0 (o lo mataron).
      if (/\(exit (?!0\))[^)]*\)/.test(text)) {
        for (const detail of parseFailures(text)) found.push({ model, step, detail })
      }
    }
    summary.push(`${model}: ${code === 0 ? 'ok' : 'con fallas'} (${Math.round((Date.now() - t0) / 60000)} min)`)
    console.log(`  ${code === 0 ? '✓' : '✖'} ${model}`)
  }

  // Láminas y capturas para mirar a ojo (las de la copia se borran con ella).
  for (const dir of ['lab-screen', 'visual-check', 'builder-save']) {
    const from = path.join(COPY, 'storage', dir)
    if (fs.existsSync(from)) fs.cpSync(from, path.join(RUN, dir), { recursive: true })
  }
} finally {
  removeCopy(COPY)
}

// --- registro e informe -------------------------------------------------------------

const before = readJson(LEDGER, {})
const ledger = reconcile(before, found, covered, now())
writeJson(LEDGER, ledger)
const all = Object.values(ledger)
const opened = all.filter((f) => f.status === 'open' && !before[f.id])
const reopened = all.filter((f) => f.status === 'open' && before[f.id]?.status === 'fixed')
const closed = all.filter((f) => f.status === 'fixed' && before[f.id]?.status === 'open')
const open = all.filter((f) => f.status === 'open')
const person = all.filter((f) => f.status === 'needs-person')

const line = (f) => `- \`${f.id}\` **${f.model} · ${f.step}** — ${f.detail}${f.timesSeen > 1 ? ` (visto ${f.timesSeen} veces)` : ''}`
const report = [
  `# QA — barrido ${stamp}`,
  '',
  `HEAD ${head.slice(0, 7)} · ${why}`,
  '',
  ...summary.map((s) => `- ${s}`),
  '',
  `## Nuevos (${opened.length + reopened.length})`,
  ...[...opened, ...reopened].map(line),
  '',
  `## Abiertos (${open.length})`,
  ...open.map(line),
  '',
  `## Necesitan una persona (${person.length})`,
  ...person.map((f) => `${line(f)}${f.note ? ` — ${f.note}` : ''}`),
  '',
  `## Arreglados en esta corrida (${closed.length})`,
  ...closed.map(line),
  '',
  `Salidas y láminas: ${path.relative(REPO, RUN)}`,
  '',
].join('\n')
fs.writeFileSync(path.join(QA, 'report.md'), report)
fs.writeFileSync(path.join(RUN, 'report.md'), report)

state.lastCommit = head
state.lastRun = now()
writeJson(STATE, state)

// Una línea por corrida en Obsidian: lo que el dueño mira sin abrir la terminal.
try {
  if (!fs.existsSync(VAULT_NOTE)) {
    fs.writeFileSync(
      VAULT_NOTE,
      '---\ntags: [scrolllab, qa]\n---\n\n# QA — bitácora de pruebas\n\nUna línea por barrido (`npm run qa:sweep`). Detalle: `storage/qa/report.md` en el repo. Procedimiento: [[Probar secciones — builder y LAB (procedimiento)]].\n\n',
    )
  }
  fs.appendFileSync(
    VAULT_NOTE,
    `- ${stamp.slice(0, 16)} · ${head.slice(0, 7)} · ${models.join(', ')} · nuevos ${opened.length + reopened.length} · abiertos ${open.length} · persona ${person.length} · arreglados ${closed.length}\n`,
  )
} catch {
  /* sin bóveda en esta máquina */
}

console.log(`\nnuevos ${opened.length + reopened.length} · abiertos ${open.length} · necesitan persona ${person.length} · arreglados ${closed.length}`)
console.log(`Informe: ${path.relative(REPO, path.join(QA, 'report.md'))}`)
process.exitCode = open.length || person.length ? 1 : 0
