import './loadEnv.js'
import { loadConfig, assertWritableDir } from './config.js'
import { createApp } from './app.js'
import { db, storeMode } from './db.js'

const config = loadConfig()

async function boot() {
  assertWritableDir(config.storageDir)
  const app = await createApp(config)

  const server = app.listen(config.port, () => {
    console.log(
      `SCROLLLAB API http://localhost:${config.port} store=${storeMode()} mpMock=${config.mpMock} env=${config.isProd ? 'production' : 'dev'}`,
    )
  })
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Puerto ${config.port} ocupado. Cerrá el otro npm run dev y volvé a intentar.`,
      )
    } else {
      console.error(err)
    }
    process.exit(1)
  })

  const shutdown = async (signal) => {
    console.log(`${signal} received — shutting down`)
    server.close(async () => {
      try {
        await db.disconnect()
      } catch (err) {
        console.error('disconnect error', err)
      }
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

boot().catch((err) => {
  console.error(err)
  process.exit(1)
})
