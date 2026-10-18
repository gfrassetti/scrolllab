import './loadEnv.js'
import { loadConfig, assertWritableDir, authDiagnostics } from './config.js'
import { createApp } from './app.js'
import { db, storeMode } from './db.js'
import { startTrialReminders } from './services/trialReminders.js'
import { startPaymentFailedSweep } from './services/paymentFailedSweep.js'

const config = loadConfig()
const auth = authDiagnostics(config)

async function boot() {
  assertWritableDir(config.storageDir)
  const app = await createApp(config)

  const server = app.listen(config.port, () => {
    console.log(
      `SCROLLLAB API http://localhost:${config.port} store=${storeMode()} mpMock=${config.mpMock} env=${config.isProd ? 'production' : 'dev'}`,
    )
    console.log(
      `Auth ${auth.mode} client=${auth.clientHost} api=${auth.apiHost} callback=${auth.callbackHost} loginOk=${auth.loginLikelyOk}`,
    )
    if (!auth.loginLikelyOk) console.warn(`Auth hint: ${auth.hint}`)
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

  // Los barridos (mails de pago rechazado, avisos de prueba, devoluciones que
  // esperan, cambios de precio) corren solo en producción. Un servidor local suele
  // apuntar a la base de producción (el .env, para ver el panel /admin): ahí
  // mandaría mails o tocaría pagos reales con la config local. RUN_SWEEPS=1 los
  // prende a propósito en desarrollo.
  const sweeps = config.isProd || process.env.RUN_SWEEPS === '1'
  if (!sweeps) console.log('Barridos apagados (desarrollo). RUN_SWEEPS=1 los prende.')
  const stopTrialReminders = sweeps ? startTrialReminders({ config }) : () => {}
  const stopPaymentFailedSweep = sweeps ? startPaymentFailedSweep({ config }) : () => {}
  if (config.email.enabled && config.hostedTrialReminderDays > 0) {
    console.log(
      `Aviso de fin de prueba (LAB): ${config.hostedTrialReminderDays} días antes del primer cobro`,
    )
  }

  const shutdown = async (signal) => {
    console.log(`${signal} received — shutting down`)
    stopTrialReminders()
    stopPaymentFailedSweep()
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
