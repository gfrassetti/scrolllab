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
  if (!res.ok) {
    const error = new Error(data.error || `Error ${res.status}`)
    error.status = res.status
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
  googleUrl: (next) => {
    const url = `${API_BASE}/api/auth/google`
    if (!next) return url
    const q = new URLSearchParams({ next: String(next) })
    return `${url}?${q}`
  },
  orders: () => request('/api/orders'),
  checkout: (items) =>
    request('/api/checkout', { method: 'POST', body: JSON.stringify({ items }) }),
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
  downloadLink: (orderId) => request(`/api/orders/${orderId}/download`),

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

  subscriptionPlans: () => request('/api/subscriptions/plans'),
  subscriptionMe: () => request('/api/subscriptions/me'),
  subscribe: (plan, cycle) =>
    request('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ plan, cycle }),
    }),
  subscriptionMockActivate: (url) => request(url, { method: 'POST' }),
  subscriptionSync: () =>
    request('/api/subscriptions/sync', { method: 'POST' }),
  subscriptionChange: (plan) =>
    request('/api/subscriptions/change', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),
  subscriptionCancel: () =>
    request('/api/subscriptions/cancel', { method: 'POST' }),
}
