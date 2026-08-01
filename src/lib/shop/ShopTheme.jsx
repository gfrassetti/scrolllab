import { createContext, useContext, useMemo } from 'react'
import { shopThemeVars } from './theme'

const ShopThemeContext = createContext('auto')

export function useShopThemeId() {
  return useContext(ShopThemeContext)
}

/**
 * Aplica las CSS vars del kit commerce a un wrapper. PDP / drawer / checkout
 * viven fuera del ProductGrid, así que el tema se propaga desde acá.
 */
export function ShopThemeProvider({ theme = 'auto', className = '', children }) {
  const style = useMemo(() => shopThemeVars(theme), [theme])
  return (
    <ShopThemeContext.Provider value={theme}>
      <div
        className={className}
        style={style}
        data-shop-theme={theme}
      >
        {children}
      </div>
    </ShopThemeContext.Provider>
  )
}
