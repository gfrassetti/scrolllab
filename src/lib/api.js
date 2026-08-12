const API_BASE = (import.meta.env && import.meta.env.VITE_API_URL) || ''

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
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
}
