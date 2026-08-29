import { useId, useRef, useState } from 'react'
import { gsap, useGSAP } from '../../../lib/gsap'

/**
 * Palettes matching each template model. `auto` paints nothing and inherits
 * the surrounding background / text color, so the form also works dropped
 * into a page whose colors are not one of the presets.
 */
const THEMES = {
  auto: {
    surface: 'bg-transparent',
    eyebrow: 'opacity-55',
    title: 'font-grotesk font-medium tracking-[-0.03em]',
    body: 'opacity-70',
    field:
      'border-current/25 focus:border-current placeholder:text-current/35',
    button: 'border border-current hover:opacity-65 disabled:opacity-40',
    note: 'opacity-50',
    radius: '',
  },
  chapters: {
    surface: 'bg-bone text-ink',
    eyebrow: 'text-ink/50',
    title: 'font-grotesk font-medium tracking-[-0.03em]',
    body: 'text-ink/65',
    field: 'border-ink/20 focus:border-ink placeholder:text-ink/35',
    button:
      'border border-ink bg-ink text-bone hover:bg-accent hover:border-accent disabled:opacity-40',
    note: 'text-ink/45',
    radius: '',
  },
  nocturne: {
    surface: 'bg-noir text-salt',
    eyebrow: 'text-acid',
    title: 'font-grotesk font-light tracking-[-0.04em]',
    body: 'text-salt/65',
    field: 'border-salt/20 focus:border-acid placeholder:text-salt/30',
    button:
      'border border-acid bg-acid text-noir hover:bg-transparent hover:text-acid disabled:opacity-40',
    note: 'text-salt/40',
    radius: '',
  },
  monolith: {
    surface: 'bg-concrete text-carbon',
    eyebrow: 'text-carbon/60',
    title: 'font-anton uppercase tracking-[-0.02em]',
    body: 'text-carbon/70',
    field:
      'border-2 border-carbon bg-transparent focus:border-klein placeholder:text-carbon/40',
    button:
      'border-2 border-carbon bg-klein text-white hover:bg-carbon disabled:opacity-40',
    note: 'text-carbon/55 font-mono',
    radius: '',
  },
  velocity: {
    surface: 'bg-[#0a1a12] text-[#ece9e2]',
    eyebrow: 'text-acid',
    title: 'font-brico font-semibold tracking-[-0.04em]',
    body: 'text-[#ece9e2]/65',
    field:
      'border-[#ece9e2]/20 focus:border-acid placeholder:text-[#ece9e2]/30',
    button:
      'border border-acid bg-acid text-[#0a1a12] hover:bg-transparent hover:text-acid disabled:opacity-40',
    note: 'text-[#ece9e2]/40',
    radius: 'rounded-full',
  },
  fizz: {
    surface: 'bg-grape text-foam',
    eyebrow: 'text-fizz',
    title: 'font-brico font-extrabold tracking-[-0.03em]',
    body: 'text-foam/70',
    field:
      'rounded-2xl border-foam/25 focus:border-fizz placeholder:text-foam/35',
    button:
      'rounded-full border border-fizz bg-fizz text-grape hover:bg-transparent hover:text-fizz disabled:opacity-40',
    note: 'text-foam/50',
    radius: 'rounded-full',
  },
  atelier: {
    surface: 'bg-[#0b0c10] text-white',
    eyebrow: 'text-white/45',
    title: 'font-grotesk font-light tracking-[-0.04em]',
    body: 'text-white/60',
    field: 'border-white/15 focus:border-white/60 placeholder:text-white/25',
    button:
      'border border-white/70 hover:bg-white hover:text-[#0b0c10] disabled:opacity-40',
    note: 'text-white/35',
    radius: '',
  },
  comic: {
    surface: 'bg-comic-paper text-[#2a2622]',
    eyebrow: 'text-comic-flare',
    title: 'font-brico font-bold tracking-[-0.03em]',
    body: 'text-[#2a2622]/70',
    field:
      'border-[#2a2622]/25 focus:border-comic-flare placeholder:text-[#2a2622]/35',
    button:
      'rounded-md border border-comic-flare bg-comic-flare text-white hover:bg-transparent hover:text-comic-flare disabled:opacity-40',
    note: 'text-[#2a2622]/45',
    radius: 'rounded-md',
  },
  unity: {
    surface: 'bg-[#e7e4dc] text-[#0a0a0a]',
    eyebrow: 'text-[#0a0a0a]/45',
    title: 'font-oswald font-semibold uppercase tracking-[-0.02em]',
    body: 'text-[#0a0a0a]/70',
    field:
      'border-[#0a0a0a]/20 focus:border-[#2c4a42] placeholder:text-[#0a0a0a]/35',
    button:
      'border border-[#0a0a0a] bg-[#2c4a42] text-[#e7e4dc] hover:bg-transparent hover:text-[#0a0a0a] disabled:opacity-40',
    note: 'text-[#0a0a0a]/45',
    radius: '',
  },
  ratio: {
    surface: 'bg-[#16110e] text-[#ebe6dc]',
    eyebrow: 'text-[#ebe6dc]/45',
    title: 'font-anton uppercase tracking-[-0.02em]',
    body: 'text-[#ebe6dc]/70',
    field:
      'border-[#ebe6dc]/20 focus:border-[#e23c24] placeholder:text-[#ebe6dc]/35',
    button:
      'border border-[#ebe6dc] bg-[#e23c24] text-[#16110e] hover:bg-transparent hover:text-[#ebe6dc] disabled:opacity-40',
    note: 'text-[#ebe6dc]/45',
    radius: '',
  },
  atrium: {
    surface: 'bg-atrium-paper text-atrium-ink',
    eyebrow: 'text-atrium-ink/45',
    title: 'font-display tracking-[-0.03em]',
    body: 'text-atrium-ink/70',
    field:
      'border-atrium-ink/20 focus:border-atrium-ink placeholder:text-atrium-ink/35',
    button:
      'ui-press border border-atrium-ink bg-atrium-ink text-atrium-paper hover:bg-transparent hover:text-atrium-ink disabled:opacity-40',
    note: 'text-atrium-ink/45',
    radius: '',
  },
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * ContactForm — theme-aware contact section.
 *
 * Without `endpoint` it runs in demo mode (simulated success) so the page is
 * clickable out of the box. Set `endpoint` to POST `{ name, email, message }`
 * as JSON to your own backend, Formspree, Resend function, etc.
 */
export default function ContactForm({
  theme = 'auto',
  eyebrow = 'Section label',
  title = 'Title 1',
  body = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.',
  nameLabel = 'Name',
  emailLabel = 'Email',
  messageLabel = 'Message',
  submitLabel = 'CTA label',
  sendingLabel = 'Sending…',
  successMessage = 'Message sent.',
  errorMessage = 'Something went wrong. Please try again.',
  note = 'Replace with your reply time or privacy line.',
  endpoint = '',
}) {
  const root = useRef(null)
  const uid = useId()
  const skin = THEMES[theme] || THEMES.auto

  const [values, setValues] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.from('[data-contact-reveal]', {
        y: 28,
        opacity: 0,
        duration: 0.8,
        stagger: 0.07,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: root.current,
          start: 'top 78%',
        },
      })
    },
    { scope: root },
  )

  const validate = () => {
    const next = {}
    if (!values.name.trim()) next.name = 'Required'
    if (!EMAIL_RE.test(values.email.trim())) next.email = 'Enter a valid email'
    if (values.message.trim().length < 10) next.message = 'Message is too short'
    return next
  }

  const onChange = (key) => (e) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    // Honeypot: bots fill hidden inputs, humans never see this one.
    if (e.currentTarget.elements.company?.value) return

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

  const fieldBase = `mt-2 w-full border bg-transparent px-4 py-3 text-sm outline-none transition-colors ${skin.field}`
  const labelBase = 'text-[11px] uppercase tracking-[0.2em] opacity-60'
  const sending = status === 'sending'

  const fields = [
    { key: 'name', label: nameLabel, type: 'text', autoComplete: 'name' },
    { key: 'email', label: emailLabel, type: 'email', autoComplete: 'email' },
  ]

  return (
    <section
      id="contact"
      ref={root}
      className={`px-5 py-20 md:px-10 md:py-28 ${skin.surface}`}
    >
      <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2 md:gap-16">
        <div>
          <p
            data-contact-reveal
            className={`text-[11px] uppercase tracking-[0.25em] ${skin.eyebrow}`}
          >
            {eyebrow}
          </p>
          <h2
            data-contact-reveal
            className={`mt-3 max-w-[14ch] text-[clamp(2rem,5vw,3.75rem)] leading-[0.95] ${skin.title}`}
          >
            {title}
          </h2>
          <p
            data-contact-reveal
            className={`mt-5 max-w-[42ch] text-sm leading-relaxed md:text-base ${skin.body}`}
          >
            {body}
          </p>
          <p
            data-contact-reveal
            className={`mt-8 text-xs leading-relaxed ${skin.note}`}
          >
            {note}
          </p>
        </div>

        <form noValidate onSubmit={onSubmit} className="w-full">
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute h-0 w-0 overflow-hidden opacity-0"
          />

          {fields.map((field) => (
            <div key={field.key} data-contact-reveal className="mb-5">
              <label htmlFor={`${uid}-${field.key}`} className={labelBase}>
                {field.label}
              </label>
              <input
                id={`${uid}-${field.key}`}
                type={field.type}
                autoComplete={field.autoComplete}
                value={values[field.key]}
                onChange={onChange(field.key)}
                disabled={sending}
                aria-invalid={errors[field.key] ? 'true' : undefined}
                aria-describedby={
                  errors[field.key] ? `${uid}-${field.key}-error` : undefined
                }
                className={fieldBase}
              />
              {errors[field.key] && (
                <p
                  id={`${uid}-${field.key}-error`}
                  className="mt-1.5 text-xs opacity-70"
                >
                  {errors[field.key]}
                </p>
              )}
            </div>
          ))}

          <div data-contact-reveal className="mb-6">
            <label htmlFor={`${uid}-message`} className={labelBase}>
              {messageLabel}
            </label>
            <textarea
              id={`${uid}-message`}
              rows={5}
              value={values.message}
              onChange={onChange('message')}
              disabled={sending}
              aria-invalid={errors.message ? 'true' : undefined}
              aria-describedby={
                errors.message ? `${uid}-message-error` : undefined
              }
              className={`${fieldBase} resize-y`}
            />
            {errors.message && (
              <p id={`${uid}-message-error`} className="mt-1.5 text-xs opacity-70">
                {errors.message}
              </p>
            )}
          </div>

          <button
            data-contact-reveal
            type="submit"
            disabled={sending}
            className={`px-7 py-3 text-[11px] font-medium uppercase tracking-[0.22em] transition-colors ${skin.radius} ${skin.button}`}
          >
            {sending ? sendingLabel : submitLabel}
          </button>

          <p aria-live="polite" className="mt-4 text-sm">
            {status === 'sent' && successMessage}
            {status === 'error' && errorMessage}
          </p>
        </form>
      </div>
    </section>
  )
}
