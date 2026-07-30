import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { SITE_NAME } from '../lib/site'
import { useT } from '../i18n'

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export default function LoginPage() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const error = params.get('error')
  const t = useT()

  useEffect(() => {
    if (user) navigate('/account', { replace: true })
  }, [user, navigate])

  const devLogin = async () => {
    await api.devLogin({ email: 'dev@scrolllab.com', name: 'Dev Buyer' })
    await refresh()
    navigate('/account')
  }

  return (
    <div className="min-h-svh bg-bone text-ink">
      <SiteHeader />
      <main className="mx-auto flex max-w-lg flex-col gap-8 px-5 py-16 md:px-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
            {t('login.eyebrow')}
          </p>
          <h1 className="mt-3 text-[clamp(2rem,5vw,3.2rem)] leading-[1.05] font-medium tracking-[-0.02em]">
            {t('login.title')}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink/70">
            {t('login.body', { site: SITE_NAME })}
          </p>
        </div>

        {error && (
          <p className="border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            {error === 'google_not_configured'
              ? import.meta.env.DEV
                ? t('login.errorNotConfiguredDev')
                : t('login.errorNotConfiguredProd')
              : t('login.errorGoogle')}
          </p>
        )}

        <a
          href={api.googleUrl()}
          className="flex items-center justify-center gap-3 border-2 border-ink bg-ink px-6 py-4 text-center text-xs font-medium uppercase tracking-[0.25em] text-bone transition-colors hover:bg-accent hover:border-accent"
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-bone">
            <GoogleLogo />
          </span>
          {t('login.google')}
        </a>

        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={devLogin}
            className="border border-ink/30 px-6 py-4 text-xs uppercase tracking-[0.25em] transition-colors hover:border-ink"
          >
            {t('login.devLogin')}
          </button>
        )}

        <Link
          to="/legal/license"
          className="text-[11px] uppercase tracking-[0.25em] text-ink/50 hover:text-accent"
        >
          {t('common.licenseLink')}
        </Link>
      </main>
    </div>
  )
}
