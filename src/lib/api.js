function resolveApiBase() {
  const envBase = (import.meta.env && import.meta.env.VITE_API_URL) || ''
  if (import.meta.env?.PROD && typeof window !== 'undefined') {
    const host = window.location.hostname
    // Prod front on Vercel: /api is rewritten to Railway — same-origin cookies.
    if (host === 'scrolllab.com.ar' || host === 'www.scrolllab.com.ar') {
      return ''
    }
  }
  return envBase
}

const API_BASE = resolveApiBase()

export const SESSION_LOST_EVENT = 'scrolllab:session-lost'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  // La sesión se cerró del lado del servidor (venció, reinicio en dev) pero la
  // pantalla todavía te muestra adentro: avisa para que AuthProvider la
  // vuelva a pedir y la UI muestre «Entrá» en vez de errores sueltos.
  if (res.status === 401 && path !== '/api/auth/me' && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_LOST_EVENT))
  }
  if (!res.ok) {
    const error = new Error(data.error || `Error ${res.status}`)
    error.status = res.status
    // `code` y `details` (opcionales) distinguen errores con el mismo status.
    error.code = data.code || ''
    error.details = data.details || null
    // El requestId es lo único que ata este error al log del servidor.
    error.requestId = data.requestId || res.headers.get('x-request-id') || ''
    throw error
  }
  return data
}

