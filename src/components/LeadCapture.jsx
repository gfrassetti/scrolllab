import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { LIMITS, isValidEmail, sanitizePlainText } from '../lib/contactForm'
import { formatCouponDate, saveCoupon } from '../lib/coupon'
import { trackLead } from '../lib/gtm'
import { submitLead } from '../lib/leads'
import { WELCOME_COUPON_PERCENT } from '../lib/pricing'
import { loadUtm } from '../lib/utm'

const ERROR_KEYS = {
  invalid: 'home.leadErrEmail',
  rate: 'home.leadErrRate',
  network: 'home.leadErrNetwork',
}

/** Ese mail ya tenía cupón pero no se puede volver a usar. */
const STATUS_KEYS = {
  redeemed: 'home.leadUsed',
  expired: 'home.leadExpired',
}

const ctaClass =
  'inline-block border border-ink bg-ink px-8 py-3.5 text-xs font-medium tracking-[0.22em] text-bone uppercase transition-colors hover:border-accent hover:bg-accent hover:text-ink md:text-[13px]'

/**
 * Cupón de bienvenida: quien no compra hoy deja su mail y se lleva un cupón.
 * Sin newsletter: el único mail es el cupón. `source` dice desde dónde se anotó
 * (home, builder…) y viaja al servidor y al evento de GTM.
 */
export default function LeadCapture({ source = 'home' }) {
  const { t, locale } = useI18n()
  const uid = useId()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { coupon, status, emailed }
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef(null)

  const sending = status === 'sending'

  const onChange = (e) => {
    setEmail(sanitizePlainText(e.target.value, LIMITS.email))
    if (status === 'error') setStatus('idle')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (sending) return
    const clean = sanitizePlainText(email, LIMITS.email).toLowerCase()
    if (!isValidEmail(clean)) {
      setStatus('error')
      setError(t(ERROR_KEYS.invalid))
      return
    }

    setStatus('sending')
    setError('')
    try {
      const data = await submitLead({
        email: clean,
        source,
        locale,
        website: e.currentTarget.elements.website?.value || '',
        utm: loadUtm(),
      })
      trackLead({ source })
      // Queda guardado para que el carrito lo aplique solo.
      if (data?.coupon) saveCoupon(data.coupon)
      setResult({
        coupon: data?.coupon || null,
        status: data?.couponStatus || 'none',
        emailed: Boolean(data?.emailed),
        email: clean,
      })
      setEmail('')
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(t(ERROR_KEYS[err?.kind] || 'home.leadErrGeneric'))
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(result.coupon.code)
      setCopied(true)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      /* sin permiso de portapapeles: el código está a la vista */
    }
  }

  return (
    <section
      id="cupon"
      aria-labelledby={`${uid}-title`}
      className="scroll-mt-16 border-t border-ink/15 bg-bone px-5 py-14 text-ink md:px-10 md:py-20"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-12 md:items-end md:gap-16">
        <div className="md:col-span-6">
          <p className="text-xs uppercase tracking-[0.28em] text-accent md:text-sm">
            {t('home.leadEyebrow')}
          </p>
          <h2
            id={`${uid}-title`}
            className="mt-3 max-w-[18ch] text-[clamp(1.9rem,4.4vw,3.25rem)] leading-[1] font-medium tracking-tight"
          >
            {t('home.leadTitle', { percent: WELCOME_COUPON_PERCENT })}
          </h2>
          <p className="mt-4 max-w-[44ch] text-base leading-relaxed text-ink/65 md:text-lg">
            {t('home.leadBody')}
          </p>
        </div>

        <div className="md:col-span-6">
          {status === 'done' ? (
            <div role="status">
              {result?.coupon ? (
                <>
                  <p className="text-xs uppercase tracking-[0.25em] text-ink/50 md:text-[13px]">
                    {t('home.leadCouponEyebrow')}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <p
                      data-coupon-code
                      className="border-2 border-dashed border-ink px-5 py-3 font-mono text-2xl font-bold tracking-[0.18em] md:text-3xl"
                    >
                      {result.coupon.code}
                    </p>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="text-[11px] uppercase tracking-[0.22em] text-ink/60 underline underline-offset-4 transition-colors hover:text-accent"
                    >
                      {copied ? t('home.leadCouponCopied') : t('home.leadCouponCopy')}
                    </button>
                  </div>
                  <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-ink/70 md:text-lg">
                    {t('home.leadCouponBody', {
                      percent: result.coupon.percent,
                      date: formatCouponDate(result.coupon.expiresAt, locale),
                    })}
                  </p>
                  <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-ink/60">
                    {t('home.leadCouponBound', { email: result.email })}
                  </p>
                  {result.emailed ? (
                    <p className="mt-1 text-sm text-ink/50">{t('home.leadCouponEmailed')}</p>
                  ) : null}
                  <Link to="/#templates" className={`${ctaClass} mt-6`}>
                    {t('home.leadCouponCta')}
                  </Link>
                </>
              ) : (
                <p className="text-xl font-medium text-accent md:text-2xl">
                  {t(STATUS_KEYS[result?.status] || 'home.leadSuccess')}
                </p>
              )}
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit} aria-busy={sending} className="relative">
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute h-0 w-0 overflow-hidden opacity-0"
              />

              <label
                htmlFor={`${uid}-email`}
                className="text-xs uppercase tracking-[0.25em] text-ink/50 md:text-[13px]"
              >
                {t('home.leadLabel')}
              </label>
              <div className="mt-1 flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-6">
                <input
                  id={`${uid}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={LIMITS.email}
                  placeholder={t('home.leadPlaceholder')}
                  value={email}
                  onChange={onChange}
                  disabled={sending}
                  aria-invalid={status === 'error' ? 'true' : undefined}
                  aria-describedby={status === 'error' ? `${uid}-err` : undefined}
                  className="w-full border-0 border-b border-ink/25 bg-transparent px-0 py-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-accent disabled:opacity-50 md:text-lg"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="shrink-0 border border-ink bg-ink px-8 py-3.5 text-xs font-medium tracking-[0.22em] text-bone uppercase transition-colors hover:border-accent hover:bg-accent hover:text-ink disabled:opacity-40 md:text-[13px]"
                >
                  {sending ? t('home.leadSending') : t('home.leadSubmit')}
                </button>
              </div>

              <div aria-live="polite" className="mt-3 min-h-[1.5rem] text-base">
                {status === 'error' && error ? (
                  <p id={`${uid}-err`} className="text-accent">
                    {error}
                  </p>
                ) : null}
              </div>

              <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-ink/45">
                {t('home.leadConsent')}{' '}
                <Link
                  to="/legal/privacy"
                  className="underline decoration-ink/25 underline-offset-2 transition-colors hover:text-accent"
                >
                  {t('home.leadPrivacy')}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
