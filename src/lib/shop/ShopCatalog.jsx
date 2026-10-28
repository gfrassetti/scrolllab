import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DEMO_PRODUCTS } from './products'
import { catalogFromEdits } from './catalog'
import { fetchShopifyProducts, normalizeShopifyConfig } from './shopify'

const ShopCatalogContext = createContext(DEMO_PRODUCTS)
const ShopifyContext = createContext(null)

/**
 * El catálogo que usan la grilla, la ficha, el carrito y el checkout. Sin
 * `products` es el de ejemplo (products.js); con los productos editados en el
 * builder, esos (ver catalogFromEdits).
 *
 * Con `shopify` ({ domain, token, collection }) los productos salen de esa
 * tienda (src/lib/shop/shopify.js) y el checkout es el de Shopify. Mientras
 * cargan, o si la tienda no responde, queda el catálogo de arriba.
 */
export function ShopCatalogProvider({ products, currency = '', shopify, children }) {
  const local = useMemo(() => catalogFromEdits(products, DEMO_PRODUCTS, currency), [products, currency])
  const domain = shopify?.domain
  const token = shopify?.token
  const collection = shopify?.collection
  const config = useMemo(
    () => normalizeShopifyConfig({ domain, token, collection }) && { domain, token, collection },
    [domain, token, collection],
  )
  const [remote, setRemote] = useState(null)

  useEffect(() => {
    setRemote(null)
    if (!config) return undefined
    let alive = true
    fetchShopifyProducts(config)
      .then((list) => {
        if (alive && list.length) setRemote(list)
      })
      .catch((err) => {
        console.warn('[shop] Shopify products could not be loaded:', err?.message || err)
      })
    return () => {
      alive = false
    }
  }, [config])

  return (
    <ShopifyContext.Provider value={config}>
      <ShopCatalogContext.Provider value={remote || local}>{children}</ShopCatalogContext.Provider>
    </ShopifyContext.Provider>
  )
}

export function useShopCatalog() {
  return useContext(ShopCatalogContext)
}

/** La tienda Shopify conectada ({ domain, token, collection }) o null. */
export function useShopify() {
  return useContext(ShopifyContext)
}

/** El producto de /product/:productId, o null si no está en el catálogo. */
export function useShopProduct(id) {
  const catalog = useShopCatalog()
  return catalog.find((product) => product.id === id) || null
}
