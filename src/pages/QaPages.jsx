import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { startCheckout } from '../lib/startCheckout'
import { formatArs } from '../lib/pricing'
import {
  QA_TEMPLATE_SKU,
  QA_TEMPLATE_MODEL,
  QA_TEMPLATE_ARS,
  QA_BUILDER_BASE_ARS,
  QA_LAB_PRICES_ARS,
} from '../domain/qa'
import NotFoundPage from './NotFoundPage'
import BuilderPage from './BuilderPage'
import LabPage from './LabPage'

/**
 * Modo prueba (src/domain/qa.js): /test, /builder-test y /lab-test existen solo
 * para las cuentas de QA_BUYER_EMAILS (`user.qa` en /api/auth/me). Para
 * cualquier otra, o sin sesión, son la página 404. El servidor vuelve a
 * chequear la cuenta en cada compra: esto solo esconde la UI.
 */
function QaGate({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-svh bg-bone" />
  if (!user?.qa) return <NotFoundPage />
  return (
    <>
      {children}
      <QaBadge />
    </>
  )
}

/** Recordatorio fijo: acá se cobra de verdad. */
function QaBadge() {
  return (
    <div className="pointer-events-none fixed top-3 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-danger px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-white uppercase shadow-lg">
      Modo prueba · plata real
    </div>
  )
}

const FLOWS = [
  {
    title: 'Template',
    steps: [
      `Comprar el template de prueba (${formatArs(QA_TEMPLATE_ARS)}).`,
      'Llega «Tu compra en SCROLLLAB» y la orden aparece en Mis compras como «PRUEBA — …».',
      'Sin descargar: Mis compras → Pedir reembolso. Se devuelve solo y llega «Te devolvimos el dinero».',
      'Otra compra: descargar el ZIP y verificar que ya no ofrece el reembolso automático.',
    ],
  },
  {
    title: 'Builder',
    steps: [
      `Armar una composición en /builder-test (${formatArs(QA_BUILDER_BASE_ARS)}, cualquiera) y comprar.`,
      'Recibo, ZIP con las secciones elegidas y su LICENSE con tu orden.',
      'Arrepentimiento desde /arrepentimiento sin sesión: llega el mail para confirmar y el link devuelve la plata.',
    ],
  },
  {
    title: 'LAB',
    steps: [
      `Suscribirse en /lab-test (Starter ${formatArs(QA_LAB_PRICES_ARS.hosted_starter)}, Pro ${formatArs(QA_LAB_PRICES_ARS.hosted_pro)}, Studio ${formatArs(QA_LAB_PRICES_ARS.hosted_studio)}; sin prueba gratis): cobra al toque y llega la bienvenida con el importe.`,
      'Subir de plan: cobra la diferencia por los días que quedan (desde $1) y llega «Cambiaste a …». Bajar: no cobra nada.',
      'Cupo: publicar hasta el tope del plan; el siguiente se rechaza. Al bajar o cancelar, los de más dejan de verse.',
      'Con «prueba gratis» tildado: alta sin cobro; cancelar en la prueba no cobra nunca.',
      'Arrepentimiento dentro de los 14 días: devuelve el primer cobro, da de baja y llegan los dos mails.',
      'Otra alta: cancelar y verificar que mantiene el acceso hasta fin del período, sin devolución.',
    ],
  },
]

/** /test — el punto de partida del modo prueba. */
export function QaHubPage() {
  return (
    <QaGate>
      <QaHub />
    </QaGate>
  )
}

function QaHub() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const buyTemplate = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const result = await startCheckout({
        items: [{ sku: QA_TEMPLATE_SKU, title: `PRUEBA — ${QA_TEMPLATE_MODEL.toUpperCase()}` }],
        user,
        navigate,
        loginNext: '/test',
        provider: 'mercadopago',
      })
      if (result !== 'redirect') setBusy(false)
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar el pago de prueba')
      setBusy(false)
    }
  }

  return (
    <main className="min-h-svh bg-bone px-5 pt-24 pb-20 text-ink md:px-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-eyebrow uppercase text-danger">Modo prueba · solo {user?.email}</p>
        <h1 className="mt-4 text-[clamp(2.2rem,6vw,4rem)] leading-[0.95] font-medium tracking-[-0.03em]">
          Probar todo, con plata de verdad
        </h1>
        <p className="mt-5 max-w-[60ch] text-body text-ink/75">
          Mismo circuito que un cliente: Mercado Pago real, mails reales, reembolsos reales. Precios
          mínimos y solo para tu cuenta. Las compras quedan marcadas como prueba y fuera de las
          métricas.
        </p>

        <section className="mt-12 border border-ink/15 p-5 md:p-7">
          <p className="text-eyebrow uppercase text-ink/50">Template de prueba</p>
          <p className="mt-2 text-title-sm font-medium">
            {QA_TEMPLATE_MODEL.toUpperCase()} · {formatArs(QA_TEMPLATE_ARS)}
          </p>
          <p className="mt-1 text-body-sm text-ink/60">Entrega el ZIP real del modelo.</p>
          <button
            type="button"
            onClick={buyTemplate}
            disabled={busy}
            className="btn btn-primary mt-5 disabled:opacity-50"
          >
            {busy ? 'Yendo a Mercado Pago…' : `Comprar por ${formatArs(QA_TEMPLATE_ARS)} →`}
          </button>
          {error ? <p className="mt-3 text-body-sm text-danger">{error}</p> : null}
        </section>

        <nav className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link to="/builder-test" className="btn btn-ghost">Builder de prueba →</Link>
          <Link to="/lab-test#planes" className="btn btn-ghost">LAB de prueba →</Link>
          <Link to="/account" className="btn btn-ghost">Mis compras →</Link>
          <Link to="/arrepentimiento" className="btn btn-ghost">Botón de arrepentimiento →</Link>
        </nav>

        <section className="mt-14 space-y-10">
          {FLOWS.map((flow) => (
            <div key={flow.title}>
              <h2 className="text-title-sm font-medium">{flow.title}</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-body-sm text-ink/75">
                {flow.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}

/** /builder-test */
export function QaBuilderPage() {
  return (
    <QaGate>
      <BuilderPage qa />
    </QaGate>
  )
}

/** /lab-test */
export function QaLabPage() {
  return (
    <QaGate>
      <LabPage qa />
    </QaGate>
  )
}
