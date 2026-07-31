import { randomUUID } from 'node:crypto'

/** localStorage / sessionStorage en memoria para node:test. */
export function createMemoryStorage() {
  const map = new Map()
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(String(key), String(value))
    },
    removeItem: (key) => {
      map.delete(key)
    },
    clear: () => {
      map.clear()
    },
  }
}

/** Instala mocks globales (llamar antes de importar módulos con persist). */
export function installBrowserStorageMocks() {
  if (!globalThis.localStorage) {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      writable: true,
      configurable: true,
    })
  }
  if (!globalThis.sessionStorage) {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: createMemoryStorage(),
      writable: true,
      configurable: true,
    })
  }
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    Object.defineProperty(globalThis, 'crypto', {
      value: { ...(globalThis.crypto || {}), randomUUID },
      configurable: true,
    })
  }
  // zustand/persist trata Node como SSR si no hay `window`
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis
  }
}
