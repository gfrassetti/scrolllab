/**
 * Texto de la Licencia Regular que viaja como `LICENSE.txt` en cada ZIP
 * (docs/ip-protection-brief.md §3.1: "el EULA viaja en el ZIP").
 *
 * Espeja los términos publicados en el sitio (`src/pages/LicensePage.jsx` +
 * `i18n .license.*`). Si cambia uno, cambiar el otro — `npm run check` no valida
 * la coincidencia todavía.
 *
 * NOTA LEGAL: la redacción final la revisa un abogado (brief §6). Este texto es
 * la política del producto puesta en prosa, no un dictamen legal.
 */
export function buildLicenseText({ siteName, orderId, email, sku, date }) {
  return `${siteName} — LICENCIA REGULAR
=====================================

Orden:     ${orderId}
Comprador: ${email}
Ítem:      ${sku}
Fecha:     ${date}

Al comprar este Ítem recibís una licencia NO EXCLUSIVA e INTRANSFERIBLE
para usar el código fuente incluido en este ZIP. Es la licencia estándar
que acompaña a cada descarga.

PERMITIDO
- Usar el Ítem en proyectos propios o de clientes, sin límite de sitios ni apps.
- Modificar el código fuente para adaptarlo a tu proyecto.
- Usarlo en proyectos comerciales y cobrarle a tu cliente por el trabajo.
- Entregarlo como parte de un producto terminado (web, app, impreso, digital o
  video), siempre como pieza de ese producto y no como template a la venta.
- Contratar a un tercero para que lo modifique PARA ESE proyecto. El tercero no
  puede quedarse el código para reutilizarlo en otros trabajos.

PROHIBIDO
- Vender, revender, sublicenciar o regalar el Ítem (este ZIP o sus archivos
  fuente) a terceros.
- Publicar el código en un repositorio abierto, un marketplace, un "starter kit"
  o un theme pack.
- Incluir el Ítem en otro builder, kit o marketplace que permita a terceros
  generar copias.
- Redistribuirlo como template competidor, aunque lo rediseñes o le cambies el
  nombre.
- Compartir el link de descarga o tu cuenta con terceros.
- Hacer ingeniería inversa del builder de ${siteName} o de su pipeline de
  empaquetado.

PROPIEDAD INTELECTUAL
${siteName} (y sus licenciantes) retienen todos los derechos de propiedad
intelectual sobre el Ítem. Solo se otorgan los derechos descritos acá.

TRAZABILIDAD Y ENFORCEMENT
Este ZIP está marcado con tu número de orden y tu email: en este archivo y en un
encabezado dentro de \`src/App.jsx\` (línea \`SCROLLLAB-LICENSE ${orderId}\`).
Esa marca identifica la licencia otorgada a ${email} y hace que cualquier copia
redistribuida sea trazable al comprador original. Quitarla no cambia estos
términos.

Ante una redistribución probada, ${siteName} puede: pedir la baja del contenido
(DMCA / takedown) en el repositorio o listado que lo aloje, bloquear la cuenta y
las compras futuras, y reclamar por daños. El número de orden es la evidencia de
la licencia.

Consultas: hola@scrolllab.com.ar
`
}
