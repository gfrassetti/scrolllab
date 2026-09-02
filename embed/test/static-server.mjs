/**
 * Servidor estático mínimo para probar el embed como lo vería un sitio ajeno
 * (sin transforms de Vite). `node embed/test/static-server.mjs` → :4178
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = normalize(join(fileURLToPath(import.meta.url), '../../..')) // repo root
const PORT = Number(process.argv[2]) || 4178
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.map': 'application/json',
}

createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split('?')[0])
    const rel = urlPath === '/' ? '/embed/test/index.html' : urlPath
    const abs = normalize(join(ROOT, rel))
    if (!abs.startsWith(ROOT)) {
      res.writeHead(403).end('nope')
      return
    }
    const body = await readFile(abs)
    res.writeHead(200, {
      'content-type': TYPES[extname(abs)] || 'application/octet-stream',
      'access-control-allow-origin': '*',
    })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
}).listen(PORT, () => console.log(`static → http://localhost:${PORT}/`))
