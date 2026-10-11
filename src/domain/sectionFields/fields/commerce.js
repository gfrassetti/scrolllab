/** @typedef {import('../types.js').SectionField} SectionField */

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
        { value: 'nocturne', label: 'Nocturne · #d9ff3f' },
        { value: 'monolith', label: 'Monolith · #2b3cff' },
        { value: 'velocity', label: 'Velocity · #d9ff3f' },
        { value: 'fizz', label: 'Fizz · #ff3ea5' },
        { value: 'atelier', label: 'Atelier · #c8d0dc' },
        { value: 'comic', label: 'Comic · #e85a24' },
        { value: 'unity', label: 'Unity · #f4c518' },
        { value: 'ratio', label: 'Ratio · #e23c24' },
        { value: 'atrium', label: 'Atrium · #111111' },
        { value: 'meridian', label: 'Meridian · #8f7a5e' },
        { value: 'kin', label: 'Kin · #e1371f' },
        { value: 'fold', label: 'Fold · #c8742f' },
      ],
    },
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'addLabel', label: 'Botón de agregar rápido', type: 'text' },
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
      ],
    },
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
    {
      key: 'checkoutTrustText',
      label: 'Checkout · Garantías (una por línea)',
      type: 'textarea',
    },
    { key: 'checkoutSuccessTitle', label: 'Checkout · Éxito — título', type: 'text' },
    { key: 'checkoutSuccessBody', label: 'Checkout · Éxito — texto', type: 'textarea' },
  ],
}
