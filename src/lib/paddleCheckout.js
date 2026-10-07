/**
 * Paddle.js (overlay de checkout) para el cobro internacional en USD. El
 * servidor arma la transacción con los precios; acá solo se abre el overlay
 * sobre esa transacción y se espera a que termine o se cierre. Ver
 * docs/paddle.md.
 */

const PADDLE_JS = 'https://cdn.paddle.com/paddle/v2/paddle.js'

let loading = null
let initializedToken = null
/** El overlay es uno solo: el handler activo recibe los eventos de Paddle. */
let onEvent = null

export function loadPaddle() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Sin navegador'))
  if (window.Paddle) return Promise.resolve(window.Paddle)
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = PADDLE_JS
      script.async = true
      script.onload = () =>
        window.Paddle ? resolve(window.Paddle) : reject(new Error('Paddle.js no cargó'))
      script.onerror = () => {
        loading = null
        script.remove()
        reject(new Error('No pudimos abrir el pago internacional. Revisá tu conexión y probá de nuevo.'))
      }
      document.head.appendChild(script)
    })
  }
  return loading
}

/**
 * Carga e inicializa Paddle.js una sola vez por token. `handler` recibe todos
 * los eventos (la página /checkout/pay lo usa para los links `?_ptxn=`).
 * @param {{ environment: string, clientToken: string, handler?: (event: any) => void }} opts
 */
export async function ensurePaddle({ environment, clientToken, handler }) {
  const Paddle = await loadPaddle()
  if (handler) onEvent = handler
  if (initializedToken !== clientToken) {
    if (environment === 'sandbox') Paddle.Environment.set('sandbox')
    Paddle.Initialize({
      token: clientToken,
      eventCallback: (event) => onEvent?.(event),
    })
    initializedToken = clientToken
  }
  return Paddle
}

/**
 * Abre el overlay sobre una transacción del servidor. Resuelve
 * `{ status: 'completed' | 'closed', transactionId }`: completo cuando Paddle
 * cobró (el overlay se cierra solo), cerrado si el comprador se fue antes.
 * @param {{ environment: string, clientToken: string, transactionId: string, email?: string, locale?: string }} opts
 */
export async function openPaddleCheckout({ environment, clientToken, transactionId, email, locale }) {
  const Paddle = await ensurePaddle({ environment, clientToken })
  return new Promise((resolve) => {
    let done = false
    onEvent = (event) => {
      if (done) return
      if (event?.name === 'checkout.completed') {
        done = true
        Paddle.Checkout.close()
        resolve({ status: 'completed', transactionId: event.data?.transaction_id || transactionId })
      } else if (event?.name === 'checkout.closed') {
        done = true
        resolve({ status: 'closed', transactionId })
      }
    }
    Paddle.Checkout.open({
      transactionId,
      ...(email ? { customer: { email } } : {}),
      settings: {
        displayMode: 'overlay',
        variant: 'one-page',
        theme: 'light',
        locale: locale === 'en' ? 'en' : 'es',
        allowLogout: false,
      },
    })
  })
}
