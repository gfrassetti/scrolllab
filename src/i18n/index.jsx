import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import es from './locales/es.json'
import en from './locales/en.json'

const KEY = 'scrolllab-locale'
const MESSAGES = { es, en }
export const LOCALES = ['es', 'en']

function readInitial() {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'es' || stored === 'en') return stored
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'es'
  return nav.toLowerCase().startsWith('en') ? 'en' : 'es'
}

function lookup(dict, path) {
  return path.split('.').reduce((acc, key) => {
    if (acc == null) return undefined
    return acc[key]
  }, dict)
}

function interpolate(str, vars = {}) {
  return String(str).replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : `{{${key}}}`,
  )
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(readInitial)

  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'es-AR'
    try {
      localStorage.setItem(KEY, locale)
    } catch {
      /* ignore */
    }
  }, [locale])

  const setLocale = useCallback((next) => {
    if (next === 'es' || next === 'en') setLocaleState(next)
  }, [])

  const t = useCallback(
    (path, vars) => {
      const primary = lookup(MESSAGES[locale], path)
      const fallback = lookup(MESSAGES.es, path)
      const value = primary ?? fallback ?? path
      if (typeof value === 'string') return interpolate(value, vars)
      return value
    },
    [locale],
  )

  const value = useMemo(
    () => ({ locale, setLocale, t, messages: MESSAGES[locale] }),
    [locale, setLocale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

export function useT() {
  return useI18n().t
}
