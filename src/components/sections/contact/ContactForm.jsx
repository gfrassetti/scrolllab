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
  meridian: {
    surface: 'bg-[#dfd8cf] text-[#2a2622]',
    eyebrow: 'text-[#2a2622]/45',
    title: 'font-display tracking-[-0.02em]',
    body: 'text-[#2a2622]/70',
    field:
      'border-[#2a2622]/20 focus:border-[#2a2622] placeholder:text-[#2a2622]/35',
    button:
      'border border-[#2a2622] bg-[#2a2622] text-[#dfd8cf] hover:bg-transparent hover:text-[#2a2622] disabled:opacity-40',
    note: 'text-[#2a2622]/45',
    radius: '',
  },
  kin: {
    surface: 'bg-[#e1e2de] text-[#141414]',
    eyebrow: 'text-[#141414]/45',
    title: 'font-semibold uppercase tracking-[-0.01em]',
    body: 'text-[#141414]/70',
    field:
      'border-[#141414]/20 focus:border-[#141414] placeholder:text-[#141414]/35',
    button:
      'border border-[#141414] bg-[#141414] text-[#e1e2de] hover:bg-transparent hover:text-[#141414] disabled:opacity-40',
    note: 'text-[#141414]/45',
    radius: '',
  },
  fold: {
    surface: 'bg-[#e9e2d3] text-[#1b1a17]',
    eyebrow: 'text-[#1b1a17]/45',
    title: 'font-light tracking-[-0.02em]',
    body: 'text-[#1b1a17]/70',
    field:
      'border-[#1b1a17]/20 focus:border-[#1b1a17] placeholder:text-[#1b1a17]/35',
    button:
      'rounded-[4px] border border-[#1b1a17] bg-[#1b1a17] text-[#f2efe6] hover:bg-transparent hover:text-[#1b1a17] disabled:opacity-40',
    note: 'text-[#1b1a17]/45',
    radius: '',
  },
  apex: {
    surface: 'bg-[#04070d] text-[#e8edf6]',
    eyebrow: 'text-[#9cc3ff]',
    title: 'font-medium tracking-[-0.035em]',
    body: 'text-[#e8edf6]/65',
    field:
      'border-[#e8edf6]/20 focus:border-[#9cc3ff] placeholder:text-[#e8edf6]/30',
    button:
      'border border-[#e8edf6] hover:bg-[#e8edf6] hover:text-[#04070d] disabled:opacity-40',
    note: 'text-[#e8edf6]/40',
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
  /**
   * Qué pide el formulario: `contact` (nombre, email, mensaje), `quote`
   * (presupuesto: empresa, rango y plazo), `newsletter` (solo email, en una
   * línea), `callback` (que te llamen: teléfono y horario) o `booking`
   * (reserva: fecha y personas). Todo lo que se ve es una prop.
   */
  formType = 'contact',
  phoneLabel = 'Phone',
  companyLabel = 'Company',
  budgetLabel = 'Budget',
  budgetOptions = 'Up to $1,000\n$1,000 – $5,000\n$5,000 +',
  timelineLabel = 'When do you need it?',
  timeLabel = 'Best time to call',
  timeOptions = 'Morning\nAfternoon\nEvening',
  dateLabel = 'Date',
  peopleLabel = 'People',
  selectPlaceholder = 'Choose…',
  /**
   * Campos extra, después de los del tipo: `{ label, kind, options, showRequired }`.
   * `kind`: text · email · tel · number · date · textarea · options (con
   * `options` separadas por coma). Viajan en el POST con su etiqueta como clave.
   */
  extraFields,
  /** Los mensajes de validación. */
  requiredError = 'Required',
  emailError = 'Enter a valid email',
  messageError = 'Message is too short',
  /** Colores libres: pisan los de la paleta `theme`. */
  bg,
  fg,
  accent,
}) {
  const root = useRef(null)
  const uid = useId()
  const preset = THEMES[theme] || THEMES.auto
  // Con algún color propio, la piel hereda del fondo y el texto que se eligió
  // (como `auto`) y el acento pinta el rótulo y el botón.
  const skin =
    bg || fg || accent
      ? {
          ...THEMES.auto,
          title: preset.title,
          radius: preset.radius,
          eyebrow: accent ? 'text-(color:--cf-accent)' : THEMES.auto.eyebrow,
          button: accent
            ? 'border border-(--cf-accent) bg-(--cf-accent) text-(color:--cf-on-accent) hover:opacity-85 disabled:opacity-40'
            : THEMES.auto.button,
        }
      : preset
  const ownColors =
    bg || fg || accent
      ? {
          ...(bg ? { backgroundColor: bg } : {}),
          ...(fg ? { color: fg } : {}),
          ...(accent ? { '--cf-accent': accent, '--cf-on-accent': bg || '#ffffff' } : {}),
        }
      : undefined

  // Opciones de un select: una por línea (los montos llevan comas: «$1,000»).
  const lines = (text) => String(text || '').split(/\r?\n/).map((o) => o.trim()).filter(Boolean)
  // Opciones de un campo extra: separadas por coma, o una por línea.
  const commaList = (text) => String(text || '').split(/\r?\n|,/).map((o) => o.trim()).filter(Boolean)
  const TYPES = {
    contact: ['name', 'email', 'message'],
    quote: ['name', 'email', 'company', 'budget', 'timeline', 'message'],
    newsletter: ['email'],
    callback: ['name', 'phone', 'time', 'message?'],
    booking: ['name', 'email', 'date', 'people', 'message?'],
  }
  const BASE = {
    name: { label: nameLabel, kind: 'text', autoComplete: 'name', required: true },
    email: { label: emailLabel, kind: 'email', autoComplete: 'email', required: true },
    phone: { label: phoneLabel, kind: 'tel', autoComplete: 'tel', required: true },
    company: { label: companyLabel, kind: 'text', autoComplete: 'organization' },
    budget: { label: budgetLabel, kind: 'select', options: lines(budgetOptions) },
    timeline: { label: timelineLabel, kind: 'text' },
    time: { label: timeLabel, kind: 'select', options: lines(timeOptions) },
    date: { label: dateLabel, kind: 'date', required: true },
    people: { label: peopleLabel, kind: 'number', required: true },
    message: { label: messageLabel, kind: 'textarea', required: true },
  }
  const KINDS = new Set(['text', 'email', 'tel', 'number', 'date', 'textarea'])
  const kind = TYPES[formType] ? formType : 'contact'
  const typeFields = TYPES[kind].map((id) => {
    const optional = id.endsWith('?')
    const key = optional ? id.slice(0, -1) : id
    return { key, ...BASE[key], ...(optional ? { required: false } : {}) }
  })
  const extras = (Array.isArray(extraFields) ? extraFields : [])
    .filter((row) => row && typeof row.label === 'string' && row.label.trim())
    .slice(0, 6)
    .map((row, i) => {
      const options = commaList(row.options)
      const k = row.kind === 'options' && options.length ? 'select' : KINDS.has(row.kind) ? row.kind : 'text'
      return { key: `extra${i}`, label: row.label.trim(), kind: k, options, required: row.showRequired === 'on', extra: true }
    })
  // Los extra van antes del mensaje (el cierre natural del formulario).
  const messageAt = typeFields.findIndex((f) => f.key === 'message')
  const formFields =
    messageAt === -1
      ? [...typeFields, ...extras]
      : [...typeFields.slice(0, messageAt), ...extras, ...typeFields.slice(messageAt)]
  const empty = () => Object.fromEntries(formFields.map((f) => [f.key, '']))

  const [values, setValues] = useState(empty)
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
    for (const f of formFields) {
      const v = String(values[f.key] || '').trim()
      // Un email vacío u mal escrito dice lo mismo: «email inválido».
      if (f.kind === 'email' && (f.required || v) && !EMAIL_RE.test(v)) next[f.key] = emailError
      else if (f.required && !v) next[f.key] = f.key === 'message' ? messageError : requiredError
      else if (f.key === 'message' && f.required && v.length < 10) next[f.key] = messageError
    }
    return next
  }

  const onChange = (key) => (e) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    // Honeypot: bots fill hidden inputs, humans never see this one.
    if (e.currentTarget.elements.website_hp?.value) return

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) return

    // Lo que llega a tu endpoint: el tipo de formulario y cada campo (los extra
    // con su etiqueta como clave).
    const payload = { formType: kind }
    for (const f of formFields) {
      const v = String(values[f.key] || '').trim()
      if (v) payload[f.extra ? f.label : f.key] = v
    }

    setStatus('sending')
    try {
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(String(res.status))
      } else {
        await new Promise((resolve) => setTimeout(resolve, 700))
      }
      setStatus('sent')
      setValues(empty())
    } catch {
      setStatus('error')
    }
  }

  const fieldBase = `mt-2 w-full border bg-transparent px-4 py-3 text-sm outline-none transition-colors ${skin.field}`
  const labelBase = 'text-[11px] uppercase tracking-[0.2em] opacity-60'
  const sending = status === 'sending'

  return (
    <section
      id="contact"
      ref={root}
      className={`px-5 py-20 md:px-10 md:py-28 ${skin.surface}`}
      style={ownColors}
    >
      <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2 md:gap-16">
        <div>
          {eyebrow ? (
            <p
              data-contact-reveal
              className={`mb-3 text-[11px] uppercase tracking-[0.25em] ${skin.eyebrow}`}
            >
              {eyebrow}
            </p>
          ) : null}
          <h2
            data-contact-reveal
            className={`max-w-[14ch] text-[clamp(2rem,5vw,3.75rem)] leading-[0.95] ${skin.title}`}
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

        <form noValidate onSubmit={onSubmit} className="w-full" data-form-type={kind}>
          <input
            type="text"
            name="website_hp"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute h-0 w-0 overflow-hidden opacity-0"
          />

          <div className={kind === 'newsletter' ? 'flex flex-wrap items-end gap-3' : ''}>
            {formFields.map((field) => {
              const id = `${uid}-${field.key}`
              const invalid = errors[field.key]
              const common = {
                id,
                value: values[field.key] ?? '',
                onChange: onChange(field.key),
                disabled: sending,
                required: field.required || undefined,
                'aria-invalid': invalid ? 'true' : undefined,
                'aria-describedby': invalid ? `${id}-error` : undefined,
              }
              return (
                <div
                  key={field.key}
                  data-contact-reveal
                  className={kind === 'newsletter' ? 'min-w-[14rem] flex-1' : field.kind === 'textarea' ? 'mb-6' : 'mb-5'}
                >
                  <label htmlFor={id} className={labelBase}>
                    {field.label}
                  </label>
                  {field.kind === 'textarea' ? (
                    <textarea rows={5} {...common} className={`${fieldBase} resize-y`} />
                  ) : field.kind === 'select' ? (
                    <select {...common} className={`${fieldBase} appearance-none`}>
                      <option value="">{selectPlaceholder}</option>
                      {field.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.kind}
                      autoComplete={field.autoComplete}
                      min={field.kind === 'number' ? 1 : undefined}
                      {...common}
                      className={fieldBase}
                    />
                  )}
                  {invalid && (
                    <p id={`${id}-error`} className="mt-1.5 text-xs opacity-70">
                      {invalid}
                    </p>
                  )}
                </div>
              )
            })}

            <button
              data-contact-reveal
              type="submit"
              disabled={sending}
              className={`px-7 py-3 text-[11px] font-medium uppercase tracking-[0.22em] transition-colors ${skin.radius} ${skin.button}`}
            >
              {sending ? sendingLabel : submitLabel}
            </button>
          </div>

          <p aria-live="polite" className="mt-4 text-sm">
            {status === 'sent' && successMessage}
            {status === 'error' && errorMessage}
          </p>
        </form>
      </div>
    </section>
  )
}
