import { toggle } from '../helpers.js'

/** @typedef {import('../types.js').SectionField} SectionField */

/**
 * La tienda de prueba pública de Shopify (mock.shop): sin cuenta ni token.
 * Sirve para ver en el preview el circuito real (productos, carrito y checkout
 * de Shopify) antes de conectar la tienda propia.
 */
const SHOPIFY_DEMO = {
  label: 'Probar con la tienda de ejemplo de Shopify',
  value: 'mock.shop',
  active: 'Con la tienda de ejemplo de Shopify (mock.shop): productos y carrito reales de Shopify. Su checkout es de prueba y aparece vacío; con una tienda real muestra el pedido. Para la tuya van su dominio y su token.',
}

const SHOPIFY_HELP = {
  title: 'Cómo conectar una tienda Shopify',
  steps: [
    'Vacío, la tienda usa los productos de esta sección y el checkout de ejemplo. Con Shopify, los productos, precios, talles, stock y fotos salen de la tienda, y el pago es el checkout de Shopify: la plata va directo a la cuenta de la tienda.',
    'En el panel de Shopify: Configuración → Apps y canales de venta → Shopify App Store. Instalá el canal «Headless» (es gratis).',
    'Dentro del canal: «Crear tienda externa» → «Storefront API». Copiá el «Token de acceso público» (el privado no va acá).',
    'Pegá acá el dominio (tu-tienda.myshopify.com) y el token. Para mostrar una sola colección, su handle va en «Colección».',
    'Los productos se editan en Shopify y aparecen acá al recargar. Desde ScrollLab se editan los textos, los colores y la ficha.',
  ],
  zipSteps: ['En el código queda en <ShopCatalogProvider shopify> de src/App.jsx; el README trae el detalle.'],
}

/**
 * Campos editables de las secciones de COMMERCE (builder + LAB).
 * El ensamblado y la lista completa: ../fields.js.
 * @type {Record<string, SectionField[]>}
 */
