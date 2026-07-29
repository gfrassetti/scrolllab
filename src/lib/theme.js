import { create } from 'zustand'

const KEY = 'scrolllab-theme'

function readInitial() {
  try {
    const value = localStorage.getItem(KEY)
    if (value === 'dark' || value === 'light') return value
  } catch {
    /* localStorage bloqueado */
  }
  return 'light'
}

function apply(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#131313' : '#f2efe9')
  }
}

/**
 * Tema del market (light/dark grafito). Persistido en localStorage;
 * index.html aplica la clase antes del primer paint para evitar flash.
 */
export const useTheme = create((set, get) => ({
  theme: readInitial(),
  toggle: () => {
    const theme = get().theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* localStorage bloqueado */
    }
    apply(theme)
    set({ theme })
  },
}))

apply(readInitial())
