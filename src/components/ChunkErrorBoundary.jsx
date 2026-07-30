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
 * Un reload limpia el HTML/cache y recupera la app.
 */
export default class ChunkErrorBoundary extends Component {
  state = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  componentDidCatch(error) {
    if (!isChunkLoadError(error)) return
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
    if (this.state.crashed) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-bone px-5 text-ink">
          <p className="text-[11px] uppercase tracking-[0.25em] text-ink/50">
            SCROLL LAB
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
