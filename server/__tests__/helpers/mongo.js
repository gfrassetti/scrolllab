import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

/**
 * Un Mongo real para los tests de contrato de los repositorios.
 *
 * En orden:
 *  1. `MONGODB_TEST_URI` (CI: un servicio `mongo:7`): se usa una base propia de
 *     la corrida, que se borra al terminar.
 *  2. Un `mongod` local (`MONGOD_BIN`, el del PATH o la instalación de Windows):
 *     se levanta con una carpeta temporal y un puerto libre.
 *  3. Nada: devuelve `null` y los tests se saltean. Con `REQUIRE_MONGO=1` (CI)
 *     la ausencia es un error: sin esto un CI sin Mongo pasaría en falso.
 */

function findMongod() {
  const candidates = []
  if (process.env.MONGOD_BIN) candidates.push(process.env.MONGOD_BIN)
  const exe = process.platform === 'win32' ? 'mongod.exe' : 'mongod'
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (dir) candidates.push(path.join(dir, exe))
  }
  if (process.platform === 'win32') {
    const root = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'MongoDB', 'Server')
    try {
      for (const v of fs.readdirSync(root).sort().reverse()) {
        candidates.push(path.join(root, v, 'bin', exe))
      }
    } catch {
      /* no instalado */
    }
  }
  return candidates.find((p) => {
    try {
      return fs.statSync(p).isFile()
    } catch {
      return false
    }
  })
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

function waitForPort(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const s = net.connect(port, '127.0.0.1')
      s.once('connect', () => {
        s.destroy()
        resolve()
      })
      s.once('error', () => {
        s.destroy()
        if (Date.now() > deadline) reject(new Error('mongod no abrió el puerto a tiempo'))
        else setTimeout(attempt, 150)
      })
    }
    attempt()
  })
}

/**
 * @returns {Promise<{ uri: string, source: string, stop: () => Promise<void> } | null>}
 */
export async function startTestMongo() {
  const dbName = `sp-contract-${crypto.randomBytes(4).toString('hex')}`

  if (process.env.MONGODB_TEST_URI) {
    const u = new URL(process.env.MONGODB_TEST_URI)
    u.pathname = `/${dbName}`
    return { uri: u.toString(), source: 'MONGODB_TEST_URI', stop: async () => {} }
  }

  const bin = findMongod()
  if (!bin) {
    if (process.env.REQUIRE_MONGO === '1') {
      throw new Error('REQUIRE_MONGO=1 pero no hay Mongo: definí MONGODB_TEST_URI o MONGOD_BIN')
    }
    return null
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-mongod-'))
  const port = await freePort()
  const child = spawn(
    bin,
    ['--dbpath', dir, '--port', String(port), '--bind_ip', '127.0.0.1', '--wiredTigerCacheSizeGB', '0.25'],
    { stdio: 'ignore', windowsHide: true },
  )
  let exited = false
  child.once('exit', () => {
    exited = true
  })
  try {
    await waitForPort(port)
  } catch (err) {
    child.kill()
    throw err
  }
  return {
    uri: `mongodb://127.0.0.1:${port}/${dbName}`,
    source: bin,
    async stop() {
      if (!exited) {
        await new Promise((resolve) => {
          child.once('exit', resolve)
          child.kill()
        })
      }
      try {
        fs.rmSync(dir, { recursive: true, force: true })
      } catch {
        /* el SO a veces tarda en soltar los archivos */
      }
    },
  }
}
