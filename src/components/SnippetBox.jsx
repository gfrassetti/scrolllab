import { useState } from 'react'
import { embedSnippet, EMBED_VARIANTS } from '../lib/embed'
import { useAuth } from '../lib/auth'
import { useI18n } from '../i18n'

const LABELS = { html: 'HTML', react: 'React', next: 'Next.js', vue: 'Vue' }

/**
 * Snippet del embed con selector de stack (HTML · React · Next.js · Vue).
 * Solo se muestra a usuarios logueados: la key pública de una instancia es
 * revocable pero igual no tiene por qué verla nadie sin sesión.
 */
export default function SnippetBox({ embedKey, loaderInfo }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const [variant, setVariant] = useState('html')
  const [copied, setCopied] = useState(false)

  const code = embedSnippet(embedKey, loaderInfo, variant)

  if (!user) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard bloqueado */
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
          {t('lab.snippet')}
        </p>
        <span aria-hidden="true" className="text-ink/25">
          ·
        </span>
        <div className="flex flex-wrap gap-1">
          {EMBED_VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              aria-pressed={variant === v}
              className={`border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                variant === v
                  ? 'border-accent bg-accent text-ink'
                  : 'border-ink/25 text-ink/55 hover:border-ink/50'
              }`}
            >
              {LABELS[v] || v}
            </button>
          ))}
        </div>
      </div>

      <pre className="max-h-[340px] overflow-auto border border-ink/15 bg-ink/[0.03] p-3 text-xs leading-relaxed">
        {code}
      </pre>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="ui-press text-[11px] uppercase tracking-[0.2em] text-ink/60 hover:text-accent"
        >
          {copied ? t('lab.copied') : t('lab.copy')}
        </button>
        {variant !== 'html' && (
          <span className="max-w-[56ch] text-xs leading-relaxed text-ink/45">
            {t('lab.snippetStack')}
          </span>
        )}
      </div>
    </div>
  )
}
