import { useId, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'
import { useLang } from './lang'

/**
 * MERIDIAN — Contact form
 *
 * Designed for this template rather than the generic form: a large light
 * serif headline on the left, and on the right a form of underline fields
 * (no boxes) with mono labels that float up on focus. Validation is inline,
 * a honeypot catches bots, and the submit button fills on hover like the
 * rest of the page's CTAs.
 *
 * `endpoint` (optional) receives a JSON POST { name, email, message }.
 * Without it the form just simulates a send so the demo works offline.
 * Labels/validation messages come from the language dictionary (lang.jsx);
 * any prop you pass wins in both languages.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INK = '#2a2622'
const SAND = '#dfd8cf'

export default function Contact({ eyebrow, title, body, submitLabel, note, endpoint = '' }) {
  const { t } = useLang()
  const root = useRef(null)
  const uid = useId()
  const [values, setValues] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('[data-ct-reveal]', {
        opacity: 0,
        y: 26,
        filter: 'blur(6px)',
        duration: 1.3,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: { trigger: root.current, start: 'top 72%', once: true },
      })
    },
    { scope: root },
  )

  const validate = () => {
    const next = {}
    if (!values.name.trim()) next.name = t('required')
    if (!EMAIL_RE.test(values.email.trim())) next.email = t('invalidEmail')
    if (values.message.trim().length < 10) next.message = t('tooShort')
    return next
  }

  const onChange = (key) => (e) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
    if (status === 'sent' || status === 'error') setStatus('idle')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (e.currentTarget.elements.company?.value) return // honeypot
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) return
    setStatus('sending')
    try {
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        if (!res.ok) throw new Error(String(res.status))
      } else {
        await new Promise((resolve) => setTimeout(resolve, 700))
      }
      setStatus('sent')
      setValues({ name: '', email: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  const fields = [
    { key: 'name', label: t('name'), type: 'text', autoComplete: 'name' },
    { key: 'email', label: t('emailLabel'), type: 'email', autoComplete: 'email' },
  ]
  const sending = status === 'sending'

  return (
    <section
      ref={root}
      id="contact"
      className="relative px-6 py-24 md:px-16 md:py-36"
      style={{ background: SAND, color: INK }}
    >
      <div className="mx-auto grid max-w-[80rem] gap-14 md:grid-cols-[1fr_1.1fr] md:gap-24">
        <div>
          <p
            data-ct-reveal
            className="text-[12px] uppercase tracking-[0.12em]"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            {eyebrow ?? t('contactEyebrow')}
          </p>
          <h2
            data-ct-reveal
            className="mt-5 text-[clamp(2.6rem,5.4vw,5rem)] leading-[0.98] tracking-[-0.02em] uppercase"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
          >
            {title ?? t('contactTitle')}
          </h2>
          <p
            data-ct-reveal
            className="mt-8 max-w-[28rem] text-[13px] leading-[1.6] uppercase opacity-70"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            {body ?? t('contactBody')}
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate data-ct-reveal className="grid gap-9">
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />
          {fields.map((f) => (
            <label key={f.key} htmlFor={`${uid}-${f.key}`} className="mer-ct-field block">
              <span className="mer-ct-label">{f.label}</span>
              <input
                id={`${uid}-${f.key}`}
                type={f.type}
                value={values[f.key]}
                autoComplete={f.autoComplete}
                onChange={onChange(f.key)}
                aria-invalid={Boolean(errors[f.key])}
                className="mer-ct-input"
              />
              <span className="mer-ct-line" aria-hidden="true" />
              {errors[f.key] && <span className="mer-ct-error">{errors[f.key]}</span>}
            </label>
          ))}
          <label htmlFor={`${uid}-message`} className="mer-ct-field block">
            <span className="mer-ct-label">{t('message')}</span>
            <textarea
              id={`${uid}-message`}
              rows={4}
              value={values.message}
              onChange={onChange('message')}
              aria-invalid={Boolean(errors.message)}
              className="mer-ct-input resize-none"
            />
            <span className="mer-ct-line" aria-hidden="true" />
            {errors.message && <span className="mer-ct-error">{errors.message}</span>}
          </label>

          <div className="flex flex-wrap items-center gap-6">
            <button
              type="submit"
              disabled={sending}
              className="mer-ct-btn relative inline-flex items-center overflow-hidden rounded-full px-8 py-4 text-[12px] uppercase tracking-[0.16em] disabled:opacity-50"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              <span aria-hidden="true" className="mer-ct-btn-fill absolute inset-0" />
              <span className="relative">{sending ? t('sending') : (submitLabel ?? t('send'))}</span>
            </button>
            <p
              role="status"
              aria-live="polite"
              className="text-[11px] uppercase tracking-[0.06em] opacity-60"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {status === 'sent' ? t('sent') : status === 'error' ? t('error') : (note ?? t('note'))}
            </p>
          </div>
        </form>
      </div>

      <style>{`
        .mer-ct-field { position: relative; }
        .mer-ct-label { display: block; font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.55; transition: opacity 0.3s ease; }
        .mer-ct-field:focus-within .mer-ct-label { opacity: 1; }
        .mer-ct-input { display: block; width: 100%; margin-top: 6px; padding: 8px 0 12px; background: transparent; border: 0; outline: none; font-family: 'Fraunces', serif; font-weight: 300; font-size: 1.6rem; color: ${INK}; border-bottom: 1px solid rgba(42, 38, 34, 0.25); }
        .mer-ct-line { position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: ${INK}; transform: scaleX(0); transform-origin: left; transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1); pointer-events: none; }
        .mer-ct-field:focus-within .mer-ct-line { transform: scaleX(1); }
        .mer-ct-input[aria-invalid="true"] { border-bottom-color: #a94a2a; }
        .mer-ct-error { position: absolute; right: 0; top: 0; font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #a94a2a; }

        .mer-ct-btn { background: ${INK}; color: ${SAND}; border: 1px solid ${INK}; transition: color 0.4s ease; }
        .mer-ct-btn-fill { background: ${SAND}; transform: translateY(101%); transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
        .mer-ct-btn:hover:not(:disabled) .mer-ct-btn-fill { transform: translateY(0); }
        .mer-ct-btn:hover:not(:disabled) { color: ${INK}; }
      `}</style>
    </section>
  )
}