export const COMMERCE_FIELDS = {
  'commerce/ProductGrid': [
    {
      key: 'theme',
      label: 'Color',
      type: 'select',
      options: [
        { value: 'auto', label: 'Auto (sección de al lado)' },
        { value: 'chapters', label: 'Chapters · #ff4b00' },
        { value: 'nocturne', label: 'Nocturne · #d9ff3f', retired: true },
        { value: 'monolith', label: 'Monolith · #2b3cff' },
        { value: 'velocity', label: 'Velocity · #d9ff3f', retired: true },
        { value: 'fizz', label: 'Fizz · #ff3ea5' },
        { value: 'atelier', label: 'Atelier · #c8d0dc' },
        { value: 'comic', label: 'Comic · #e85a24' },
        { value: 'unity', label: 'Unity · #f4c518' },
        { value: 'ratio', label: 'Ratio · #e23c24', retired: true },
        { value: 'atrium', label: 'Atrium · #111111' },
        { value: 'meridian', label: 'Meridian · #8f7a5e' },
        { value: 'kin', label: 'Kin · #e1371f' },
        { value: 'fold', label: 'Fold · #c8742f' },
        { value: 'apex', label: 'Apex · #9cc3ff' },
      ],
    },
    { key: 'bg', label: 'Color de fondo (pisa el de la paleta)', type: 'color' },
    { key: 'fg', label: 'Color de texto (pisa el de la paleta)', type: 'color' },
    { key: 'accent', label: 'Color de acento: botones y carrito (pisa el de la paleta)', type: 'color' },
    {
      key: 'currency',
      label: 'Moneda de los precios',
      type: 'select',
      options: [
        { value: 'ARS', label: 'Pesos argentinos (ARS)' },
        { value: 'USD', label: 'Dólares (USD)' },
        { value: 'EUR', label: 'Euros (EUR)' },
        { value: 'MXN', label: 'Pesos mexicanos (MXN)' },
        { value: 'CLP', label: 'Pesos chilenos (CLP)' },
        { value: 'COP', label: 'Pesos colombianos (COP)' },
        { value: 'UYU', label: 'Pesos uruguayos (UYU)' },
        { value: 'BRL', label: 'Reales (BRL)' },
        { value: 'GBP', label: 'Libras (GBP)' },
      ],
    },
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'addLabel', label: 'Botón de agregar rápido', type: 'text' },
    { key: 'soldOutLabel', label: 'Producto agotado — texto del botón', type: 'text' },
    { key: 'variantHint', label: 'Pista bajo el botón en productos con talle o color ({label} = el nombre de la variante)', type: 'text' },
    // Tienda Shopify (src/lib/shop/shopify.js): con dominio y token, los
    // productos, precios y stock salen de Shopify y se paga en su checkout.
    toggle('shopifyEnabled', 'Cobrar con Shopify', undefined, 'off'),
    {
      key: 'shopifyDomain',
      label: 'Shopify · Dominio de la tienda (tu-tienda.myshopify.com)',
      type: 'text',
      example: SHOPIFY_DEMO,
      help: SHOPIFY_HELP,
    },
    { key: 'shopifyToken', label: 'Shopify · Token público de Storefront (canal «Headless»)', type: 'text' },
    { key: 'shopifyCollection', label: 'Shopify · Colección a mostrar (su handle; vacío = toda la tienda)', type: 'text' },
    // El catálogo del kit: la grilla, la ficha, el carrito y el checkout usan
    // estos productos (src/lib/shop/catalog.js). Lo que una fila deja vacío
    // toma el valor del producto de ejemplo en esa posición.
    {
      key: 'products',
      label: 'Productos (lo vacío queda como el de ejemplo)',
      type: 'list',
      max: 8,
      item: [
        { key: 'name', label: 'Nombre', type: 'text' },
        { key: 'price', label: 'Precio (solo números)', type: 'price' },
        { key: 'blurb', label: 'Descripción', type: 'textarea' },
        { key: 'img', label: 'Foto (URL)', type: 'image' },
        { key: 'img2', label: 'Foto 2 de la galería (URL)', type: 'image' },
        { key: 'img3', label: 'Foto 3 de la galería (URL)', type: 'image' },
        { key: 'img4', label: 'Foto 4 de la galería (URL)', type: 'image' },
        { key: 'variantLabel', label: 'Opciones — nombre (Talle, Color…; vacío = el del ejemplo)', type: 'text' },
        { key: 'variantOptions', label: 'Opciones, separadas por coma (S, M, L). Con color: Negro:#111111. «—» = sin opciones', type: 'text' },
        { key: 'badge', label: 'Etiqueta (Nuevo, Oferta…; «—» = ninguna)', type: 'text' },
        { key: 'details', label: 'Descripción larga (ficha; «—» = ninguna)', type: 'textarea' },
        { key: 'specs', label: 'Ficha técnica: una línea por dato, «Material | Algodón» («—» = ninguna)', type: 'textarea' },
        toggle('showSoldOut', 'Agotado', undefined, 'off'),
      ],
    },
    // El carrito lateral y la ficha de producto tampoco son secciones: sus
    // textos viajan como props `cart*` / `detail*` (src/domain/checkoutProps.js).
    { key: 'cartButtonLabel', label: 'Carrito · Botón flotante', type: 'text' },
    { key: 'cartCheckoutLinkLabel', label: 'Carrito · Botón flotante de checkout', type: 'text' },
    { key: 'cartTitle', label: 'Carrito · Título', type: 'text' },
    { key: 'cartEmpty', label: 'Carrito · Vacío', type: 'text' },
    { key: 'cartQtyLabel', label: 'Carrito · Cantidad', type: 'text' },
    { key: 'cartRemoveLabel', label: 'Carrito · Quitar', type: 'text' },
    { key: 'cartTotalLabel', label: 'Carrito · Total', type: 'text' },
    { key: 'cartCheckoutLabel', label: 'Carrito · Ir al checkout', type: 'text' },
    { key: 'cartCloseLabel', label: 'Carrito · Cerrar', type: 'text' },
    {
      key: 'detailLayout',
      label: 'Ficha · Modelo',
      type: 'select',
      options: [
        { value: 'classic', label: 'Clásica: foto a la izquierda, texto a la derecha' },
        { value: 'gallery', label: 'Galería: fotos grandes apiladas y el texto fijo al costado' },
        { value: 'centered', label: 'Centrada: foto arriba y texto centrado' },
      ],
    },
    { key: 'detailEyebrow', label: 'Ficha · Eyebrow', type: 'text' },
    { key: 'detailCta', label: 'Ficha · Agregar al carrito', type: 'text' },
    { key: 'detailBackLabel', label: 'Ficha · Volver', type: 'text' },
    { key: 'detailFallbackTitle', label: 'Ficha · Producto no encontrado', type: 'text' },
    { key: 'detailCatalogLabel', label: 'Ficha · Ver catálogo', type: 'text' },
    { key: 'detailQtyLabel', label: 'Ficha · Cantidad (lector de pantalla)', type: 'text' },
    { key: 'detailSoldOutLabel', label: 'Ficha · Agotado', type: 'text' },
    { key: 'detailDescriptionTitle', label: 'Ficha · Título de la descripción', type: 'text' },
    { key: 'detailSpecsTitle', label: 'Ficha · Título de la ficha técnica', type: 'text' },
    { key: 'detailShippingTitle', label: 'Ficha · Envío y devoluciones — título', type: 'text' },
    { key: 'detailShippingText', label: 'Ficha · Envío y devoluciones — texto', type: 'textarea' },
    { key: 'detailCareTitle', label: 'Ficha · Cuidados — título', type: 'text' },
    { key: 'detailCareText', label: 'Ficha · Cuidados — texto (vacío = no se muestra)', type: 'textarea' },
    { key: 'detailRelatedTitle', label: 'Ficha · «También te puede gustar»', type: 'text' },
    toggle('detailShowRelated', 'Ficha · Mostrar otros productos al pie'),
    // El checkout es una ruta (/checkout), no una sección seleccionable:
    // sus textos se editan desde acá y viajan como props `checkout*`.
    { key: 'checkoutEyebrow', label: 'Checkout · Eyebrow', type: 'text' },
    { key: 'checkoutTitle', label: 'Checkout · Title', type: 'text' },
    { key: 'checkoutBody', label: 'Checkout · Body', type: 'textarea' },
    {
      key: 'checkoutStepsText',
      label: 'Checkout · Pasos (uno por línea)',
      type: 'textarea',
    },
    { key: 'checkoutContactTitle', label: 'Checkout · Contacto', type: 'text' },
    { key: 'checkoutShippingTitle', label: 'Checkout · Envío', type: 'text' },
    {
      key: 'checkoutCountryOptionsText',
      label: 'Checkout · Países (uno por línea)',
      type: 'textarea',
    },
    { key: 'checkoutDeliveryTitle', label: 'Checkout · Entrega', type: 'text' },
    { key: 'checkoutStandardLabel', label: 'Checkout · Envío estándar', type: 'text' },
    { key: 'checkoutStandardNote', label: 'Checkout · Estándar — nota', type: 'text' },
    { key: 'checkoutExpressLabel', label: 'Checkout · Envío express', type: 'text' },
    { key: 'checkoutExpressNote', label: 'Checkout · Express — nota', type: 'text' },
    { key: 'checkoutPaymentTitle', label: 'Checkout · Pago', type: 'text' },
    { key: 'checkoutPayCardLabel', label: 'Checkout · Pago tarjeta', type: 'text' },
    { key: 'checkoutPayWalletLabel', label: 'Checkout · Pago billetera', type: 'text' },
    {
      key: 'checkoutPayTransferLabel',
      label: 'Checkout · Pago transferencia',
      type: 'text',
    },
    { key: 'checkoutSummaryTitle', label: 'Checkout · Resumen', type: 'text' },
    { key: 'checkoutPromoLabel', label: 'Checkout · Cupón — label', type: 'text' },
    { key: 'checkoutPromoCode', label: 'Checkout · Cupón válido', type: 'text' },
    { key: 'checkoutPromoOff', label: 'Checkout · Cupón — % off', type: 'text' },
    { key: 'checkoutShippingFlat', label: 'Checkout · Costo envío', type: 'text' },
    { key: 'checkoutExpressPrice', label: 'Checkout · Costo express', type: 'text' },
    {
      key: 'checkoutFreeShippingOver',
      label: 'Checkout · Envío gratis desde (0 = nunca)',
      type: 'text',
    },
    { key: 'checkoutPayLabel', label: 'Checkout · Botón pagar', type: 'text' },
    { key: 'checkoutShopifyNote', label: 'Checkout · Nota (en lugar de los formularios: el envío y el pago van en Shopify)', type: 'textarea' },
    toggle('checkoutShowTrust', 'Checkout · Mostrar las garantías bajo el botón de pagar'),
    {
      key: 'checkoutTrustText',
      label: 'Checkout · Garantías (una por línea)',
      type: 'textarea',
    },
    { key: 'checkoutSuccessTitle', label: 'Checkout · Éxito — título', type: 'text' },
    { key: 'checkoutSuccessBody', label: 'Checkout · Éxito — texto', type: 'textarea' },
    { key: 'checkoutBackLabel', label: 'Checkout · Volver', type: 'text' },
    { key: 'checkoutEmailLabel', label: 'Checkout · Email — etiqueta', type: 'text' },
    { key: 'checkoutEmailPlaceholder', label: 'Checkout · Email — ejemplo', type: 'text' },
    { key: 'checkoutPhoneLabel', label: 'Checkout · Teléfono — etiqueta', type: 'text' },
    { key: 'checkoutFirstNameLabel', label: 'Checkout · Nombre — etiqueta', type: 'text' },
    { key: 'checkoutLastNameLabel', label: 'Checkout · Apellido — etiqueta', type: 'text' },
    { key: 'checkoutAddressLabel', label: 'Checkout · Dirección — etiqueta', type: 'text' },
    { key: 'checkoutCityLabel', label: 'Checkout · Ciudad — etiqueta', type: 'text' },
    { key: 'checkoutZipLabel', label: 'Checkout · Código postal — etiqueta', type: 'text' },
    { key: 'checkoutCountryLabel', label: 'Checkout · País — etiqueta', type: 'text' },
    { key: 'checkoutNotesLabel', label: 'Checkout · Notas — etiqueta', type: 'text' },
    { key: 'checkoutPayCardNote', label: 'Checkout · Pago tarjeta — nota', type: 'text' },
    { key: 'checkoutPayWalletNote', label: 'Checkout · Pago billetera — nota', type: 'text' },
    { key: 'checkoutPayTransferNote', label: 'Checkout · Pago transferencia — nota', type: 'text' },
    { key: 'checkoutEmptyLabel', label: 'Checkout · Carrito vacío — texto', type: 'text' },
    { key: 'checkoutEmptyCta', label: 'Checkout · Carrito vacío — botón', type: 'text' },
    { key: 'checkoutQtyLabel', label: 'Checkout · Cantidad (lector de pantalla)', type: 'text' },
    { key: 'checkoutRemoveLabel', label: 'Checkout · Quitar', type: 'text' },
    { key: 'checkoutPromoPlaceholder', label: 'Checkout · Cupón — ejemplo', type: 'text' },
    { key: 'checkoutPromoApplyLabel', label: 'Checkout · Cupón — aplicar', type: 'text' },
    { key: 'checkoutPromoOkText', label: 'Checkout · Cupón — aplicado', type: 'text' },
    { key: 'checkoutPromoErrorText', label: 'Checkout · Cupón — inválido', type: 'text' },
    { key: 'checkoutSubtotalLabel', label: 'Checkout · Subtotal', type: 'text' },
    { key: 'checkoutShippingLabel', label: 'Checkout · Envío', type: 'text' },
    { key: 'checkoutDiscountLabel', label: 'Checkout · Descuento', type: 'text' },
    { key: 'checkoutTotalLabel', label: 'Checkout · Total', type: 'text' },
    { key: 'checkoutFreeLabel', label: 'Checkout · Envío gratis', type: 'text' },
    { key: 'checkoutPayingLabel', label: 'Checkout · Pagando…', type: 'text' },
    { key: 'checkoutSuccessCta', label: 'Checkout · Éxito — botón', type: 'text' },
  ],
}

