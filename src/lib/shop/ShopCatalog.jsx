import { createContext, useContext, useMemo } from 'react'
import { DEMO_PRODUCTS } from './products'
import { catalogFromEdits } from './catalog'

const ShopCatalogContext = createContext(DEMO_PRODUCTS)

/**
 * El catálogo que usan la grilla, la ficha, el carrito y el checkout. Sin
 * `products` es el de ejemplo (products.js); con los productos editados en el
 * builder, esos (ver catalogFromEdits).
 */
export function ShopCatalogProvider({ products, children }) {
  const catalog = useMemo(() => catalogFromEdits(products, DEMO_PRODUCTS), [products])
  return <ShopCatalogContext.Provider value={catalog}>{children}</ShopCatalogContext.Provider>
}

export function useShopCatalog() {
  return useContext(ShopCatalogContext)
}

/** El producto de /product/:productId, o null si no está en el catálogo. */
export function useShopProduct(id) {
  const catalog = useShopCatalog()
  return catalog.find((product) => product.id === id) || null
}
