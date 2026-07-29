import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '..', 'storage', 'db')

function ensure() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function read(name) {
  ensure()
  const p = path.join(DATA_DIR, `${name}.json`)
  if (!fs.existsSync(p)) return []
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function write(name, rows) {
  ensure()
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(rows, null, 2))
}

function nid() {
  return crypto.randomBytes(12).toString('hex')
}

function withSave(order) {
  if (!order) return null
  const doc = { ...order }
  doc.save = async function save() {
    const rows = read('orders')
    const idx = rows.findIndex((o) => o.id === doc.id)
    const { save: _ignored, ...rest } = doc
    const next = { ...rest, updatedAt: new Date().toISOString() }
    if (idx >= 0) rows[idx] = next
    else rows.push(next)
    write('orders', rows)
    Object.assign(doc, next)
    return doc
  }
  return doc
}

export const fileDb = {
  async findUser(query) {
    return (
      read('users').find((u) => {
        if (query.email) return u.email === query.email
        if (query.googleId) return u.googleId === query.googleId
        return false
      }) || null
    )
  },
  async findUserById(id) {
    return read('users').find((u) => u.id === String(id)) || null
  },
  async createUser(data) {
    const rows = read('users')
    const user = { id: nid(), ...data, createdAt: new Date().toISOString() }
    rows.push(user)
    write('users', rows)
    return user
  },
  async updateUser(user) {
    const rows = read('users')
    const idx = rows.findIndex((u) => u.id === user.id)
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...user }
      write('users', rows)
      return rows[idx]
    }
    return user
  },
  async createOrder(data) {
    const rows = read('orders')
    const order = {
      id: nid(),
      ...data,
      userId: String(data.userId),
      downloadCount: data.downloadCount || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    rows.push(order)
    write('orders', rows)
    return withSave(order)
  },
  async findOrderById(id) {
    return withSave(read('orders').find((o) => o.id === String(id)) || null)
  },
  async findOrdersByUser(userId) {
    return read('orders')
      .filter((o) => String(o.userId) === String(userId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(withSave)
  },
}
