import { legalFields, toggle } from '../helpers.js'

/** @typedef {import('../types.js').SectionField} SectionField */

const LOGO_HELP = {
  title: 'Cómo funciona el logo',
  steps: [
    'Con el nombre ORDO se dibuja el logo vectorial de la demo: la primera O se traza con una línea fina, después suben las otras letras y la tapa de óxido cae sobre la R y la D.',
    'Con cualquier otro nombre, el logo se arma con la tipografía Jost en mayúsculas y la tapa de óxido arriba; las letras suben una por una. Para un logo propio dibujado, se reemplaza `logoPaths.js` en el código (el README del ZIP lo explica).',
    'La bajada y la línea de lugar se ven en el loader; la línea de lugar también va al pie del menú del teléfono.',
  ],
}

const DRAWING_HELP = {
  title: 'Cómo cambiar el local que se dibuja',
  steps: [
    'El hero es un alzado 21:9 del mismo local en cuatro imágenes que calzan píxel a píxel: la obra gris (como se recibe), el local vacío, el boceto completo y la foto terminada.',
    'Si cambiás una, cambiá las cuatro con la misma cámara y la misma proporción (2400 × 1029): si no calzan, las líneas se corren al pasar de una hoja a otra.',
    'Cada pieza que se dibuja (ventanal, nicho, barra, mesa…) es un rectángulo medido sobre esas imágenes: está en `designPieces.js` y, con tu local, hay que volver a medirlo. El README del ZIP cuenta cómo.',
    'La foto trae su propio papel de fondo (#efebe3): con otro color de fondo, el borde de la foto se nota.',
  ],
}

const PROJECTS_HELP = {
  title: 'Cómo llevar cada proyecto a su página',
  steps: [
    'En la página completa de la demo, cada tarjeta abre la página del proyecto (una tira horizontal con parallax) que se arma en `projects.js`.',
    'En una composición del builder no hay esas páginas: cada tarjeta va al enlace de su fila. Podés apuntarla a una sección de la página (#contact), a una página tuya (/proyectos/linho) o a una URL https://.',
    'Con la fila sin enlace, la tarjeta no lleva a ningún lado.',
  ],
}

const LEGAL_PANEL_HELP = {
  title: 'Cómo funcionan Privacidad y Términos',
  steps: [
    'En la demo, los dos enlaces abren su texto en un panel sobre la misma página.',
    'El texto de la demo es de un negocio inventado: reemplazalo por el tuyo y hacelo revisar. Una línea en blanco empieza un párrafo nuevo.',
    'Con una ruta (/privacidad) o una URL https:// en el enlace, va ahí y el panel deja de usarse.',
  ],
}

/** @type {SectionField[]} */
const COLORS = [
  { key: 'bg', label: 'Color del papel (fondo)', type: 'color' },
  { key: 'fg', label: 'Color de la tinta (texto y líneas)', type: 'color' },
  { key: 'accent', label: 'Color de acento (la tapa del logo, los rótulos)', type: 'color' },
]

/**
 * Campos editables de las secciones de ORDO (builder). Todo texto, foto, link y color es un campo; las capas
 * decorativas (el loader, el cursor, la regla de scroll, las líneas de construcción, el grano, la tapa) tienen
 * interruptor. El ensamblado y la lista completa: ../fields.js.
 * @type {Record<string, SectionField[]>}
 */