/**
 * El panel de la grilla en grupos plegables. Con Shopify encendido se ocultan
 * los campos que pasan a Shopify (los productos, la moneda, y el envío, el
 * pago y el cupón del checkout) y aparecen los propios de Shopify.
 * @type {import('../types.js').SectionFieldGroup[]}
 */
export const PRODUCT_GRID_GROUPS = [
  { id: 'grid', title: 'Grilla', open: true },
  { id: 'shopify', title: 'Cobrar con Shopify', switch: 'shopifyEnabled', note: 'Los productos, el stock y el pago salen de una tienda Shopify. Apagado, la tienda usa los productos que cargás acá y el checkout de ejemplo.' },
  { id: 'products', title: 'Productos' },
  { id: 'cart', title: 'Carrito' },
  { id: 'detail', title: 'Ficha de producto' },
  { id: 'checkout', title: 'Checkout' },
]

/** Lo que Shopify resuelve por su cuenta: con Shopify encendido no se muestra. */
const SHOPIFY_REPLACES = new Set([
  'currency', 'products',
  'checkoutContactTitle', 'checkoutShippingTitle', 'checkoutCountryOptionsText', 'checkoutDeliveryTitle',
  'checkoutStandardLabel', 'checkoutStandardNote', 'checkoutExpressLabel', 'checkoutExpressNote',
  'checkoutPaymentTitle', 'checkoutPayCardLabel', 'checkoutPayWalletLabel', 'checkoutPayTransferLabel',
  'checkoutPayCardNote', 'checkoutPayWalletNote', 'checkoutPayTransferNote',
  'checkoutPromoLabel', 'checkoutPromoCode', 'checkoutPromoOff', 'checkoutPromoPlaceholder',
  'checkoutPromoApplyLabel', 'checkoutPromoOkText', 'checkoutPromoErrorText',
  'checkoutShippingFlat', 'checkoutExpressPrice', 'checkoutFreeShippingOver',
  'checkoutSuccessTitle', 'checkoutSuccessBody', 'checkoutSuccessCta',
  'checkoutEmailLabel', 'checkoutEmailPlaceholder', 'checkoutPhoneLabel', 'checkoutFirstNameLabel',
  'checkoutLastNameLabel', 'checkoutAddressLabel', 'checkoutCityLabel', 'checkoutZipLabel',
  'checkoutCountryLabel', 'checkoutNotesLabel', 'checkoutShippingLabel', 'checkoutDiscountLabel', 'checkoutFreeLabel',
])

const GROUP_PREFIX = [
  ['shopify', 'shopify'],
  ['cart', 'cart'],
  ['detail', 'detail'],
  ['checkout', 'checkout'],
]

COMMERCE_FIELDS['commerce/ProductGrid'] = COMMERCE_FIELDS['commerce/ProductGrid'].map((field) => {
  const prefixed = GROUP_PREFIX.find(([prefix]) => field.key.startsWith(prefix) && field.key.length > prefix.length)
  const group = field.key === 'products' ? 'products' : prefixed ? prefixed[1] : 'grid'
  // El título del grupo ya dice «Carrito», «Checkout»…: el rótulo va sin prefijo.
  const label = field.label.replace(/^(Carrito|Ficha|Checkout|Shopify) · /, '')
  const shopify = field.key === 'checkoutShopifyNote' ? 'only' : SHOPIFY_REPLACES.has(field.key) ? 'hide' : undefined
  return { ...field, label, group, ...(shopify ? { shopify } : {}) }
})
