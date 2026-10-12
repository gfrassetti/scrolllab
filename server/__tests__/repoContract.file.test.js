import { describe, before, after } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { defineRepoContract } from './helpers/repoContract.js'

/**
 * Contrato de los repositorios contra el almacén de archivos (desarrollo).
 * El mismo contrato corre contra Mongo en repoContract.mongo.test.js.
 */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-contract-file-'))
process.env.NODE_ENV = 'development'
process.env.STORE = 'file'
process.env.FILE_DB_DIR = dir

const { db, connectDb } = await import('../db.js')
const { fileDb } = await import('../fileStore.js')

const finders = {
  order: (id) => fileDb.findOrderById(id),
  subscription: (id) => fileDb.findSubscriptionById(id),
  priceChangeNotice: (id) => fileDb.findPriceChangeNoticeById(id),
}

describe('contrato de repositorios — archivos', () => {
  before(async () => {
    await connectDb({ store: 'file' })
  })
  after(() => {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  defineRepoContract({
    db,
    async setRaw(entity, id, patch) {
      const row = await finders[entity](id)
      Object.assign(
        row,
        Object.fromEntries(
          Object.entries(patch).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]),
        ),
      )
      await row.save()
    },
  })
})
