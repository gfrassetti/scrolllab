import { createContext, useContext, useMemo } from 'react'
import { DICT } from './i18nDict'
import { openStatus } from './brand'

/**
 * cāpsula33 — idiomas (el núcleo): español (el original), inglés y portugués (los turistas de
 * la zona son muchos brasileños).
 *
 * Las claves del diccionario son los textos en español tal como están escritos en el código:
 * `t('Nosotros')` devuelve la traducción o, si no hay, el mismo texto. Lo que lleva datos va
 * con marcadores: `t('Escala {n} / 07', { n: 3 })`. La elección queda guardada en el
 * navegador; la primera vez se toma del idioma del navegador (pt, en o, por defecto, es).
 */

export const LANGS = [
  ['es', 'ES', 'Español'],
  ['en', 'EN', 'English'],
  ['pt', 'PT', 'Português'],
]
export const LANG_KEY = 'c33-lang'
export const LANG_CODES = LANGS.map(([c]) => c)

export function initialLang() {
  try {
    const saved = window.localStorage.getItem(LANG_KEY)
    if (LANG_CODES.includes(saved)) return saved
  } catch {
    /* sin storage: el idioma del navegador */
  }
  const nav = (typeof navigator !== 'undefined' && (navigator.language || '')).toLowerCase()
  if (nav.startsWith('pt')) return 'pt'
  if (nav.startsWith('en')) return 'en'
  return 'es'
}

/** Traduce `es` a `lang` (con marcadores `{nombre}`); sin traducción devuelve el español. */
export function translate(lang, es, vars) {
  let out = (lang !== 'es' && DICT[lang]?.[es]) || es
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v))
  return out
}

export const LangContext = createContext({ lang: 'es', setLang: () => {}, t: (s, v) => translate('es', s, v) })

export const useLang = () => useContext(LangContext)

/** Si está abierto ahora y qué decir (en el idioma elegido). */
export function useStatus() {
  const { lang } = useLang()
  return useMemo(() => openStatus(new Date(), lang), [lang])
}
