import { Fragment, useId, useRef, useState } from 'react'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { prefersReducedMotion } from '../../../lib/motion'
import { riseBubbles } from './riseBubbles'

// The flavor colors used across the page (the same ones the manifesto inks in).
const PALETTE = ['#ffb02e', '#ff3ea5', '#3ddc97', '#ff6b35']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const ARROW = (
  <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
    <path
      d="M4 12h15M13.5 6l6 6-6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** Every other word of a heading takes a flavor color, rotating with the step. */
function Colored({ text, shift }) {
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i, all) => (
      <Fragment key={`${word}-${i}`}>
        <span style={i % 2 === 1 ? { color: PALETTE[(i + shift) % PALETTE.length] } : undefined}>
          {word}
        </span>
        {i < all.length - 1 ? ' ' : null}
      </Fragment>
    ))
}

/**
 * ContactSteps — a contact form that asks one thing at a time (name, email,
 * message), like a conversation: a big uppercase question, a one-line hint, a
 * single field and an arrow. Each step validates before moving on and has a
 * Back link; Enter advances.
 *
 * Without `endpoint` it runs in demo mode (simulated success). Set `endpoint`
 * to POST `{ name, email, message }` as JSON to your own backend.
 */
export default function ContactSteps({
  nameTitle = "What's your name?",
  nameHint = "I'm not big on formalities, but I like knowing who I'm talking to.",
  namePlaceholder = 'Your name',
  emailTitle = 'Where can I reply?',
  emailHint = "I'll only use it to answer you. No newsletters, promise.",
  emailPlaceholder = 'Your email',
  messageTitle = "What's on your mind?",
  messageHint = 'A couple of lines is plenty. Tell me what you need.',
  messagePlaceholder = 'Your message',
  nextLabel = 'Next',
  sendLabel = 'Send',
  backLabel = 'Back',
  nameError = 'Tell me your name',
  emailError = "That email doesn't look right",
  messageError = 'A few more words, please',
  successTitle = 'Thanks, {name}!',
  successBody = 'Message received. I answer within two business days.',
  restartLabel = 'Write another',
  failureMessage = 'Something went wrong. Please try again.',
  sendingLabel = 'Sending…',
  endpoint = '',
  bg = '#241352',
  fg = '#fff3e2',
}) {
  const root = useRef(null)
  const bubblesRef = useRef(null)
  const bodyRef = useRef(null)
  const fieldRef = useRef(null)
  const uid = useId()

  const steps = [
    { key: 'name', title: nameTitle, hint: nameHint, placeholder: namePlaceholder, error: nameError, type: 'text', autoComplete: 'name' },
    { key: 'email', title: emailTitle, hint: emailHint, placeholder: emailPlaceholder, error: emailError, type: 'email', autoComplete: 'email' },
    { key: 'message', title: messageTitle, hint: messageHint, placeholder: messagePlaceholder, error: messageError, type: 'textarea' },
  ]

  const [step, setStep] = useState(0)
  const [values, setValues] = useState({ name: '', email: '', message: '' })
  const [error, setError] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | failed
  const leaving = useRef(false)

  const done = status === 'sent'
  const current = steps[Math.min(step, steps.length - 1)]
  const firstName = values.name.trim().split(/\s+/)[0] || ''
  const title = done ? successTitle.replace('{name}', firstName || 'friend') : current.title

  // Ambient bubbles, the same glass ones as the footer.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return undefined
      return riseBubbles(bubblesRef.current, root.current, {
        size: [28, 84],
        every: 1,
        burst: 4,
        pool: 10,
      })
    },
    { scope: root },
  )

  // Each new question: the heading rises letter by letter, then the rest follows.
  useGSAP(
    () => {
      const field = fieldRef.current
      if (prefersReducedMotion()) {
        field?.focus?.({ preventScroll: true })
        return undefined
      }
      const split = SplitText.create('[data-step-title]', { type: 'words, chars', mask: 'chars' })
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })
      tl.from(split.chars, { yPercent: 115, duration: 0.9, stagger: 0.018 }, 0)
      tl.from('[data-step-rest]', { y: 24, opacity: 0, duration: 0.7, stagger: 0.08 }, 0.25)
      tl.add(() => field?.focus?.({ preventScroll: true }), 0.35)
      return () => split.revert()
    },
    { scope: root, dependencies: [step, status], revertOnUpdate: true },
  )

  const validate = () => {
    const value = values[current.key].trim()
    if (current.key === 'name') return value.length >= 2 ? '' : current.error
    if (current.key === 'email') return EMAIL_RE.test(value) ? '' : current.error
    return value.length >= 10 ? '' : current.error
  }

  // Quick exit of the current question before the next one is mounted.
  const leave = (then) => {
    if (prefersReducedMotion() || !bodyRef.current) return then()
    if (leaving.current) return undefined
    leaving.current = true
    return gsap.to(bodyRef.current.querySelectorAll('[data-step-leave]'), {
      y: -24,
      opacity: 0,
      duration: 0.28,
      ease: 'power2.in',
      stagger: 0.03,
      onComplete: () => {
        leaving.current = false
        then()
        gsap.set(bodyRef.current.querySelectorAll('[data-step-leave]'), { clearProps: 'all' })
      },
    })
  }

  const send = async () => {
    setStatus('sending')
    try {
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: values.name.trim(),
            email: values.email.trim(),
            message: values.message.trim(),
          }),
        })
        if (!res.ok) throw new Error(String(res.status))
      } else {
        await new Promise((resolve) => setTimeout(resolve, 900))
      }
      leave(() => setStatus('sent'))
    } catch {
      setStatus('failed')
      setError(failureMessage)
    }
  }

  const onSubmit = (event) => {
    event.preventDefault()
    if (status === 'sending' || leaving.current) return
    const problem = validate()
    if (problem) {
      setError(problem)
      fieldRef.current?.focus?.()
      return
    }
    setError('')
    if (step < steps.length - 1) leave(() => setStep((n) => n + 1))
    else send()
  }

  const back = () => {
    if (status === 'sending' || leaving.current) return
    setError('')
    leave(() => {
      setStatus('idle')
      setStep((n) => Math.max(0, n - 1))
    })
  }

  const restart = () => {
    leave(() => {
      setValues({ name: '', email: '', message: '' })
      setError('')
      setStatus('idle')
      setStep(0)
    })
  }

  const onKeyDown = (event) => {
    // In the message box Enter sends the step; Shift+Enter writes a new line.
    if (current.type === 'textarea' && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit(event)
    }
  }

  const sending = status === 'sending'
  const last = step === steps.length - 1
  const fieldClass =
    'peer block w-full resize-none bg-transparent py-4 outline-none! font-brico text-xl font-semibold tracking-[0.02em] uppercase placeholder:text-current/35 disabled:opacity-50 md:text-2xl'

  return (
    <section
      id="contact"
      ref={root}
      className="relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-24 md:px-10"
      style={{ backgroundColor: bg, color: fg }}
    >
      <div ref={bubblesRef} aria-hidden="true" className="pointer-events-none absolute inset-0 text-foam/35" />

      <div ref={bodyRef} className="relative mx-auto w-full max-w-3xl text-center">
        {!done ? (
          <div data-step-leave className="mb-10 flex items-center justify-center gap-4 text-[11px] font-semibold uppercase tracking-[0.3em] md:text-xs">
            <span aria-live="polite">
              {String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
            </span>
            <span aria-hidden="true" className="relative h-px w-24 bg-current/25">
              <span
                className="absolute inset-y-0 left-0 bg-current transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              />
            </span>
          </div>
        ) : null}

        {/* `key`: SplitText rewrites the heading's DOM, so each question gets a fresh node. */}
        <h2
          key={done ? 'done' : step}
          data-step-title
          data-step-leave
          className="font-brico text-[clamp(2.4rem,7.5vw,6.5rem)] leading-[0.92] font-extrabold tracking-[-0.025em] uppercase"
        >
          <Colored text={title} shift={done ? 0 : step} />
        </h2>

        {done ? (
          <>
            <p data-step-rest data-step-leave className="mx-auto mt-6 max-w-[40ch] text-base leading-relaxed md:text-lg" role="status">
              {successBody}
            </p>
            <button
              type="button"
              data-step-rest
              data-step-leave
              onClick={restart}
              className="tpl-link tpl-hit relative mt-10 text-[11px] font-semibold tracking-[0.25em] uppercase md:text-xs"
            >
              {restartLabel}
            </button>
          </>
        ) : (
          <form noValidate onSubmit={onSubmit} className="mx-auto mt-6 max-w-2xl">
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute h-0 w-0 overflow-hidden opacity-0"
            />

            <p data-step-rest data-step-leave className="mx-auto max-w-[44ch] text-base leading-relaxed opacity-80 md:text-lg">
              {current.hint}
            </p>

            <div data-step-rest data-step-leave className="mt-10 flex items-end gap-4 text-left md:gap-5">
              <div className="group relative flex-1">
                <label htmlFor={`${uid}-${current.key}`} className="sr-only">
                  {current.title}
                </label>
                {current.type === 'textarea' ? (
                  <textarea
                    key={current.key}
                    id={`${uid}-${current.key}`}
                    ref={fieldRef}
                    rows={2}
                    value={values[current.key]}
                    placeholder={current.placeholder}
                    disabled={sending}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={error ? `${uid}-error` : undefined}
                    onKeyDown={onKeyDown}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, [current.key]: e.target.value }))
                      if (error) setError('')
                    }}
                    className={fieldClass}
                  />
                ) : (
                  <input
                    key={current.key}
                    id={`${uid}-${current.key}`}
                    ref={fieldRef}
                    type={current.type}
                    autoComplete={current.autoComplete}
                    value={values[current.key]}
                    placeholder={current.placeholder}
                    disabled={sending}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={error ? `${uid}-error` : undefined}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, [current.key]: e.target.value }))
                      if (error) setError('')
                    }}
                    className={fieldClass}
                  />
                )}
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-current/40" />
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 ease-out peer-focus:scale-x-100 motion-reduce:transition-none"
                  style={{ backgroundColor: error ? '#ff3ea5' : PALETTE[step % PALETTE.length] }}
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                aria-label={last ? sendLabel : nextLabel}
                aria-busy={sending || undefined}
                className="ui-press tpl-hit relative grid size-14 shrink-0 place-items-center rounded-[1.25rem] border border-current transition-[border-radius,background-color,color,transform] duration-300 ease-out hover:rounded-full hover:bg-[var(--cs-fg)] hover:text-[var(--cs-bg)] disabled:opacity-50 md:size-16"
                style={{ '--cs-fg': fg, '--cs-bg': bg }}
              >
                {sending ? <span className="text-[10px] font-bold tracking-[0.1em]">…</span> : ARROW}
              </button>
            </div>

            <div data-step-rest data-step-leave className="mt-3 flex min-h-6 items-start justify-between gap-4 text-left text-[11px] font-semibold tracking-[0.22em] uppercase md:text-xs">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={back}
                  disabled={sending}
                  className="tpl-link tpl-hit relative font-[inherit] tracking-[inherit] uppercase disabled:opacity-50"
                >
                  {backLabel}
                </button>
              ) : (
                <span aria-hidden="true" />
              )}
              <p id={`${uid}-error`} role="alert" className="text-right" style={{ color: '#ff3ea5' }}>
                {sending ? sendingLabel : error}
              </p>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
