import { Component } from 'react'

const RELOAD_KEY = 'scrolllab-chunk-reload'

function isChunkLoadError(error) {
  const msg = String(error?.message || error || '')
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg)
  )
}

/**
 * Tras un deploy, tabs abiertas pueden pedir chunks con hash viejo.
 * Solo ese caso se recupera con un reload; cualquier otro error se propaga
 * para no enmascarar bugs reales con un cartel de "versión nueva".
 */
export default class ChunkErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (!isChunkLoadError(error) || import.meta.env.DEV) return
    try {
      if (sessionStorage.getItem(RELOAD_KEY) === '1') {
        sessionStorage.removeItem(RELOAD_KEY)
        return
      }
      sessionStorage.setItem(RELOAD_KEY, '1')
      window.location.reload()
    } catch {
      window.location.reload()
    }
  }

  componentDidMount() {
    try {
      sessionStorage.removeItem(RELOAD_KEY)
    } catch {
      /* ignore */
    }
  }

  render() {
    const { error } = this.state

    if (error && (import.meta.env.DEV || !isChunkLoadError(error))) {
      throw error
    }

    if (error) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-bone px-5 text-ink">
          <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
            SCROLLLAB
          </p>
          <p className="max-w-[36ch] text-center text-sm text-ink/70">
            Hay una versión nueva del sitio. Recargá la página.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="border-2 border-ink bg-ink px-5 py-2.5 text-[11px] uppercase tracking-[0.25em] text-bone"
          >
            Recargar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
