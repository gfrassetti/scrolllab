/**
 * `verify` en una copia limpia de HEAD: lo que verá el CI, sin el trabajo a
 * medias de las otras sesiones que editan este mismo árbol.
 *
 * Con varias sesiones en la misma carpeta, correr `npm run verify` sobre el
 * árbol da rojos que no son de quien lo corre (un archivo de otra sesión a
 * medias rompe los tipos) y deja pasar cosas que el CI vería. Esto arma
 * `git archive HEAD` + SOLO los archivos que se pidan, y corre los pasos ahí.
 * No toca el árbol ni el índice reales: no hace git add / stash / checkout.
 *
 * Uso (módulo):
 *   const { ok, results } = await cleanVerify({ paths: ['server/x.js'] })
 *
 * Uso (CLI):
 *   node scripts/lib/clean-verify.mjs [--keep] [--steps=lint,test] [--all] <rutas…>
 *
 * Las rutas son relativas a la raíz del repo. Un archivo que ya no existe en el
 * árbol se borra en la copia (así se verifica también un borrado). Sin rutas,
 * verifica HEAD tal cual.
 *
 * La copia vive en storage/clean-verify/<timestamp>/ (gitignored y fuera de
 * ESLint) con node_modules por junction al del repo, y se borra al terminar
 * salvo `keep`.
 */
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Los pasos de `npm run verify`, en su orden. */
export const ALL_STEPS = Object.freeze(['lint', 'typecheck', 'test', 'check'])

/** Lo que no se puede poner encima de la copia. */
const FORBIDDEN_ROOTS = new Set(['.git', 'node_modules', 'storage'])
const LOG_MAX = 200_000
const DEFAULT_TIMEOUT_MS = 15 * 60_000

/**
 * Rutas relativas al repo, con `/`, sin repetir. Tira si alguna sale del repo o
 * apunta a .git, node_modules o storage.
 * @param {string[]} paths
 * @param {string} [repo]
 * @returns {string[]}
 */
export function normalizePaths(paths, repo = REPO) {
  const out = []
  for (const raw of paths || []) {
    if (typeof raw !== 'string' || !raw.trim()) throw new Error('Ruta vacía')
    // `\` es un separador en Windows pero un carácter más en POSIX: se unifica
    // antes de resolver para que `server\app.js` sea lo mismo en los dos.
    const abs = path.resolve(repo, raw.replace(/\\/g, '/'))
    const rel = path.relative(repo, abs)
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`La ruta sale del repositorio: ${raw}`)
    }
    const posix = rel.split(path.sep).join('/')
    if (FORBIDDEN_ROOTS.has(posix.split('/')[0])) {
      throw new Error(`Ruta no permitida (${posix.split('/')[0]}/): ${raw}`)
    }
    if (!out.includes(posix)) out.push(posix)
  }
  return out
}

/**
 * Pone `paths` del árbol (`repo`) encima de la copia (`dir`): copia los que
 * existen y borra de la copia los que ya no.
 * @returns {{ copied: string[], deleted: string[] }}
 */
export function applyOverlay({ repo = REPO, dir, paths }) {
  const copied = []
  const deleted = []
  const root = path.resolve(dir)
  for (const rel of paths) {
    const src = path.join(repo, rel)
    const dst = path.resolve(root, rel)
    if (dst !== root && !dst.startsWith(root + path.sep)) {
      throw new Error(`El destino sale de la copia: ${rel}`)
    }
    if (!fs.existsSync(src)) {
      fs.rmSync(dst, { recursive: true, force: true })
      deleted.push(rel)
      continue
    }
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dst, { recursive: true, force: true })
    } else {
      fs.mkdirSync(path.dirname(dst), { recursive: true })
      fs.copyFileSync(src, dst)
    }
    copied.push(rel)
  }
  return { copied, deleted }
}