export const ORDO_FIELDS = {
  'ordo/Hero': [
    { key: 'brand', label: 'Marca (la palabra del logo)', type: 'text', help: LOGO_HELP },
    { key: 'tagline', label: 'Bajada del logo', type: 'text' },
    { key: 'places', label: 'Línea de lugar y año (loader y menú del teléfono)', type: 'text' },
    {
      key: 'navLinks',
      label: 'Links del nav (hasta 3)',
      type: 'list',
      max: 3,
      item: [
        { key: 'label', label: 'Texto', type: 'text' },
        { key: 'href', label: 'Enlace (#sección, /ruta o https://…)', type: 'href' },
      ],
    },
    { key: 'logoHref', label: 'Enlace del logo (#home vuelve arriba)', type: 'href' },
    { key: 'ctaLabel', label: 'Botón de contacto — texto', type: 'text' },
    { key: 'ctaHref', label: 'Botón de contacto — enlace', type: 'href' },
    { key: 'ctaTip', label: 'Botón de contacto — rótulo del cursor', type: 'text' },
    { key: 'menuLabel', label: 'Botón de menú — texto', type: 'text' },
    { key: 'closeLabel', label: 'Botón de menú — texto con el menú abierto', type: 'text' },
    { key: 'socialLabel', label: 'Red social del menú — texto', type: 'text' },
    { key: 'socialHref', label: 'Red social del menú — enlace', type: 'href' },
    {
      key: 'stages',
      label: 'Las cuatro hojas: título y texto de cada una',
      type: 'list',
      max: 4,
      item: [
        { key: 'title', label: 'Título de la hoja', type: 'text' },
        { key: 'text', label: 'Texto de la hoja', type: 'textarea' },
      ],
    },
    { key: 'title1', label: 'Titular — primera parte', type: 'text' },
    { key: 'title2', label: 'Titular — segunda parte', type: 'text' },
    { key: 'title3', label: 'Titular — tercera parte', type: 'text' },
    { key: 'title4', label: 'Titular — cuarta parte', type: 'text' },
    { key: 'sheetLabel', label: 'Rótulo de la lámina («Elevation · Scale 1:50 · Sheet»)', type: 'text' },
    { key: 'scrollLabel', label: 'Señal de scroll — texto', type: 'text' },
    { key: 'dragTip', label: 'Cartel del cursor al arrastrar', type: 'text' },
    { key: 'heroAlt', label: 'Descripción del dibujo (para lectores de pantalla)', type: 'textarea' },
    { key: 'sketchRaw', label: 'Hoja 1 — el local como se recibe (obra gris)', type: 'image', help: DRAWING_HELP },
    { key: 'sketchEmpty', label: 'Hoja 2 — el local vacío, terminado', type: 'image' },
    { key: 'sketch', label: 'Hoja 2 — el boceto completo, con muebles', type: 'image' },
    { key: 'photo', label: 'Hoja 3 y 4 — la foto del local terminado', type: 'image' },
    toggle('showLoader', 'Loader de entrada (apagado: abre directo en la hoja 1)'),
    toggle('showCursor', 'Cursor propio (la mira y el punto)'),
    toggle('showRuler', 'Regla de scroll a la derecha'),
    toggle('showGuides', 'Líneas de construcción al pasar el mouse'),
    ...COLORS,
  ],
  'ordo/Projects': [
    { key: 'title', label: 'Titular', type: 'text' },
    {
      key: 'projects',
      label: 'Proyectos (hasta 6)',
      type: 'list',
      max: 6,
      item: [
        { key: 'name', label: 'Nombre', type: 'text' },
        { key: 'kind', label: 'Tipo', type: 'text' },
        { key: 'place', label: 'Lugar', type: 'text' },
        { key: 'year', label: 'Año', type: 'text' },
        { key: 'area', label: 'Superficie en m² (solo el número)', type: 'text' },
        { key: 'image', label: 'Foto de la tarjeta', type: 'image' },
        { key: 'alt', label: 'Descripción de la foto', type: 'text' },
        { key: 'href', label: 'Enlace de la tarjeta (#sección, /ruta o https://…)', type: 'href', help: PROJECTS_HELP },
      ],
    },
    { key: 'typeLabel', label: 'Rótulo «Tipo»', type: 'text' },
    { key: 'placeLabel', label: 'Rótulo «Lugar»', type: 'text' },
    { key: 'yearLabel', label: 'Rótulo «Año»', type: 'text' },
    { key: 'areaLabel', label: 'Rótulo «Superficie»', type: 'text' },
    { key: 'cursorTip', label: 'Cartel del cursor sobre una tarjeta', type: 'text' },
    toggle('showGrain', 'Grano de película sobre las fotos'),
    ...COLORS,
  ],
  'ordo/Studio': [
    { key: 'title', label: 'Titular', type: 'text' },
    { key: 'label', label: 'Rótulo de la esquina (lugar y año)', type: 'text' },
    { key: 'tag', label: 'Etiqueta con marcas de corte (sobre la frase)', type: 'text' },
    { key: 'lead', label: 'Frase principal (las palabras entre *asteriscos* llevan la barra de óxido)', type: 'textarea' },
    { key: 'dimLabel', label: 'Texto de la cota bajo la frase', type: 'text' },
    {
      key: 'figures',
      label: 'Cifras (hasta 3)',
      type: 'list',
      max: 3,
      item: [
        { key: 'value', label: 'Cifra', type: 'text' },
        { key: 'caption', label: 'Rótulo', type: 'text' },
      ],
    },
    {
      key: 'principles',
      label: 'Principios (hasta 3)',
      type: 'list',
      max: 3,
      item: [
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'text', label: 'Texto', type: 'textarea' },
      ],
    },
    toggle('showMarks', 'Marcas de corte y cota alrededor de la frase'),
    ...COLORS,
  ],
  'ordo/Process': [
    { key: 'title', label: 'Titular', type: 'text' },
    { key: 'label', label: 'Rótulo de la esquina (vacío: contador 01 — 05)', type: 'text' },
    {
      key: 'steps',
      label: 'Pasos (de 2 a 6; el plano tiene 5 capas y se reparten entre los pasos)',
      type: 'list',
      max: 6,
      item: [
        { key: 'name', label: 'Nombre', type: 'text' },
        { key: 'text', label: 'Descripción', type: 'textarea' },
        { key: 'meta', label: 'Plazo o dato (ej. Semanas 1–2)', type: 'text' },
      ],
    },
    { key: 'planNote', label: 'Nota bajo el plano', type: 'text' },
    { key: 'planProject', label: 'Cajetín del plano — nombre del proyecto', type: 'text' },
    { key: 'planSheet', label: 'Cajetín del plano — escala y lámina', type: 'text' },
    toggle('showPlan', 'Plano que se dibuja con el scroll'),
    ...COLORS,
  ],
  'ordo/Services': [
    { key: 'title', label: 'Titular', type: 'text' },
    { key: 'label', label: 'Rótulo de la esquina (vacío: contador 01 — 04)', type: 'text' },
    {
      key: 'services',
      label: 'Servicios (hasta 6; las figuras son 4 dibujos que se repiten en orden)',
      type: 'list',
      max: 6,
      item: [
        { key: 'name', label: 'Nombre', type: 'text' },
        { key: 'text', label: 'Descripción', type: 'textarea' },
        { key: 'tags', label: 'Etiquetas (separadas por ·)', type: 'text' },
        { key: 'fig', label: 'Rótulo de la figura (ej. Fig. 01 — Elevation, 1:50)', type: 'text' },
      ],
    },
    toggle('showFigures', 'Figura que se dibuja en cada lámina'),
    toggle('showSlab', 'Tapa de óxido en la esquina de la lámina'),
    ...COLORS,
  ],
  'ordo/Wall': [
    { key: 'title', label: 'Titular', type: 'text' },
    { key: 'label', label: 'Rótulo de la esquina (vacío: «12 plates»)', type: 'text' },
    {
      key: 'plates',
      label: 'Fotos de la pared (hasta 18; se reparten solas en las columnas)',
      type: 'list',
      max: 18,
      item: [
        { key: 'image', label: 'Foto', type: 'image' },
        { key: 'alt', label: 'Descripción de la foto', type: 'text' },
        { key: 'caption', label: 'Línea bajo la foto', type: 'text' },
      ],
    },
    toggle('showCaptions', 'Número y línea bajo cada foto'),
    ...COLORS,
  ],
  'ordo/Clients': [
    { key: 'title', label: 'Titular', type: 'text' },
    { key: 'label', label: 'Rótulo de la esquina', type: 'text' },
    {
      key: 'items',
      label: 'Tipos de cliente (hasta 6)',
      type: 'list',
      max: 6,
      item: [
        { key: 'name', label: 'Nombre', type: 'text' },
        { key: 'text', label: 'Descripción', type: 'textarea' },
        { key: 'tags', label: 'Etiquetas (separadas por ·)', type: 'text' },
        { key: 'image', label: 'Foto grande', type: 'image' },
        { key: 'alt', label: 'Descripción de la foto', type: 'text' },
      ],
    },
    ...COLORS,
  ],
  'ordo/Contact': [
    { key: 'title', label: 'Titular', type: 'text' },
    { key: 'label', label: 'Rótulo de la esquina', type: 'text' },
    { key: 'tag', label: 'Etiqueta con marcas de corte (sobre la frase)', type: 'text' },
    { key: 'big', label: 'Frase grande', type: 'text' },
    { key: 'sub', label: 'Texto debajo de la frase', type: 'textarea' },
    { key: 'email', label: 'Email (se vuelve un enlace mailto:)', type: 'text' },
    { key: 'ctaLabel', label: 'Botón de la llamada — texto', type: 'text' },
    { key: 'ctaHref', label: 'Botón de la llamada — destino (vacío: escribe al email)', type: 'href' },
    { key: 'mailTip', label: 'Cartel del cursor sobre el botón', type: 'text' },
    { key: 'tagline', label: 'Frase del pie', type: 'textarea' },
    {
      key: 'columns',
      label: 'Columnas de enlaces del pie (hasta 4)',
      type: 'list',
      max: 4,
      item: [
        { key: 'heading', label: 'Título', type: 'text' },
        { key: 'lines', label: 'Enlaces (uno por renglón: «Texto | #sección» o «Texto | https://…»)', type: 'textarea' },
      ],
    },
    { key: 'newsletterTitle', label: 'Boletín — título', type: 'text' },
    { key: 'newsletterText', label: 'Boletín — texto', type: 'textarea' },
    { key: 'emailPlaceholder', label: 'Boletín — texto del campo de email', type: 'text' },
    { key: 'signupLabel', label: 'Boletín — botón', type: 'text' },
    { key: 'sendingLabel', label: 'Boletín — botón mientras envía', type: 'text' },
    { key: 'successMessage', label: 'Boletín — mensaje de éxito', type: 'text' },
    { key: 'errorMessage', label: 'Boletín — mensaje de error', type: 'text' },
    { key: 'emailError', label: 'Boletín — aviso de email incompleto', type: 'text' },
    { key: 'endpoint', label: 'Boletín — dirección que recibe el alta (https://…; vacío: modo demostración)', type: 'url' },
    {
      key: 'blocks',
      label: 'Bloques de datos (hasta 4)',
      type: 'list',
      max: 4,
      item: [
        { key: 'heading', label: 'Título', type: 'text' },
        { key: 'lines', label: 'Líneas (una por renglón; un email o un teléfono se vuelve enlace)', type: 'textarea' },
        { key: 'href', label: 'Enlace de todo el bloque (opcional; https:// abre otra pestaña)', type: 'href' },
      ],
    },
    { key: 'wordmark', label: 'Nombre gigante del pie', type: 'text' },
    { key: 'wordmarkNote', label: 'Nota bajo el nombre gigante', type: 'text' },
    { key: 'timeZone', label: 'Zona horaria del reloj (ej. Europe/Lisbon)', type: 'text' },
    { key: 'clockLabel', label: 'Reloj — ciudad', type: 'text' },
    { key: 'coords', label: 'Coordenadas', type: 'text' },
    { key: 'copyright', label: 'Línea de derechos', type: 'text' },
    { key: 'backLabel', label: 'Enlace «volver arriba» — texto', type: 'text' },
    { key: 'backHref', label: 'Enlace «volver arriba» — destino (#home vuelve al principio)', type: 'href' },
    ...legalFields().map((f) => /** @type {SectionField} */ (f.key === 'privacyHref' ? { ...f, help: LEGAL_PANEL_HELP } : f)),
    toggle('showSlab', 'Tapa de óxido sobre la frase grande'),
    toggle('showMarks', 'Marcas de corte alrededor de la etiqueta y el botón'),
    toggle('showNewsletter', 'Boletín en el pie'),
    toggle('showMark', 'Marca de registro del pie'),
    toggle('showWordmark', 'Nombre gigante dibujado con sus líneas de construcción'),
    toggle('showClock', 'Reloj y coordenadas'),
    ...COLORS,
  ],
}
