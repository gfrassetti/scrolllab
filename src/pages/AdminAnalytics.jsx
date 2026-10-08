import { useCallback, useEffect, useState } from 'react'

/**
 * Panel privado de métricas (solo en tu máquina).
 *
 * - La ruta /admin existe únicamente con `npm run dev` (App.jsx) y el endpoint
 *   /api/admin/analytics responde solo a localhost y nunca en producción.
 * - Muestra lo que tenga la base a la que apunta tu servidor local: con
 *   STORE=file solo tus propios clics de prueba; con MONGODB_URI de producción
 *   en tu .env, los datos reales de los visitantes.
 */

const RANGES = [7, 30, 90]
const nf = new Intl.NumberFormat('es-AR')
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1).replace('.', ',')}%` : '—')
// USD con centavos si los hay (Paddle cobra con centavos); pesos sin.
const money = (n, cur) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: cur === 'USD' ? 'USD' : 'ARS',
    maximumFractionDigits: cur === 'USD' && !Number.isInteger(Number(n)) ? 2 : 0,
  }).format(n)
const moneyList = (rows) => (rows?.length ? rows.map((r) => money(r.total, r.currency)).join(' + ') : '—')
const gateway = (p) => (p === 'paddle' ? 'Paddle' : 'Mercado Pago')
const day = (iso) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—')
const when = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—'

function Stat({ label, value, hint }) {
  return (
    <div className="border border-ink/15 bg-white/50 p-5">
      <p className="text-[11px] tracking-[0.2em] text-ink/50 uppercase">{label}</p>
      <p className="mt-2 font-brico text-4xl leading-none font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-2 text-xs text-ink/50">{hint}</p> : null}
    </div>
  )
}

function Bars({ rows, a, b, labelA, labelB }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r[a] || 0, b ? r[b] || 0 : 0)))
  const w = 100 / rows.length
  return (
    <div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label={`${labelA}${labelB ? ` y ${labelB}` : ''} por día`}>
        {rows.map((r, i) => {
          const ha = ((r[a] || 0) / max) * 38
          const hb = b ? ((r[b] || 0) / max) * 38 : 0
          return (
            <g key={r.day}>
              {b ? <rect x={i * w + w * 0.1} y={40 - hb} width={w * 0.38} height={hb} className="fill-ink/20" /> : null}
              <rect
                x={b ? i * w + w * 0.5 : i * w + w * 0.15}
                y={40 - ha}
                width={b ? w * 0.38 : w * 0.7}
                height={ha}
                className="fill-ink"
              >
                <title>{`${r.day}: ${r[a] || 0} ${labelA}${b ? ` · ${r[b] || 0} ${labelB}` : ''}`}</title>
              </rect>
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-ink/45">
        <span>{rows[0]?.day}</span>
        <span>{rows.at(-1)?.day}</span>
      </div>
    </div>
  )
}

function Table({ head, rows, empty = 'Todavía no hay datos.' }) {
  return (
    <div className="overflow-x-auto border border-ink/15 bg-white/50">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead>
          <tr className="border-b border-ink/15 text-[11px] tracking-[0.15em] text-ink/50 uppercase">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((cells, i) => (
              <tr key={i} className="border-b border-ink/10 last:border-0">
                {cells.map((c, j) => (
                  <td key={j} className="px-4 py-2.5 align-top">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={head.length} className="px-4 py-6 text-ink/45">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(res.status === 404 ? 'El servidor local no respondió (¿está corriendo `npm run dev`?)' : `Error ${res.status}`)
      setData(await res.json())
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    setLoading(true)
    load()
    const t = window.setInterval(load, 15000)
    return () => window.clearInterval(t)
  }, [load])

  useEffect(() => {
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex,nofollow'
    document.head.appendChild(robots)
    return () => robots.remove()
  }, [])

  return (
    <main className="min-h-svh bg-bone px-5 py-10 text-ink md:px-12">
      <header className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.25em] text-ink/50 uppercase">Solo en tu máquina</p>
          <h1 className="mt-2 font-brico text-4xl font-semibold tracking-tight md:text-5xl">Métricas</h1>
          {data ? (
            <p className="mt-2 text-xs text-ink/55">
              Base: {data.store === 'file' ? 'archivos locales (storage/db)' : `MongoDB${data.dbHost ? ` · ${data.dbHost}` : ''}`} · actualizado {when(data.generatedAt)} · se refresca solo cada 15 s
            </p>
          ) : null}
        </div>
        <div className="flex gap-2" role="group" aria-label="Rango de días">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              aria-pressed={days === r}
              className={`border px-4 py-2 text-xs tracking-[0.15em] uppercase transition-colors ${
                days === r ? 'border-ink bg-ink text-bone' : 'border-ink/25 hover:border-ink'
              }`}
            >
              {r} días
            </button>
          ))}
        </div>
      </header>

      {data && data.store !== 'mongo' ? (
        <p role="alert" className="mx-auto mt-8 max-w-6xl border-2 border-accent bg-accent/10 p-4 text-sm font-medium">
          ATENCIÓN: estás viendo datos LOCALES de prueba, no los de producción. Las métricas tienen que salir de la base real:
          poné STORE=mongo y el MONGODB_URI de producción en tu .env y reiniciá `npm run dev`.
        </p>
      ) : null}
      {error ? <p className="mx-auto mt-8 max-w-6xl border border-accent p-4 text-sm">{error}</p> : null}
      {loading && !data ? <p className="mx-auto mt-8 max-w-6xl text-sm text-ink/55">Cargando…</p> : null}

      {data?.money?.refunds.last7Count ? (
        <p role="alert" className="mx-auto mt-8 max-w-6xl border-2 border-danger bg-danger/10 p-4 text-sm font-medium">
          {data.money.refunds.last7Count === 1 ? 'Hubo 1 reembolso' : `Hubo ${data.money.refunds.last7Count} reembolsos`} en los últimos 7 días:{' '}
          {data.money.refunds.rows
            .slice(0, data.money.refunds.last7Count)
            .map((r) => `${r.email || 'sin mail'} · ${money(r.amount, r.currency)}${r.partial ? ' (parcial)' : ''}`)
            .join(' · ')}
          . El detalle está en «Reembolsos».
        </p>
      ) : null}
      {data?.money?.withdrawals.open ? (
        <p role="alert" className="mx-auto mt-4 max-w-6xl border-2 border-accent bg-accent/10 p-4 text-sm font-medium">
          {data.money.withdrawals.open === 1
            ? 'Hay 1 solicitud de arrepentimiento sin reembolsar.'
            : `Hay ${data.money.withdrawals.open} solicitudes de arrepentimiento sin reembolsar.`}{' '}
          Revisalas en «Arrepentimiento» y reembolsá desde el panel de la pasarela.
        </p>
      ) : null}

      {data ? (
        <div className="mx-auto mt-10 max-w-6xl space-y-12">
          {data.money ? (
            <>
              <section aria-labelledby="h-plata">
                <h2 id="h-plata" className="mb-4 text-xs tracking-[0.2em] uppercase">Plata: qué podés retirar</h2>
                <div className="grid gap-3 md:grid-cols-3">
                  <Stat
                    label="No tocar todavía"
                    value={moneyList(data.money.locked.total)}
                    hint={`se puede reembolsar: compras sin descargar y cobros de LAB de los últimos ${data.money.refundDays} días`}
                  />
                  <Stat
                    label="Libre"
                    value={moneyList(data.money.free)}
                    hint="compras ya descargadas o fuera de plazo (de siempre, ya descontados los reembolsos)"
                  />
                  <Stat
                    label="Reembolsado"
                    value={moneyList(data.money.refunds.total)}
                    hint={`de siempre · últimos 30 días: ${moneyList(data.money.refunds.last30)}`}
                  />
                </div>
                <p className="mt-2 text-xs text-ink/45">
                  Montos brutos, antes de la comisión. Mercado Pago ya retiene cada venta 18 días; Paddle paga una vez por mes. Lo de «No tocar» es lo que tiene que quedar en la cuenta por si piden la devolución.
                </p>
                <div className="mt-4">
                  <Table
                    head={['Quién', 'Monto', 'Qué', 'Pasarela', 'No tocar hasta', 'Por qué']}
                    rows={data.money.locked.rows.map((r) => [
                      r.email || '—',
                      <strong key="m" className="font-medium">{money(r.amount, r.currency)}</strong>,
                      r.what || '—',
                      gateway(r.provider),
                      day(r.until),
                      <span key="w" className="text-ink/60">{r.why}</span>,
                    ])}
                    empty="Nada en plazo de reembolso: todo lo cobrado se puede retirar."
                  />
                </div>
              </section>

              <section aria-labelledby="h-reemb">
                <h2 id="h-reemb" className="mb-4 text-xs tracking-[0.2em] uppercase">Reembolsos</h2>
                <Table
                  head={['Fecha', 'Quién', 'Monto', 'Qué', 'Pasarela', 'Tipo']}
                  rows={data.money.refunds.rows.map((r) => [
                    when(r.when),
                    r.email || '—',
                    <strong key="m" className="font-medium">{money(r.amount, r.currency)}</strong>,
                    r.what || '—',
                    gateway(r.provider),
                    r.reason === 'charged_back' ? 'contracargo' : r.partial ? 'parcial' : 'total',
                  ])}
                  empty="Ningún reembolso todavía."
                />
              </section>

              <section aria-labelledby="h-arrep">
                <h2 id="h-arrep" className="mb-4 text-xs tracking-[0.2em] uppercase">Arrepentimiento (botón)</h2>
                <Table
                  head={['Fecha', 'Código', 'Quién', 'Qué', 'Monto', 'Qué hacer']}
                  rows={data.money.withdrawals.rows.map((w) => [
                    when(w.when),
                    <code key="c" className="font-mono text-xs">{w.code}</code>,
                    <span key="q">{w.name ? `${w.name} · ` : ''}{w.email}</span>,
                    w.what,
                    w.amount != null ? money(w.amount, w.currency) : '—',
                    <strong key="v" className={`font-medium ${w.open && /ELEGIBLE/.test(w.verdict) ? 'text-danger' : ''}`}>{w.verdict}</strong>,
                  ])}
                  empty="Ninguna solicitud todavía."
                />
              </section>
            </>
          ) : null}

          <section aria-labelledby="h-sitio">
            <h2 id="h-sitio" className="mb-4 text-xs tracking-[0.2em] uppercase">Tráfico y clics · últimos {data.days} días</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Clics" value={nf.format(data.totals.clicks)} />
              <Stat label="Vistas de página" value={nf.format(data.totals.views)} />
              <Stat label="Visitantes únicos" value={nf.format(data.totals.visitors)} hint="por navegador, anónimo" />
              <Stat label="Clics por vista" value={data.totals.views ? (data.totals.clicks / data.totals.views).toFixed(2).replace('.', ',') : '—'} />
            </div>
            <div className="mt-4 border border-ink/15 bg-white/50 p-5">
              <p className="mb-3 text-[11px] tracking-[0.15em] text-ink/50 uppercase">
                Por día — <span className="text-ink">clics</span> / <span className="text-ink/40">vistas</span>
              </p>
              <Bars rows={data.byDay} a="clicks" b="views" labelA="clics" labelB="vistas" />
            </div>
          </section>

          <section aria-labelledby="h-tpl">
            <h2 id="h-tpl" className="mb-4 text-xs tracking-[0.2em] uppercase">Por template</h2>
            <Table
              head={['Template', 'Vistas', 'Clics', 'Visitantes', 'Clics/vista', 'Compras', 'Botones más tocados']}
              rows={data.byTemplate.map((t) => [
                <strong key="s" className="font-medium">{t.sku}</strong>,
                nf.format(t.views),
                nf.format(t.clicks),
                nf.format(t.visitors),
                pct(t.clicks, t.views),
                t.paid ? nf.format(t.paid) : '—',
                <span key="l" className="text-ink/70">
                  {t.topLabels.map((l) => `${l.key} (${l.count})`).join(' · ') || '—'}
                </span>,
              ])}
              empty="Todavía no hay clics. Navegá el sitio en otra pestaña y volvé acá."
            />
            <p className="mt-2 text-xs text-ink/45">
              "(sitio)" son los clics que no pertenecen a un template (menú, header, builder, cuenta…). Las vistas de la home cuentan acá.
            </p>
          </section>

          <section aria-labelledby="h-top">
            <h2 id="h-top" className="mb-4 text-xs tracking-[0.2em] uppercase">Los 15 botones más tocados</h2>
            <Table
              head={['Botón', 'Clics']}
              rows={data.topClicks.map((r) => [r.key, nf.format(r.count)])}
            />
          </section>

          <section aria-labelledby="h-users">
            <h2 id="h-users" className="mb-4 text-xs tracking-[0.2em] uppercase">Usuarios dados de alta</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Total" value={nf.format(data.users.total)} />
              <Stat label="Últimos 7 días" value={nf.format(data.users.last7)} />
              <Stat label="Últimos 30 días" value={nf.format(data.users.last30)} />
              <Stat
                label="Cupones de bienvenida"
                value={nf.format(data.leads.total)}
                hint={`${nf.format(data.leads.redeemed)} canjeados (${pct(data.leads.redeemed, data.leads.total)})`}
              />
            </div>
            <div className="mt-4 border border-ink/15 bg-white/50 p-5">
              <p className="mb-3 text-[11px] tracking-[0.15em] text-ink/50 uppercase">Altas por día</p>
              <Bars rows={data.users.byDay} a="count" labelA="altas" />
            </div>
            <div className="mt-4">
              <Table
                head={['Nombre', 'Email', 'Alta']}
                rows={data.users.recent.map((u) => [u.name || '—', u.email, when(u.createdAt)])}
              />
            </div>
          </section>

          {data.lab ? (
            <section aria-labelledby="h-lab">
              <h2 id="h-lab" className="mb-4 text-xs tracking-[0.2em] uppercase">LAB — de la visita al cobro</h2>
              <Table
                head={['Paso', 'Cuántos', 'Del paso anterior']}
                rows={data.lab.funnel.map((f) => [
                  f.step,
                  `${nf.format(f.count)} ${f.count === 1 ? f.unit.replace(/s$/, '') : f.unit}`,
                  f.pctOfPrev == null ? '—' : `${f.pctOfPrev}%`,
                ])}
              />
              <p className="mt-2 text-xs text-ink/50">
                En el rango elegido. Las visitas son anónimas (por navegador) y no se cruzan con las cuentas: el primer paso
                es tráfico, no el denominador exacto del segundo.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="En prueba ahora" value={nf.format(data.lab.subscriptions.inTrial)} hint={`${nf.format(data.lab.subscriptions.trialsEndingSoon)} terminan en 7 días`} />
                <Stat label="Pagando ahora" value={nf.format(data.lab.subscriptions.paying)} />
                <Stat label="Bajas" value={nf.format(data.lab.subscriptions.cancelledInWindow)} hint="en el rango" />
                <Stat label="Widgets publicados" value={nf.format(data.lab.widgets.publishedNow)} hint={`${nf.format(data.lab.widgets.embedViews)} vistas de embed`} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Table
                  head={['Plan pago', 'Suscripciones']}
                  rows={Object.entries(data.lab.subscriptions.byPlan).map(([k, v]) => [k, nf.format(v)])}
                />
                <Table
                  head={['Widget más publicado', 'Publicados']}
                  rows={data.lab.widgets.topSections.map((r) => [r.sectionId, nf.format(r.count)])}
                />
              </div>
            </section>
          ) : null}

          <section aria-labelledby="h-ord">
            <h2 id="h-ord" className="mb-4 text-xs tracking-[0.2em] uppercase">Compras</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Órdenes" value={nf.format(data.orders.total)} />
              <Stat label="Pagadas" value={nf.format(data.orders.paid)} />
              <Stat label="Pendientes" value={nf.format(data.orders.pending)} />
              <Stat
                label="Facturado"
                value={data.orders.revenue.length ? data.orders.revenue.map((r) => money(r.total, r.currency)).join(' + ') : '—'}
                hint="solo órdenes pagadas, de siempre"
              />
            </div>
            <div className="mt-4">
              <Table
                head={['Estado', 'Total', 'Templates', 'Fecha']}
                rows={data.orders.recent.map((o) => [o.status, o.total != null ? money(o.total, o.currency) : '—', o.items.join(', ') || '—', when(o.createdAt)])}
              />
            </div>
          </section>

          <section aria-labelledby="h-chan">
            <h2 id="h-chan" className="mb-4 text-xs tracking-[0.2em] uppercase">Cupones por canal (utm)</h2>
            <Table
              head={['Canal', 'Mails', 'Canjeados']}
              rows={data.leads.byChannel.map((c) => [c.key, nf.format(c.leads), nf.format(c.redeemed)])}
            />
          </section>
        </div>
      ) : null}
    </main>
  )
}
