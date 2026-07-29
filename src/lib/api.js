const API_BASE = import.meta.env.VITE_API_URL || ''

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
    throw new Error(data.error || `Error ${res.status}`)
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
  googleUrl: () => `${API_BASE}/api/auth/google`,
  orders: () => request('/api/orders'),
  checkout: (items) =>
    request('/api/checkout', { method: 'POST', body: JSON.stringify({ items }) }),
  mockPay: (orderId) =>
    request('/api/checkout/mock-pay', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }),
  downloadLink: (orderId) => request(`/api/orders/${orderId}/download`),
}
