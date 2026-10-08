/**
 * Paddle.js (overlay de checkout) para el cobro internacional en USD. El
 * servidor arma la transacción con los precios; acá solo se abre el overlay
 * sobre esa transacción y se espera a que termine o se cierre. Ver
 * docs/paddle.md.
 */

const PADDLE_JS = 'https://cdn.paddle.com/paddle/v2/paddle.js'
/** Si en este tiempo Paddle no avisa que el overlay cargó, no va a abrir (adblock, red). */
export const PADDLE_LOAD_TIMEOUT_MS = 20_000

let loading = null
let initializedToken = null
/** El overlay es uno solo: el handler activo recibe los eventos de Paddle. */
let onEvent = null

/** Mensaje en el idioma del sitio (esto corre fuera de React). */
function msg(es, en) {
  if (typeof document === 'undefined') return es
  return document.documentElement.lang?.toLowerCase().startsWith('en') ? en : es
}

const loadFailed = () =>
  msg(
    'No pudimos abrir el pago con tarjeta. Revisá tu conexión (o un bloqueador de anuncios) y probá de nuevo, o pagá con Mercado Pago.',
    'We couldn’t open the card payment. Check your connection (or an ad blocker) and try again.',
  )

export function loadPaddle() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Sin navegador'))
  if (window.Paddle) return Promise.resolve(window.Paddle)
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = PADDLE_JS
      script.async = true
      // Un bloqueador puede dejar el script a medias: sin `window.Paddle` no se
      // guarda la promesa fallida, el próximo intento vuelve a cargarlo.
      const fail = () => {
        loading = null
        script.remove()
        reject(new Error(loadFailed()))
      }
      script.onload = () => (window.Paddle ? resolve(window.Paddle) : fail())
      script.onerror = fail
      document.head.appendChild(script)
    })
  }
  return loading
}

/**
 * Carga e inicializa Paddle.js una sola vez (Paddle no deja re-inicializarlo).
 * `handler` recibe todos los eventos (la página /checkout/pay lo usa para los
 * links `?_ptxn=`). `fresh` dice si se inicializó recién: en ese caso Paddle
 * abre solo el `_ptxn` de la URL.
 * @param {{ environment: string, clientToken: string, handler?: (event: any) => void }} opts
 * @returns {Promise<{ Paddle: any, fresh: boolean }>}
 */
export async function ensurePaddle({ environment, clientToken, handler }) {
  const Paddle = await loadPaddle()
  if (handler) onEvent = handler
  if (initializedToken && initializedToken !== clientToken) {
    throw new Error(msg('Recargá la página para pagar.', 'Reload the page to pay.'))
  }
  let fresh = false
  if (!initializedToken) {
    if (environment === 'sandbox') Paddle.Environment.set('sandbox')
    Paddle.Initialize({
      token: clientToken,
      eventCallback: (event) => onEvent?.(event),
    })
    initializedToken = clientToken
    fresh = true
  }
  return { Paddle, fresh }
}

/**
 * Abre el overlay sobre una transacción del servidor. Resuelve
 * `{ status: 'completed' | 'closed', transactionId }`: completo cuando Paddle
 * cobró (el overlay se cierra solo), cerrado si el comprador se fue antes.
 * Rechaza (con un mensaje para el comprador) si Paddle no lo puede abrir
 * (`checkout.error`) o si no termina de cargar a tiempo: nunca deja el botón
 * de pagar girando para siempre. Una tarjeta rechazada no termina nada: el
 * overlay sigue abierto para probar otra.
 * @param {{ environment: string, clientToken: string, transactionId: string, email?: string, locale?: string, loadTimeoutMs?: number }} opts
 */
export async function openPaddleCheckout({
  environment,
  clientToken,
  transactionId,
  email,
  locale,
  loadTimeoutMs = PADDLE_LOAD_TIMEOUT_MS,
}) {
  const { Paddle } = await ensurePaddle({ environment, clientToken })
  return new Promise((resolve, reject) => {
    let done = false
    let watchdog = null
    const finish = (fn) => {
      done = true
      clearTimeout(watchdog)
      fn()
    }
    onEvent = (event) => {
      if (done) return
      const name = event?.name
      if (name === 'checkout.loaded') {
        clearTimeout(watchdog)
      } else if (name === 'checkout.completed') {
        finish(() => {
          Paddle.Checkout.close()
          resolve({ status: 'completed', transactionId: event.data?.transaction_id || transactionId })
        })
      } else if (name === 'checkout.closed') {
        finish(() => resolve({ status: 'closed', transactionId }))
      } else if (name === 'checkout.error') {
        finish(() => {
          Paddle.Checkout.close()
          reject(new Error(loadFailed()))
        })
      }
    }
    watchdog = setTimeout(() => {
      if (done) return
      finish(() => {
        try {
          Paddle.Checkout.close()
        } catch {
          /* no llegó a abrir */
        }
        reject(new Error(loadFailed()))
      })
    }, loadTimeoutMs)
    Paddle.Checkout.open({
      transactionId,
      ...(email ? { customer: { email } } : {}),
      settings: {
        displayMode: 'overlay',
        variant: 'one-page',
        theme: 'light',
        locale: locale === 'en' ? 'en' : 'es',
        allowLogout: false,
        // Los descuentos van en nuestro precio (cupón): uno escrito en el
        // checkout de Paddle cobraría menos y el servidor no entregaría.
        showAddDiscounts: false,
      },
    })
  })
}
