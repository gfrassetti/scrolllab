import { useCallback, useEffect, useMemo, useState } from 'react'
import { LANGS, LANG_CODES, LANG_KEY, LANG_TAGS, LangContext, initialLang, translate, useLang } from './i18nCore'

/** Pone o cambia un `<meta>` o `<link>` del head (sin duplicar). */
function setHead(selector, attr, value) {
  const el = document.head.querySelector(selector)
  if (el) el.setAttribute(attr, value)
}

/**
 * El proveedor del idioma y el selector ES · EN · PT. Los hooks están en i18nCore. Con el idioma
 * cambian también `<html lang>`, la dirección (`?lang=`, sin recargar), el canonical y el locale de
 * Open Graph: cada versión se presenta con su propia URL.
 */
export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang)
  const setLang = useCallback((next) => {
    if (!LANG_CODES.includes(next)) return
    setLangState(next)
    try {
      window.localStorage.setItem(LANG_KEY, next)
    } catch {
      /* sin storage */
    }
  }, [])
  useEffect(() => {
    const [htmlLang, ogLocale] = LANG_TAGS[lang]
    document.documentElement.lang = htmlLang
    const url = new URL(window.location.href)
    if (lang === 'es') url.searchParams.delete('lang')
    else url.searchParams.set('lang', lang)
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
    const canonical = document.head.querySelector('link[rel="canonical"]')
    if (canonical) {
      const base = new URL(canonical.href)
      base.search = lang === 'es' ? '' : `?lang=${lang}`
      canonical.href = base.href
      setHead('meta[property="og:url"]', 'content', base.href)
    }
    setHead('meta[property="og:locale"]', 'content', ogLocale)
  }, [lang])
  const value = useMemo(() => ({ lang, setLang, t: (s, v) => translate(lang, s, v) }), [lang, setLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

/** Selector de idioma: ES · EN · PT. */
export function LangSwitch({ className = '', size = 'sm', color = '#f2e9dc', dim = 'rgba(242,233,220,0.45)', accent = '#ff7a1a' }) {
  const { lang, setLang, t } = useLang()
  const big = size === 'lg'
  return (
    <div role="group" aria-label={t('Idioma')} className={`c33-lang flex items-center ${className}`} style={{ color }}>
      {LANGS.map(([code, short, name], i) => (
        <span key={code} className="flex items-center">
          {i ? (
            <span aria-hidden="true" style={{ opacity: 0.25 }} className={big ? 'px-1.5 text-[13px]' : 'px-px text-[10px]'}>
              /
            </span>
          ) : null}
          <button
            type="button"
            lang={code}
            aria-pressed={lang === code}
            aria-label={name}
            title={name}
            onClick={() => setLang(code)}
            className={`tpl-hit relative inline-flex items-center justify-center font-semibold tracking-[0.14em] ${big ? 'h-11 min-w-11 px-2 text-[13px]' : 'h-8 min-w-8 px-1 text-[11px]'}`}
            style={{ fontFamily: "'Roboto Mono', ui-monospace, monospace", color: lang === code ? color : dim, transition: 'color 200ms ease-out' }}
          >
            {short}
            <span
              aria-hidden="true"
              className="absolute right-1 bottom-1.5 left-1 h-px origin-left"
              style={{ background: accent, transform: lang === code ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)' }}
            />
          </button>
        </span>
      ))}
    </div>
  )
}
