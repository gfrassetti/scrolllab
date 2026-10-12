import { describe, before, after } from 'node:test'
import mongoose from 'mongoose'

import { defineRepoContract } from './helpers/repoContract.js'
import { startTestMongo } from './helpers/mongo.js'

/**
 * Contrato de los repositorios contra un Mongo REAL (producción corre en Mongo).
 * Los tests de «Mongo» que había solo validaban esquemas sin conectarse: las
 * consultas, los índices únicos y las transiciones atómicas no las ejercitaba
 * nadie. El mismo contrato corre contra el almacén de archivos en
 * repoContract.file.test.js.
 *
 * Mongo sale de MONGODB_TEST_URI (CI) o de un `mongod` local; sin ninguno, se
 * saltea (con REQUIRE_MONGO=1 es un error). Ver helpers/mongo.js.
 */
const mongo = await startTestMongo()

process.env.NODE_ENV = 'development'
process.env.STORE = 'mongo'
if (mongo) process.env.MONGODB_URI = mongo.uri

const { db, connectDb } = await import('../db.js')
const models = await import('../models.js')

const modelOf = {
  order: models.Order,
  subscription: models.Subscription,
  priceChangeNotice: models.PriceChangeNotice,
}

describe('contrato de repositorios — Mongo', { skip: mongo ? false : 'sin Mongo: definí MONGODB_TEST_URI o MONGOD_BIN' }, () => {
  before(async () => {
    await connectDb({ store: 'mongo', mongoUri: mongo.uri })
    // Los índices únicos se crean en segundo plano al conectar: esperarlos.
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()))
  })

  after(async () => {
    try {
      if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase()
    } catch {
      /* ignore */
    }
    await db.disconnect()
    await mongo?.stop()
  })

  defineRepoContract({
    db,
    async setRaw(entity, id, patch) {
      await modelOf[entity].updateOne({ _id: id }, { $set: patch })
    },
  })
})
