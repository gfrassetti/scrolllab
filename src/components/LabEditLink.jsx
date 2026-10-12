import { useState } from 'react'
import { api } from '../lib/api'
import { useI18n } from '../i18n'

/**
 * Link de edición para el cliente del dueño (Fase J). Vive en el editor del
 * widget. El token se muestra UNA vez (en el server queda su hash): si se pierde,
 * se genera otro y el anterior deja de andar.
 */
export default function LabEditLink({ inst, onChange }) {
  const { t, locale } = useI18n()
  // El token de esta sesión (recién creado); después de recargar ya no está.
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  // 'rotate' | 'revoke' | null — confirmación en línea de lo que corta el link actual.
  const [confirming, setConfirming] = useState(null)

  const url = token ? `${window.location.origin}/lab/editar/${token}` : ''
  const since = inst.editLinkCreatedAt
    ? new Date(inst.editLinkCreatedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR')
    : ''

  const run = async (fn) => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  const create = () =>
    run(async () => {
      const { token: next, instance } = await api.hostedEditLinkCreate(inst.id)
      setToken(next)
      setCopied(false)
      onChange(instance)
    })

  const revoke = () =>
    run(async () => {
      const { instance } = await api.hostedEditLinkRevoke(inst.id)
      setToken('')
      onChange(instance)
    })

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* el campo es de solo lectura y se puede seleccionar a mano */
    }
  }

  const btn =
    'ui-press border border-ink/40 px-4 py-2 text-[11px] uppercase tracking-[0.25em] hover:border-ink disabled:opacity-40'

  return (
    <section className="mt-8 border-t border-ink/15 pt-6" aria-labelledby="share-title">
      <h2 id="share-title" className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
        {t('lab.share.title')}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink/65">{t('lab.share.body')}</p>

      {!inst.hasEditLink ? (
        <button type="button" onClick={create} disabled={busy} className={`${btn} mt-4`}>
          {t('lab.share.create')}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          {token ? (
            <>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={url}
                  aria-label={t('lab.share.title')}
                  onFocus={(e) => e.target.select()}
                  className="min-w-0 flex-1 border border-ink/20 bg-transparent px-3 py-2 font-mono text-xs text-ink outline-none focus:border-ink"
                />
                <button type="button" onClick={copy} className={btn}>
                  {copied ? t('lab.copied') : t('lab.copy')}
                </button>
              </div>
              <p className="text-xs text-ink/50">{t('lab.share.once')}</p>
            </>
          ) : (
            <p className="text-xs text-ink/55">{t('lab.share.active', { date: since })}</p>
          )}

          {confirming ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
              <span>{t(confirming === 'rotate' ? 'lab.share.rotateConfirm' : 'lab.share.revokeConfirm')}</span>
              <button
                type="button"
                onClick={confirming === 'rotate' ? create : revoke}
                disabled={busy}
                className={btn}
              >
                {t('lab.share.yes')}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="text-[11px] uppercase tracking-[0.2em] text-ink/50 hover:text-ink"
              >
                {t('lab.share.no')}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setConfirming('rotate')} disabled={busy} className={btn}>
                {t('lab.share.rotate')}
              </button>
              <button
                type="button"
                onClick={() => setConfirming('revoke')}
                disabled={busy}
                className="px-2 py-2 text-[11px] uppercase tracking-[0.2em] text-ink/40 hover:text-danger disabled:opacity-40"
              >
                {t('lab.share.revoke')}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
          {error}
        </p>
      )}
    </section>
  )
}
