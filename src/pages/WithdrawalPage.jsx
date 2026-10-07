import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { REFUND_DAYS, SUPPORT_EMAIL } from '../lib/site'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { useI18n } from '../i18n'

const fill = (text) => String(text ?? '').replaceAll('{{days}}', String(REFUND_DAYS))

const field =
  'w-full border-2 border-ink/25 bg-transparent px-4 py-3 text-base transition-colors placeholder:text-ink/35 focus:border-ink focus:outline-none'
const label = 'mb-2 block text-[11px] uppercase tracking-[0.25em] text-ink/60'

/**
 * Botón de arrepentimiento (Resolución 424/2020): un formulario público, sin
 * cuenta, enlazado desde el home. Devuelve un código de seguimiento al
 * instante y lo manda por mail. Qué procede (y qué no) lo dice la Política de
 * reembolsos; el reembolso lo hace el dueño desde el panel de cada pasarela.
 */
export default function WithdrawalPage() {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [form, setForm] = useState({
    name: '',
    email: '',
    order: params.get('order') || '',
    message: '',
  })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [code, setCode] = useState('')

  // Con sesión, nombre y mail ya están: es el mail con el que se compró.
  useEffect(() => {
    if (!user) return
    setForm((f) => ({
      ...f,
      name: f.name || user.name || '',
      email: f.email || user.email || '',
    }))
  }, [user])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    setError('')
    try {
      const res = await api.requestWithdrawal({ ...form, locale })
      setCode(res.code)
      setStatus('done')
    } catch (err) {
      setError(err.message || t('withdrawal.error'))
      setStatus('idle')
    }
  }

  return (
    <div className="min-h-svh bg-bone px-5 py-10 text-ink md:px-10">
      <header className="mb-12 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink/15 pb-4">
        <Link
          to="/"
          className="text-[11px] uppercase tracking-[0.25em] text-ink/50 transition-colors hover:text-accent md:text-xs"
        >
          {t('common.backHome')}
        </Link>
        <p className="text-[11px] uppercase tracking-[0.25em] md:text-xs">
          {t('withdrawal.eyebrow')}
        </p>
      </header>

      <article className="mx-auto max-w-2xl">
        <h1 className="text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.02em]">
          {t('withdrawal.title')}
        </h1>
        <p className="mt-8 text-sm leading-relaxed text-ink/70 md:text-base">
          {fill(t('withdrawal.intro'))}
        </p>
        <ul className="mt-6 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/80 md:text-base">
          <li>{fill(t('withdrawal.ruleZip'))}</li>
          <li>{fill(t('withdrawal.ruleLab'))}</li>
        </ul>
        <p className="mt-4 text-sm md:text-base">
          <Link
            to="/legal/refunds"
            className="underline underline-offset-4 transition-colors hover:text-accent"
          >
            {t('account.refundPolicyLink')}
          </Link>
        </p>

        {status === 'done' ? (
          <section
            className="mt-12 border-2 border-ink p-6 md:p-8"
            aria-live="polite"
          >
            <p className={label}>{t('withdrawal.doneEyebrow')}</p>
            <p className="font-mono text-3xl tracking-[0.08em] md:text-4xl">{code}</p>
            <p className="mt-4 text-sm leading-relaxed text-ink/70 md:text-base">
              {t('withdrawal.doneBody', { email: form.email })}
            </p>
          </section>
        ) : (
          <form onSubmit={submit} className="mt-12 space-y-6" noValidate>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="wd-name" className={label}>
                  {t('withdrawal.name')}
                </label>
                <input
                  id="wd-name"
                  className={field}
                  value={form.name}
                  onChange={set('name')}
                  autoComplete="name"
                  required
                  maxLength={120}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="wd-email" className={label}>
                  {t('withdrawal.email')}
                </label>
                <input
                  id="wd-email"
                  type="email"
                  className={field}
                  value={form.email}
                  onChange={set('email')}
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </div>
            </div>
            <div>
              <label htmlFor="wd-order" className={label}>
                {t('withdrawal.order')}
              </label>
              <input
                id="wd-order"
                className={`${field} font-mono uppercase`}
                value={form.order}
                onChange={set('order')}
                placeholder="DEBE7390"
                maxLength={40}
                aria-describedby="wd-order-hint"
              />
              <p id="wd-order-hint" className="mt-2 text-xs leading-relaxed text-ink/55">
                {t('withdrawal.orderHint')}
              </p>
            </div>
            <div>
              <label htmlFor="wd-message" className={label}>
                {t('withdrawal.message')}
              </label>
              <textarea
                id="wd-message"
                rows={4}
                className={`${field} resize-y`}
                value={form.message}
                onChange={set('message')}
                maxLength={1000}
              />
            </div>
            {error && (
              <p className="text-sm text-warning" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="min-h-11 w-full border-2 border-ink bg-ink px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-bone transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-accent hover:bg-accent active:scale-[0.98] disabled:opacity-40 sm:w-auto"
            >
              {status === 'sending' ? t('withdrawal.sending') : t('withdrawal.submit')}
            </button>
          </form>
        )}

        <p className="mt-10 border-t border-ink/15 pt-6 text-xs text-ink/50">
          {t('withdrawal.contact')}{' '}
          <a className="hover:text-accent" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </article>
    </div>
  )
}
