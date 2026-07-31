import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Tabs abiertas tras un deploy: un chunk con hash viejo falla → reload una vez.
// En dev no interferimos: Vite ya recarga solo y así no se tapan errores.
window.addEventListener('vite:preloadError', (event) => {
  if (import.meta.env.DEV) return
  event.preventDefault()
  const key = 'scrolllab-chunk-reload'
  try {
    if (sessionStorage.getItem(key) === '1') {
      sessionStorage.removeItem(key)
      return
    }
    sessionStorage.setItem(key, '1')
  } catch {
    /* ignore */
  }
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
