import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { sanitizeAuthReturn } from '../lib/authReturn'
import { useT } from '../i18n'

/**
 * Adonde lleva el link del mail (`/login/email?token=…`). Entrar es un botón y
 * no algo automático: los antivirus de mail abren los links para revisarlos, y
 * con un canje automático gastarían el link antes que la persona.
 */
export default function LoginEmailPage() {
  const t = useT()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [state, setState] = useState(token ? 'idle' : 'invalid') // idle | working | invalid | error
  const [error, setError] = useState('')

  const enter = async () => {
    if (state === 'working') return
    setState('working')
    setError('')
    try {
      const { next } = await api.emailLoginVerify(token)
      await refresh()
      navigate(sanitizeAuthReturn(next) || '/account', { replace: true })
    } catch (err) {
      setError(err?.status === 410 || err?.status === 400 ? t('loginEmail.expired') : err.message)
      setState('error')
    }
  }

  return (
    <div className="min-h-svh bg-bone text-ink">
      <SiteHeader />
      <main className="mx-auto flex max-w-lg flex-col gap-8 px-5 py-16 md:px-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">{t('loginEmail.eyebrow')}</p>
          <h1 className="mt-3 text-[clamp(2rem,5vw,3.2rem)] leading-[1.05] font-medium tracking-[-0.02em]">
            {t('loginEmail.title')}
          </h1>
          {state !== 'invalid' && <p className="mt-4 text-sm leading-relaxed text-ink/70">{t('loginEmail.body')}</p>}
        </div>

        {(state === 'invalid' || state === 'error') && (
          <p role="alert" className="border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            {state === 'invalid' ? t('loginEmail.invalid') : error}
          </p>
        )}

        {state === 'idle' || state === 'working' ? (
          <button
            type="button"
            onClick={enter}
            disabled={state === 'working'}
            className="border-2 border-ink bg-ink px-6 py-4 text-xs font-medium uppercase tracking-[0.25em] text-bone transition-colors hover:border-accent hover:bg-accent hover:text-on-accent disabled:opacity-60"
          >
            {state === 'working' ? t('loginEmail.working') : t('loginEmail.submit')}
          </button>
        ) : (
          <Link
            to="/login"
            className="border-2 border-ink px-6 py-4 text-center text-xs font-medium uppercase tracking-[0.25em] transition-colors hover:bg-ink hover:text-bone"
          >
            {t('loginEmail.again')}
          </Link>
        )}
      </main>
    </div>
  )
}
