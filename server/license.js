export function buildLicenseText({ siteName, orderId, email, sku, date }) {
  return `${siteName} — LICENCIA REGULAR
=====================================

Orden:     ${orderId}
Comprador: ${email}
Ítem:      ${sku}
Fecha:     ${date}

Esta licencia te otorga un derecho NO EXCLUSIVO e INTRANSFERIBLE
a usar el código fuente incluido en este ZIP.

PERMITIDO
- Usar el Ítem en proyectos propios o de clientes (sin límite de sitios).
- Modificar el código para adaptarlo a tu proyecto.
- Cobrarle a tu cliente por el trabajo que incluye el Ítem.

PROHIBIDO
- Vender, revender, sublicenciar o regalar este ZIP o sus archivos fuente.
- Incluir el Ítem en otro marketplace, kit o builder.
- Redistribuir el Ítem como template competidor (aunque lo redesigneés).

La propiedad intelectual permanece en ${siteName}.
Consultas: hola@scrolllab.com.ar

Este archivo identifica la licencia otorgada a ${email} (orden ${orderId}).
`
}
