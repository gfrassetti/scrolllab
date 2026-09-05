import fs from 'node:fs'
import path from 'node:path'
import session from 'express-session'

/**
 * Session store de archivo, SOLO para desarrollo.
 *
 * En dev no hay Mongo, así que express-session cae en su `MemoryStore` y
 * `nodemon` te desloguea en cada reinicio (editás un archivo de `server/` y la
 * sesión del "dev buyer" se evapora → "Tenés que iniciar sesión" a mitad de un
 * flujo). Esto serializa las sesiones a un JSON bajo `storage/` (gitignored),
 * así el login sobrevive los reinicios.
 *
 * No usar en producción: sin locking, sin TTL activo del lado del store, un solo
 * archivo. Producción usa connect-mongo (ver app.js).
 */
export class DevFileSessionStore extends session.Store {
  constructor({ file, ttlMs = 1000 * 60 * 60 * 24 * 14 } = {}) {
    super()
    this.file = file
    this.ttlMs = ttlMs
    this.sessions = new Map()
    this._writeTimer = null
    this._load()
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8')
      const parsed = JSON.parse(raw)
      const now = Date.now()
      for (const [sid, entry] of Object.entries(parsed)) {
        if (entry && entry.expires > now) this.sessions.set(sid, entry)
      }
    } catch {
      // primer arranque / archivo corrupto → empezamos vacíos
    }
  }

  _scheduleWrite() {
    if (this._writeTimer) return
    this._writeTimer = setTimeout(() => {
      this._writeTimer = null
      try {
        fs.mkdirSync(path.dirname(this.file), { recursive: true })
        const obj = Object.fromEntries(this.sessions)
        fs.writeFileSync(this.file, JSON.stringify(obj))
      } catch {
        // best-effort: si no se puede escribir, la sesión vive en memoria igual
      }
    }, 150)
    this._writeTimer.unref?.()
  }

  _expiresFor(sess) {
    const cookieExpires = sess?.cookie?.expires
    if (cookieExpires) return new Date(cookieExpires).getTime()
    return Date.now() + this.ttlMs
  }

  get(sid, cb) {
    const entry = this.sessions.get(sid)
    if (!entry) return cb(null, null)
    if (entry.expires <= Date.now()) {
      this.sessions.delete(sid)
      this._scheduleWrite()
      return cb(null, null)
    }
    let data
    try {
      data = JSON.parse(entry.data)
    } catch {
      return cb(null, null)
    }
    return cb(null, data)
  }

  set(sid, sess, cb) {
    this.sessions.set(sid, {
      data: JSON.stringify(sess),
      expires: this._expiresFor(sess),
    })
    this._scheduleWrite()
    cb?.(null)
  }

  touch(sid, sess, cb) {
    const entry = this.sessions.get(sid)
    if (entry) {
      entry.expires = this._expiresFor(sess)
      this._scheduleWrite()
    }
    cb?.(null)
  }

  destroy(sid, cb) {
    this.sessions.delete(sid)
    this._scheduleWrite()
    cb?.(null)
  }

  clear(cb) {
    this.sessions.clear()
    this._scheduleWrite()
    cb?.(null)
  }

  length(cb) {
    cb(null, this.sessions.size)
  }
}