/** `git archive HEAD` extraído en `dir`. Devuelve el sha de HEAD. */
function extractHead(repo, dir) {
  fs.mkdirSync(dir, { recursive: true })
  const tar = '_head.tar'
  execFileSync('git', ['-C', repo, 'archive', '--format=tar', `--output=${path.join(dir, tar)}`, 'HEAD'], {
    stdio: 'ignore',
  })
  // Con cwd y nombre relativo: un `C:\…` en -f lo toma como «host:archivo».
  execFileSync('tar', ['-xf', tar], { cwd: dir, stdio: 'ignore' })
  fs.rmSync(path.join(dir, tar))
  return execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
}

function linkNodeModules(repo, dir) {
  fs.symlinkSync(
    path.join(repo, 'node_modules'),
    path.join(dir, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  )
}

/**
 * Borra la copia SIN seguir el link a node_modules: si quedara, un borrado
 * recursivo se llevaría el node_modules real. Si no se puede soltar el link, no
 * borra nada y avisa.
 */
export function removeCopy(dir, repo = REPO) {
  const link = path.join(dir, 'node_modules')
  try {
    if (fs.lstatSync(link).isSymbolicLink()) {
      try {
        fs.unlinkSync(link)
      } catch {
        fs.rmdirSync(link)
      }
    }
  } catch {
    /* no hay link */
  }
  let linked = false
  try {
    linked = fs.lstatSync(link).isSymbolicLink()
  } catch {
    /* ya no está */
  }
  if (linked) throw new Error(`No pude soltar el link a node_modules: no borro ${dir}`)
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
  if (!fs.existsSync(path.join(repo, 'node_modules'))) {
    throw new Error('node_modules del repo desapareció al borrar la copia')
  }
}

function killTree(child) {
  try {
    if (process.platform === 'win32' && child.pid) {
      execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      child.kill('SIGKILL')
    }
  } catch {
    /* ya terminó */
  }
}

function runStep(step, { dir, timeoutMs }) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    let log = ''
    let timedOut = false
    const child = spawn('npm', ['run', step], {
      cwd: dir,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    })
    const take = (chunk) => {
      log += chunk.toString('utf8')
      if (log.length > LOG_MAX) log = log.slice(-LOG_MAX)
    }
    child.stdout.on('data', take)
    child.stderr.on('data', take)
    const timer = setTimeout(() => {
      timedOut = true
      killTree(child)
    }, timeoutMs)
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ step, ok: false, ms: Date.now() - t0, log: `${log}\n${err.message}` })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      // Las rutas del log salen relativas a la raíz del repo, no a la copia.
      const rel = log.split(dir + path.sep).join('')
      resolve({
        step,
        ok: code === 0 && !timedOut,
        ms: Date.now() - t0,
        log: timedOut ? `${rel}\n[tiempo agotado: ${timeoutMs} ms]` : rel,
      })
    })
  })
}

/**
 * @param {{
 *   paths?: string[],
 *   steps?: Array<'lint' | 'typecheck' | 'test' | 'check'>,
 *   keep?: boolean,
 *   failFast?: boolean,
 *   timeoutMs?: number,
 * }} [options]
 * @returns {Promise<{
 *   ok: boolean, dir: string, kept: boolean, head: string,
 *   overlay: { copied: string[], deleted: string[] },
 *   results: Array<{ step: string, ok: boolean, ms: number, log: string }>,
 * }>}
 */
