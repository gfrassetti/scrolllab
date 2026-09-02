import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Sin escritura atómica, dos procesos sobre el mismo JSON se pisan: cada suite
// de tests que use STORE=file necesita su propio directorio.
const DATA_DIR = path.resolve(
  process.env.FILE_DB_DIR || path.join(__dirname, '..', 'storage', 'db'),
)

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

/** Envuelve un row con `.save()` que reescribe su fila en `<name>.json`. */
function withSaveDoc(name, row) {
  if (!row) return null
  const doc = { ...row }
  doc.save = async function save() {
    const rows = read(name)
    const idx = rows.findIndex((o) => o.id === doc.id)
    const { save: _ignored, ...rest } = doc
    const next = { ...rest, updatedAt: new Date().toISOString() }
    if (idx >= 0) rows[idx] = next
    else rows.push(next)
    write(name, rows)
    Object.assign(doc, next)
    return doc
  }
  return doc
}

function withSave(order) {
  return withSaveDoc('orders', order)
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
      downloads: data.downloads || [],
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

  async createHostedInstance(data) {
    const rows = read('hosted')
    const now = new Date().toISOString()
    const inst = {
      id: nid(),
      status: 'draft',
      domains: [],
      ...data,
      userId: String(data.userId),
      createdAt: now,
      updatedAt: now,
    }
    rows.push(inst)
    write('hosted', rows)
    return withSaveDoc('hosted', inst)
  },
  async findHostedInstanceById(id) {
    return withSaveDoc(
      'hosted',
      read('hosted').find((h) => h.id === String(id)) || null,
    )
  },
  async findHostedInstanceByKey(key) {
    return withSaveDoc(
      'hosted',
      read('hosted').find((h) => h.key === String(key)) || null,
    )
  },
  async findHostedInstancesByUser(userId) {
    return read('hosted')
      .filter((h) => String(h.userId) === String(userId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((h) => withSaveDoc('hosted', h))
  },
  async deleteHostedInstance(id) {
    const rows = read('hosted')
    const idx = rows.findIndex((h) => h.id === String(id))
    if (idx < 0) return false
    rows.splice(idx, 1)
    write('hosted', rows)
    return true
  },
  async countPublishedHosted(userId, exceptId) {
    return read('hosted').filter(
      (h) =>
        String(h.userId) === String(userId) &&
        h.status === 'published' &&
        h.id !== String(exceptId),
    ).length
  },
  async countPublishedHostedCreatedBefore(userId, createdAt, exceptId) {
    const t = new Date(createdAt).getTime()
    const eid = String(exceptId)
    // Desempate por id cuando el createdAt coincide al ms — así el orden es
    // total y determinista (si no, dos instancias del mismo ms no se cuentan
    // entre sí y ambas quedarían "dentro de cuota").
    return read('hosted').filter((h) => {
      if (String(h.userId) !== String(userId)) return false
      if (h.status !== 'published') return false
      if (h.id === eid) return false
      const ht = new Date(h.createdAt).getTime()
      return ht < t || (ht === t && String(h.id) < eid)
    }).length
  },

  async createSubscription(data) {
    const rows = read('subscriptions')
    const now = new Date().toISOString()
    const sub = {
      id: nid(),
      status: 'pending',
      ...data,
      userId: String(data.userId),
      createdAt: now,
      updatedAt: now,
    }
    rows.push(sub)
    write('subscriptions', rows)
    return withSaveDoc('subscriptions', sub)
  },
  async findSubscriptionById(id) {
    return withSaveDoc(
      'subscriptions',
      read('subscriptions').find((s) => s.id === String(id)) || null,
    )
  },
  async findSubscriptionByPreapproval(preapprovalId) {
    return withSaveDoc(
      'subscriptions',
      read('subscriptions').find(
        (s) => s.mpPreapprovalId === String(preapprovalId),
      ) || null,
    )
  },
  async findActiveSubscriptionByUser(userId) {
    return (
      read('subscriptions')
        .filter(
          (s) =>
            String(s.userId) === String(userId) && s.status === 'authorized',
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((s) => withSaveDoc('subscriptions', s))[0] || null
    )
  },
  async findSubscriptionsByUser(userId) {
    return read('subscriptions')
      .filter((s) => String(s.userId) === String(userId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((s) => withSaveDoc('subscriptions', s))
  },
  async deleteSubscription(id) {
    const rows = read('subscriptions')
    const idx = rows.findIndex((s) => s.id === String(id))
    if (idx < 0) return false
    rows.splice(idx, 1)
    write('subscriptions', rows)
    return true
  },
}
