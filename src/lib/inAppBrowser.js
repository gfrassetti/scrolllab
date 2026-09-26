/**
 * ¿La página se abrió dentro del navegador integrado de una app (Instagram,
 * TikTok, Facebook…)? Google bloquea el inicio de sesión en esos navegadores
 * ("Error 403: disallowed_useragent") y las compras acá exigen entrar con
 * Google: el tráfico que llega desde un video llega justo por ahí.
 *
 * Es por user agent y de mejor esfuerzo: sirve para avisar y sugerir abrir el
 * link en Chrome o Safari, nunca para bloquear nada.
 */

const NAMED_APPS = [
  ['Instagram', /Instagram/i],
  ['Facebook', /FBAN|FBAV|FB_IAB|FBIOS/],
  ['TikTok', /TikTok|musical_ly|BytedanceWebview|trill_/i],
  ['LinkedIn', /LinkedInApp/i],
  ['Snapchat', /Snapchat/i],
  ['Pinterest', /Pinterest/i],
  ['Line', /\bLine\//],
]

const IOS = /iPhone|iPad|iPod/

/**
 * @param {string} [ua] navigator.userAgent
 * @returns {{ inApp: boolean, app: string }} `app` va vacío si es un WebView sin nombre conocido
 */
export function detectInAppBrowser(ua = '') {
  const named = NAMED_APPS.find(([, re]) => re.test(ua))
  if (named) return { inApp: true, app: named[0] }

  // WebView de Android: Chrome lo marca con "; wv)".
  if (/;\s*wv\)/.test(ua)) return { inApp: true, app: '' }

  // WKWebView de iOS: los navegadores de verdad (Safari, Chrome, Firefox, Edge) llevan "Safari/".
  if (IOS.test(ua) && !/Safari\//.test(ua)) return { inApp: true, app: '' }

  return { inApp: false, app: '' }
}