export async function cleanVerify({
  paths = [],
  steps = [...ALL_STEPS],
  keep = false,
  failFast = true,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  for (const s of steps) {
    if (!ALL_STEPS.includes(s)) throw new Error(`Paso desconocido: ${s} (${ALL_STEPS.join(', ')})`)
  }
  const rels = normalizePaths(paths)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(REPO, 'storage', 'clean-verify', `${stamp}-${process.pid}`)

  const results = []
  let head = ''
  let overlay = { copied: [], deleted: [] }
  try {
    head = extractHead(REPO, dir)
    overlay = applyOverlay({ repo: REPO, dir, paths: rels })
    linkNodeModules(REPO, dir)
    for (const step of steps) {
      const r = await runStep(step, { dir, timeoutMs })
      results.push(r)
      if (!r.ok && failFast) break
    }
  } finally {
    if (!keep) removeCopy(dir)
  }
  return {
    ok: results.length === steps.length && results.every((r) => r.ok),
    dir,
    kept: keep,
    head,
    overlay,
    results,
  }
}

// ——— CLI ———

/**
 * Lo que importa de un log que falló: las líneas de error (sin las
 * advertencias) con su archivo, y el final. `lint` termina con cientos de
 * warnings que tapan el error real.
 * @param {string} log
 * @param {{ maxErrors?: number, tail?: number }} [opts]
 */
export function failureExcerpt(log, { maxErrors = 30, tail = 15 } = {}) {
  const lines = String(log).split('\n')
  // Primero lo inequívoco (un test que falló, un error de tipos o de ESLint, un
  // resumen con «✖»); recién si no hay, cualquier línea que diga «error»: los
  // tests imprimen mucho `console.error` esperado que tapa lo que falló.
  const STRONG = /^\s*not ok\b|\berror TS\d+|^\s+\d+:\d+\s+error\b|^✖|\bERR!/
  const WEAK = /\b(error|Error|FAIL)\b/
  const hasStrong = lines.some((l) => STRONG.test(l))
  const isError = (l) =>
    (hasStrong ? STRONG.test(l) : WEAK.test(l)) && !/\bwarning\b/i.test(l)
  // ESLint (formato stylish) pone el archivo en la línea de arriba del error.
  const isFileHeader = (l) => /^\S.*\.(?:[mc]?[jt]sx?|json|css|md)$/.test(l)
  const picked = []
  let header = null
  let headerShown = false
  for (let i = 0; i < lines.length && picked.length < maxErrors; i += 1) {
    const l = lines[i]
    if (isFileHeader(l)) {
      header = l
      headerShown = false
      continue
    }
    if (!isError(l)) continue
    if (header && /^\s/.test(l) && !headerShown) {
      picked.push(header)
      headerShown = true
    }
    picked.push(l)
  }
  const end = lines.filter((l) => l.trim()).slice(-tail)
  const parts = []
  if (picked.length) parts.push(picked.join('\n'))
  parts.push(end.join('\n'))
  return parts.join('\n…\n')
}

function formatMs(ms) {
  return ms < 60_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`
}

async function main(argv) {
  const keep = argv.includes('--keep')
  const failFast = !argv.includes('--all')
  const stepsArg = argv.find((a) => a.startsWith('--steps='))
  const steps = stepsArg ? stepsArg.slice('--steps='.length).split(',').filter(Boolean) : [...ALL_STEPS]
  const paths = argv.filter((a) => !a.startsWith('--'))

  const out = await cleanVerify({ paths, steps, keep, failFast })
  console.log(
    `HEAD ${out.head} + ${out.overlay.copied.length} archivo(s)` +
      (out.overlay.deleted.length ? `, ${out.overlay.deleted.length} borrado(s)` : ''),
  )
  for (const r of out.results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.step.padEnd(10)} ${formatMs(r.ms)}`)
  }
  const failed = out.results.find((r) => !r.ok)
  if (failed) {
    console.log(`\n— ${failed.step}: lo que falló —`)
    console.log(failureExcerpt(failed.log))
  }
  const skipped = steps.filter((s) => !out.results.some((r) => r.step === s))
  if (skipped.length) console.log(`(sin correr tras el fallo: ${skipped.join(', ')})`)
  if (keep) console.log(`copia: ${out.dir}`)
  console.log(out.ok ? '\n✓ verify en copia limpia' : '\n✗ verify en copia limpia')
  return out.ok ? 0 : 1
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(err?.message || err)
      process.exit(1)
    },
  )
}