export const api = {
  base: API_BASE,
  me: () => request('/api/auth/me'),
  catalog: () => request('/api/catalog'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  devLogin: (body) =>
    request('/api/auth/dev-login', { method: 'POST', body: JSON.stringify(body || {}) }),
  // Entrar con un link por mail: pedirlo (responde igual exista o no la cuenta) y canjearlo.
  emailLogin: ({ email, next, locale }) =>
    request('/api/auth/email', { method: 'POST', body: JSON.stringify({ email, next, locale }) }),
  emailLoginVerify: (token) =>
    request('/api/auth/email/verify', { method: 'POST', body: JSON.stringify({ token }) }),
  googleUrl: (next) => {
    const url = `${API_BASE}/api/auth/google`
    if (!next) return url
    const q = new URLSearchParams({ next: String(next) })
    return `${url}?${q}`
  },
  orders: () => request('/api/orders'),
  // Botón de arrepentimiento: público, devuelve solo el código de seguimiento.
  requestWithdrawal: ({ name, email, order, message, locale }) =>
    request('/api/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ name, email, order, message, locale }),
    }),
  // El link «Confirmar la devolución» del mail.
  // Con sesión: sus compras y su suscripción para elegir en el Botón de arrepentimiento.
  withdrawalOptions: () => request('/api/withdrawals/options'),
  confirmWithdrawal: (token) =>
    request('/api/withdrawals/confirm', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  // El cupón viaja como código: el descuento lo calcula el servidor.
  // `provider`: 'mercadopago' (ARS) o 'lemonsqueezy' / 'polar' (USD, cobro internacional).
  checkout: (items, couponCode, { provider, locale } = {}) =>
    request('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        items,
        ...(couponCode ? { couponCode } : {}),
        ...(provider ? { provider } : {}),
        ...(locale ? { locale } : {}),
      }),
    }),
  // Qué pasarelas hay y desde qué país viene el request (default del selector).
  checkoutMethods: () => request('/api/checkout/methods'),
  // Vuelta de Lemon Squeezy: cómo va la orden (409 mientras el webhook no llegó).
  confirmLemonCheckout: (orderId) =>
    request('/api/checkout/lemonsqueezy/confirm', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }),
  // Vuelta de Polar: igual.
  confirmPolarCheckout: (orderId) =>
    request('/api/checkout/polar/confirm', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }),
  // Cupón de bienvenida de quien tiene sesión: lo crea la primera vez (y manda el mail).
  welcomeCoupon: (body) =>
    request('/api/coupons/welcome', {
      method: 'POST',
      body: JSON.stringify(body || {}),
    }),
  mockPay: (orderId) =>
    request('/api/checkout/mock-pay', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }),
  confirmCheckout: ({ paymentId, orderId }) =>
    request('/api/checkout/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentId, orderId }),
    }),
  // `item` (índice): el ZIP de ese ítem solo; sin él, el de la orden entera.
  downloadLink: (orderId, item) =>
    request(`/api/orders/${orderId}/download${Number.isInteger(item) ? `?item=${item}` : ''}`),

  // Hosted Components (LAB) — docs/hosted-component-plan.md
  embedLoader: () => request('/api/embed/loader'),
  hostedSections: () => request('/api/hosted/sections'),
  hostedList: () => request('/api/hosted'),
  hostedGet: (id) => request(`/api/hosted/${id}`),
  hostedCreate: (sectionId) =>
    request('/api/hosted', {
      method: 'POST',
      body: JSON.stringify({ sectionId }),
    }),
  hostedUpdate: (id, body) =>
    request(`/api/hosted/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body || {}),
    }),
  hostedDelete: (id) =>
    request(`/api/hosted/${id}`, { method: 'DELETE' }),
  // Link de edición para el cliente del dueño (docs/hosted-component-plan.md, Fase J)
  hostedEditLinkCreate: (id) => request(`/api/hosted/${id}/edit-link`, { method: 'POST' }),
  hostedEditLinkRevoke: (id) => request(`/api/hosted/${id}/edit-link`, { method: 'DELETE' }),
  sharedEditGet: (token) => request(`/api/hosted-edit/${encodeURIComponent(token)}`),
  sharedEditUpdate: (token, body) =>
    request(`/api/hosted-edit/${encodeURIComponent(token)}`, {
      method: 'PUT',
      body: JSON.stringify(body || {}),
    }),
  // Proyectos del builder: composiciones guardadas en la cuenta.
  builderProjects: () => request('/api/builder-projects'),
  builderProject: (id) => request(`/api/builder-projects/${id}`),
  builderProjectCreate: (body) =>
    request('/api/builder-projects', { method: 'POST', body: JSON.stringify(body || {}) }),
  // `keepalive`: el último guardado sale aunque se esté cerrando la pestaña.
  builderProjectUpdate: (id, body, { keepalive = false } = {}) =>
    request(`/api/builder-projects/${id}`, { method: 'PUT', body: JSON.stringify(body || {}), keepalive }),
  builderProjectDelete: (id) => request(`/api/builder-projects/${id}`, { method: 'DELETE' }),
  // Packs: varias secciones del usuario bajo un solo script.
  packList: () => request('/api/hosted-packs'),
  packGet: (id) => request(`/api/hosted-packs/${id}`),
  packCreate: (body) =>
    request('/api/hosted-packs', {
      method: 'POST',
      body: JSON.stringify(body || {}),
    }),
  packUpdate: (id, body) =>
    request(`/api/hosted-packs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body || {}),
    }),
  packDelete: (id) =>
    request(`/api/hosted-packs/${id}`, { method: 'DELETE' }),

  // `qa`: los planes de prueba (solo cuentas de QA_BUYER_EMAILS, src/domain/qa.js).
  subscriptionPlans: ({ qa = false } = {}) =>
    request(qa ? '/api/subscriptions/plans?qa=1' : '/api/subscriptions/plans'),
  subscriptionMe: () => request('/api/subscriptions/me'),
  subscribe: (plan, cycle, { provider, locale, qa = false } = {}) =>
    request('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        plan,
        cycle,
        ...(provider ? { provider } : {}),
        ...(locale ? { locale } : {}),
        ...(qa ? { qa: true } : {}),
      }),
    }),
  // Link de Lemon Squeezy para cambiar la tarjeta de la suscripción.
  subscriptionPaymentMethod: () => request('/api/subscriptions/payment-method'),
  subscriptionMockActivate: (url) => request(url, { method: 'POST' }),
  subscriptionSync: () =>
    request('/api/subscriptions/sync', { method: 'POST' }),
  subscriptionChange: (plan) =>
    request('/api/subscriptions/change', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),
  subscriptionChangeQuote: (plan) =>
    request(`/api/subscriptions/change/quote?plan=${encodeURIComponent(plan)}`),
  subscriptionUpgradeConfirm: (paymentId) =>
    request('/api/subscriptions/upgrade/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentId }),
    }),
  subscriptionUpgradeMockPay: (url) => request(url, { method: 'POST' }),
  subscriptionCancel: () =>
    request('/api/subscriptions/cancel', { method: 'POST' }),
}
