import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'
import { useAuth } from './auth'

const EMPTY = {
  plan: 'free',
  cycle: null,
  quota: 0,
  used: 0,
  canPublish: true,
  subscriptionStatus: null,
  canceledAt: null,
  createdAt: null,
  currentPeriodEnd: null,
  loading: true,
}

const PlanContext = createContext({ ...EMPTY, refresh: async () => {} })

/**
 * Estado de plan/cuota (LAB), compartido entre el nav, /lab y /account — una
 * sola fuente, un solo fetch, en vez de que cada componente pida
 * `/api/subscriptions/me` por su cuenta y puedan mostrar cosas distintas.
 * La fuente de verdad real sigue siendo el servidor (`assertCanPublish`):
 * esto es solo la copia de lectura para la UI.
 */
export function PlanProvider({ children }) {
  const { user } = useAuth()
  const [state, setState] = useState(EMPTY)

  const refresh = useCallback(async () => {
    if (!user) {
      setState((s) => ({ ...s, loading: false }))
      return
    }
    try {
      const d = await api.subscriptionMe()
      setState({
        plan: d.plan,
        cycle: d.cycle ?? null,
        quota: d.quota,
        used: d.used,
        canPublish: d.canPublish,
        subscriptionStatus: d.subscriptionStatus ?? null,
        canceledAt: d.canceledAt ?? null,
        createdAt: d.createdAt ?? null,
        currentPeriodEnd: d.currentPeriodEnd ?? null,
        loading: false,
      })
    } catch {
      setState((s) => ({ ...s, loading: false }))
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setState({ ...EMPTY, loading: false })
      return
    }
    refresh()
  }, [user, refresh])

  return (
    <PlanContext.Provider value={{ ...state, refresh }}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan() {
  return useContext(PlanContext)
}
