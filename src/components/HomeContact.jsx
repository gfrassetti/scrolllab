import { useId, useRef, useState } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import Logo from './Logo'
import { SUPPORT_EMAIL } from '../lib/site'
import {
  LIMITS,
  sanitizePlainText,
  validateContactPayload,
} from '../lib/contactForm'
import { useT } from '../i18n'

/**
 * Home contact — form always usable on top; subtle B/W logo
 * assembles behind (no pin, no empty scroll tax).
 */
export default function HomeContact() {
  const t = useT()
  const uid = useId()
  const root = useRef(null)
  const endpoint = String(
    import.meta.env.VITE_FORMSPREE_ENDPOINT ||
      'https://formspree.io/f/mrenneqe',
  ).trim()

  const [values, setValues] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      const logoHost = root.current?.querySelector('[data-contact-logo]')
      const bars = gsap.utils.toArray('[data-logo-bar]', logoHost)
      const accent = logoHost?.querySelector('[data-logo-accent]')
      const copyBits = gsap.utils.toArray('[data-contact-copy]', root.current)
      const fields = gsap.utils.toArray('[data-contact-field]', root.current)

      // Content visible immediately — light entrance only
      if (!reduced) {
        gsap.from(copyBits, {
          y: 28,
          opacity: 0,
          duration: 0.75,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 80%',
            once: true,
          },
        })
        gsap.from(fields, {
          y: 32,
          opacity: 0,
          duration: 0.8,
          stagger: 0.09,
          ease: 'power3.out',
          delay: 0.1,
          scrollTrigger: {
            trigger: root.current,
            start: 'top 80%',
            once: true,
          },
        })
      }

      if (reduced || !logoHost) return

      // Watermark assemble: short scrub while the section crosses the viewport
      if (bars[0]) gsap.set(bars[0], { x: -48, opacity: 0 })
      if (bars[1]) gsap.set(bars[1], { x: 56, opacity: 0 })
      if (bars[2]) gsap.set(bars[2], { y: 40, opacity: 0 })
      if (accent) {
        gsap.set(accent, {
          y: -36,
          x: 28,
          scale: 0.5,
          opacity: 0,
          transformOrigin: '50% 50%',
        })
      }

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top 85%',
          end: 'top 35%',
          scrub: 0.5,
        },
      })

      if (bars[0]) tl.to(bars[0], { x: 0, opacity: 1, duration: 1 }, 0)
      if (bars[1]) tl.to(bars[1], { x: 0, opacity: 1, duration: 1 }, 0.1)
      if (bars[2]) tl.to(bars[2], { y: 0, opacity: 1, duration: 1 }, 0.2)
      if (accent) {
        tl.to(
          accent,
          { y: 0, x: 0, scale: 1, opacity: 1, duration: 0.9 },
          0.28,
        )
      }
    },
    { scope: root },
  )

  const onChange = (key) => (e) => {
    const max =
      key === 'name'
        ? LIMITS.name
        : key === 'email'
          ? LIMITS.email
          : LIMITS.message
    const next = sanitizePlainText(e.target.value, max)
    setValues((prev) => ({ ...prev, [key]: next }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
    if (status === 'error' || status === 'sent') setStatus('idle')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (e.currentTarget.elements._gotcha?.value) return

    const result = validateContactPayload(values, {
      nameRequired: t('home.contactErrName'),
      emailInvalid: t('home.contactErrEmail'),
      messageShort: t('home.contactErrMessage'),
    })
    setErrors(result.ok ? {} : result.errors)
    if (!result.ok) return

    if (!endpoint) {
      setStatus('error')
      setErrors({ form: t('home.contactErrConfig') })
      return
    }

    setStatus('sending')
    setErrors({})

    try {
      const body = new URLSearchParams()
      body.set('name', result.data.name)
      body.set('email', result.data.email)
      body.set('message', result.data.message)
      body.set('_replyto', result.data.email)
      body.set('_subject', `SCROLL LAB — ${result.data.name}`)

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body,
      })

      if (!res.ok) {
        let detail = t('home.contactErrGeneric')
        try {
          const json = await res.json()
          if (json?.error) detail = String(json.error).slice(0, 200)
        } catch {
          /* ignore */
        }
        setStatus('error')
        setErrors({ form: detail })
        return
      }

      setStatus('sent')
      setValues({ name: '', email: '', message: '' })
    } catch {
      setStatus('error')
      setErrors({ form: t('home.contactErrNetwork') })
    }
  }

  const sending = status === 'sending'
  const fieldClass =
    'mt-3 w-full border-0 border-b border-ink/25 bg-transparent px-0 py-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-accent disabled:opacity-50 md:text-lg'

  return (
    <section
      id="contacto"
      ref={root}
      className="relative overflow-hidden border-t border-ink/15 bg-bone px-5 py-20 text-ink md:px-10 md:py-28"
      aria-labelledby={`${uid}-title`}
    >
      {/* Watermark only — low contrast, never above the form */}
      <div
        data-contact-logo
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-[0.07]"
        style={{ ['--color-accent']: 'currentColor' }}
      >
        <Logo className="h-[min(42vw,16rem)] w-[min(42vw,16rem)] text-ink" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 md:grid-cols-12 md:gap-16">
        <div className="md:col-span-5">
          <p
            data-contact-copy
            className="text-xs uppercase tracking-[0.28em] text-accent md:text-sm"
          >
            {t('home.contactEyebrow')}
          </p>
          <h2
            data-contact-copy
            id={`${uid}-title`}
            className="mt-4 max-w-[12ch] text-[clamp(2.4rem,6.5vw,4.75rem)] leading-[0.95] font-medium tracking-tight"
          >
            {t('home.contactTitle')}
          </h2>
          <p
            data-contact-copy
            className="mt-6 max-w-[36ch] text-base leading-relaxed text-ink/65 md:text-lg"
          >
            {t('home.contactBody')}
          </p>
          <p
            data-contact-copy
            className="mt-8 text-sm text-ink/45 md:text-base"
          >
            {t('home.contactNote')}{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="underline decoration-ink/25 underline-offset-2 transition-colors hover:text-accent"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>

        <form
          noValidate
          onSubmit={onSubmit}
          className="md:col-span-7"
          aria-busy={sending}
        >
          <input
            type="text"
            name="_gotcha"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute h-0 w-0 overflow-hidden opacity-0"
          />

          <div data-contact-field className="mb-7">
            <label
              htmlFor={`${uid}-name`}
              className="text-xs uppercase tracking-[0.25em] text-ink/50 md:text-[13px]"
            >
              {t('home.contactName')}
            </label>
            <input
              id={`${uid}-name`}
              name="name"
              type="text"
              autoComplete="name"
              maxLength={LIMITS.name}
              value={values.name}
              onChange={onChange('name')}
              disabled={sending}
              aria-invalid={errors.name ? 'true' : undefined}
              aria-describedby={errors.name ? `${uid}-name-err` : undefined}
              className={fieldClass}
            />
            {errors.name ? (
              <p id={`${uid}-name-err`} className="mt-2 text-sm text-accent">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div data-contact-field className="mb-7">
            <label
              htmlFor={`${uid}-email`}
              className="text-xs uppercase tracking-[0.25em] text-ink/50 md:text-[13px]"
            >
              {t('home.contactEmail')}
            </label>
            <input
              id={`${uid}-email`}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={LIMITS.email}
              value={values.email}
              onChange={onChange('email')}
              disabled={sending}
              aria-invalid={errors.email ? 'true' : undefined}
              aria-describedby={errors.email ? `${uid}-email-err` : undefined}
              className={fieldClass}
            />
            {errors.email ? (
              <p id={`${uid}-email-err`} className="mt-2 text-sm text-accent">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div data-contact-field className="mb-10">
            <label
              htmlFor={`${uid}-message`}
              className="text-xs uppercase tracking-[0.25em] text-ink/50 md:text-[13px]"
            >
              {t('home.contactMessage')}
            </label>
            <textarea
              id={`${uid}-message`}
              name="message"
              rows={4}
              maxLength={LIMITS.message}
              value={values.message}
              onChange={onChange('message')}
              disabled={sending}
              aria-invalid={errors.message ? 'true' : undefined}
              aria-describedby={
                errors.message ? `${uid}-message-err` : undefined
              }
              className={`${fieldClass} resize-y`}
            />
            {errors.message ? (
              <p id={`${uid}-message-err`} className="mt-2 text-sm text-accent">
                {errors.message}
              </p>
            ) : null}
          </div>

          <div data-contact-field>
            <button
              type="submit"
              disabled={sending}
              className="border border-ink bg-ink px-8 py-3.5 text-xs font-medium tracking-[0.22em] text-bone uppercase transition-colors hover:border-accent hover:bg-accent hover:text-ink disabled:opacity-40 md:text-[13px]"
            >
              {sending ? t('home.contactSending') : t('home.contactSubmit')}
            </button>
          </div>

          <div aria-live="polite" className="mt-5 min-h-[1.5rem] text-base">
            {status === 'sent' ? (
              <p className="font-medium text-accent">
                {t('home.contactSuccess')}
              </p>
            ) : null}
            {status === 'error' && errors.form ? (
              <p className="text-accent">{errors.form}</p>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  )
}
