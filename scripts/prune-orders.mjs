/**
 * Borra órdenes que nunca se pagaron.
 *
 * Existen porque el checkout crea la orden al abrirse, no al cobrar: cada
 * intento abandonado (o cada prueba) queda en Mis compras. Las nuevas caducan
 * solas por TTL; esto es para las que ya se acumularon.
 *
 * Nunca toca una orden `paid`, y sin `--apply` no borra nada: solo lista.
 *
 * Uso:
 *   node scripts/prune-orders.mjs --email vos@ejemplo.com
 *   node scripts/prune-orders.mjs --email vos@ejemplo.com --apply
 *   node scripts/prune-orders.mjs --all-pending --older-than-hours 24 --apply
 *
 * Apuntá MONGODB_URI a la base que querés limpiar (por defecto sale del .env).
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'

import { User, Order } from '../server/models.js'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILE_DB = path.resolve(
  process.env.FILE_DB_DIR || path.join(REPO, 'storage', 'db'),
)

function parseArgs(argv) {
  const args = { apply: false, allPending: false, email: '', olderThanHours: 0 }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--apply') args.apply = true
    else if (arg === '--all-pending') args.allPending = true
    else if (arg === '--email') args.email = String(argv[++i] || '').trim()
    else if (arg === '--older-than-hours') {
      args.olderThanHours = Number(argv[++i] || 0)
    } else {
      throw new Error(`Argumento desconocido: ${arg}`)
    }
  }
  if (!args.email && !args.allPending) {
    throw new Error('Falta --email <cuenta> (o --all-pending para todas)')
  }
  if (!Number.isFinite(args.olderThanHours) || args.olderThanHours < 0) {
    throw new Error('--older-than-hours espera un número de horas')
  }
  return args
}

const fmtArs = (n) =>
  Number.isFinite(n) ? `${Math.round(n).toLocaleString('es-AR')} ARS` : '—'

function describe(order) {
  const id = order.id || order._id
  const date = new Date(order.createdAt).toLocaleString('es-AR')
  const titles = (order.items || []).map((i) => i.title || i.sku).join(', ')
  return `  ${id}  ${date}  ${fmtArs(order.total)}  ${titles}`
}

function report(rows, args) {
  if (!rows.length) {
    console.log('No hay órdenes pendientes que coincidan. Nada para borrar.')
    return
  }
  console.log(`\n${rows.length} orden(es) pendiente(s):\n`)
  for (const row of rows) console.log(describe(row))
  if (!args.apply) {
    console.log('\nCorrida en seco. Volvé a correrlo con --apply para borrarlas.')
  }
}

/** Store JSON de desarrollo (STORE=file). */
async function pruneFileStore(args) {
  const ordersPath = path.join(FILE_DB, 'orders.json')
  if (!fs.existsSync(ordersPath)) {
    console.log(`No existe ${ordersPath}. Nada para limpiar.`)
    return
  }
  const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'))

  let userIds = null
  if (args.email) {
    const usersPath = path.join(FILE_DB, 'users.json')
    const users = fs.existsSync(usersPath)
      ? JSON.parse(fs.readFileSync(usersPath, 'utf8'))
      : []
    const user = users.find((u) => u.email === args.email)
    if (!user) throw new Error(`No hay cuenta con el email ${args.email}`)
    userIds = new Set([String(user.id)])
  }

  const cutoff = args.olderThanHours
    ? Date.now() - args.olderThanHours * 3600_000
    : null
  const doomed = orders.filter(
    (o) =>
      o.status === 'pending' &&
      (!userIds || userIds.has(String(o.userId))) &&
      (!cutoff || new Date(o.createdAt).getTime() < cutoff),
  )

  report(doomed, args)
  if (!args.apply || !doomed.length) return

  const ids = new Set(doomed.map((o) => String(o.id)))
  const kept = orders.filter((o) => !ids.has(String(o.id)))
  fs.writeFileSync(ordersPath, JSON.stringify(kept, null, 2))
  console.log(`\n✓ Borradas ${doomed.length} de ${ordersPath}`)
}

async function pruneMongo(args) {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error(
      'Falta MONGODB_URI. Poné la de la base a limpiar (o usá STORE=file para la local).',
    )
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  console.log(`Conectado a ${uri.replace(/\/\/[^@]*@/, '//***@')}`)

  try {
    const filter = { status: 'pending' }
    if (args.email) {
      const user = await User.findOne({ email: args.email })
      if (!user) throw new Error(`No hay cuenta con el email ${args.email}`)
      filter.userId = user._id
      console.log(`Cuenta: ${user.email} (${user._id})`)
    }
    if (args.olderThanHours) {
      filter.createdAt = {
        $lt: new Date(Date.now() - args.olderThanHours * 3600_000),
      }
    }

    const doomed = await Order.find(filter).sort({ createdAt: -1 }).lean()
    report(doomed, args)
    if (!args.apply || !doomed.length) return

    const result = await Order.deleteMany({
      _id: { $in: doomed.map((o) => o._id) },
      status: 'pending',
    })
    console.log(`\n✓ Borradas ${result.deletedCount} órdenes pendientes`)
  } finally {
    await mongoose.disconnect()
  }
}

try {
  const args = parseArgs(process.argv.slice(2))
  if (process.env.STORE === 'file') await pruneFileStore(args)
  else await pruneMongo(args)
} catch (err) {
  console.error(`\n✖ ${err.message}`)
  process.exit(1)
}
