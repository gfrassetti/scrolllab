import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

const SESSION_HINT_KEY = 'scrolllab-had-session'

const AuthContext = createContext({
  user: null,
  loading: true,
  hadSession: false,
  refresh: async () => {},
  logout: async () => {},
})

/**
 * Pista del último estado conocido: evita que el chrome parpadee entre
 * "Entrar" y "Mis compras" mientras /api/auth/me está en vuelo.
 */
function readSessionHint() {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1'
  } catch {
    return false
  }
}

function writeSessionHint(value) {
  try {
    if (value) localStorage.setItem(SESSION_HINT_KEY, '1')
    else localStorage.removeItem(SESSION_HINT_KEY)
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hadSession, setHadSession] = useState(readSessionHint)

  const refresh = async () => {
    try {
      const data = await api.me()
      setUser(data.user)
      setHadSession(Boolean(data.user))
      writeSessionHint(Boolean(data.user))
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const logout = async () => {
    await api.logout()
    setUser(null)
    setHadSession(false)
    writeSessionHint(false)
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, hadSession, refresh, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Se llama al arrancar un flujo OAuth: al volver del proveedor el chrome ya
 * asume sesión y no arranca mostrando "Entrar".
 */
export function markSessionIntent() {
  writeSessionHint(true)
}

export function useAuth() {
  return useContext(AuthContext)
}
