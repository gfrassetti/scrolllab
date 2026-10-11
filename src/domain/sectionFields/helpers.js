/** @typedef {import('./types.js').SectionField} SectionField */
/** @typedef {import('./types.js').FieldHelp} FieldHelp */

/**
 * Piezas que comparten los campos de varios modelos (navs con links, la guía del
 * modelo 3D, los rótulos de CHAPTERS / NOCTURNE…). Cada modelo vive en
 * fields/<modelo>.js.
 */

/**
 * La palabra de barras de KIN (hero y footer): no es una tipografía, cada letra
 * está armada con la misma barra (ver docs/kin-template.md §3.1).
 * @type {FieldHelp}
 */
export const KIN_WORD_HELP = {
  title: 'Cómo elegir la palabra',
  steps: [
    'No es una tipografía: cada letra se arma con la misma barra recta, como un stencil. Al cargar, las barras caen de a una y forman la palabra; al scrollear, giran y caen otra vez para armar la puerta (dos columnas y un dintel).',
    'Las que mejor quedan: A H I K L M N T V W X Y 1 7. Son todas trazos rectos y gruesos —verticales y diagonales—, igual que KIN, la palabra de la demo.',
    'Se pueden usar todas las letras A–Z y los números 0–9, pero las curvas (O C G S U Q B D P R J…) se dibujan cuadradas y con horizontales finas: se leen, aunque menos limpias que las rectas.',
    'Mejor corta: 3 a 6 letras. La palabra ocupa siempre todo el ancho; cuantas más letras, más bajas y finas quedan las barras.',
    'La barra roja es la vertical gruesa más cerca del centro: queda mejor si la letra del medio tiene un palo recto (la I de KIN, la H, la T).',
    'Los acentos se sacan (Á → A, Ñ → N) y lo que no tiene dibujo se saltea. También valen el espacio y los signos . - !',
    'Escribila y mirá la vista previa: si una letra se ve rara, probá otra palabra o una variante con letras rectas.',
  ],
}

/**
 * Modelo 3D propio en un hero (MONOLITH, FIZZ): formato, cómo exportarlo y
 * dónde dejarlo. `extra` son los pasos propios de cada hero.
 * @param {string[]} extra
 * @returns {FieldHelp}
 */
export const model3dHelp = (extra) => ({
  title: 'Cómo usar tu propio modelo 3D',
  steps: [
    'Formato: GLB (glTF binario, todo en un solo archivo, con las texturas adentro). Un .gltf con archivos aparte o un .obj / .fbx no sirven: convertilos a GLB.',
    'Desde Blender: Archivo → Exportar → glTF 2.0 → Formato «glTF Binary (.glb)», con «+Y Up» y «Apply Modifiers» activados. Exportá solo el objeto (Include → Selected Objects).',
    'Tamaño y posición no importan: se centra y se escala solo. Que quede parado (el eje Y hacia arriba) y mirando al frente.',
    'Peso: menos de 5 MB, así carga rápido en un teléfono.',
    ...extra,
    'Dónde ponerlo: pegá una URL https:// pública del archivo y lo ves en la vista previa. El servidor tiene que permitir CORS (tu propio sitio, un bucket S3 / Cloudflare R2 público o jsDelivr desde un repo de GitHub funcionan).',
    'O escribí una ruta como /mi-modelo.glb y, después de bajar el ZIP, copiá el archivo en la carpeta public/ del proyecto. En la vista previa vas a seguir viendo el de la demo.',
    'Si el archivo no carga, queda el objeto de la demo: el sitio no se rompe.',
  ],
})

/**
 * Links del menú de un nav: texto + destino, en orden. Reemplaza al textarea
 * «Texto | #ancla» (`linksText`); sanitizeProps migra lo guardado así.
 * @param {number} [max]
 * @returns {SectionField}
 */
export const navLinks = (max = 8) => ({
  key: 'links',
  label: 'Links del menú',
  type: 'list',
  max,
  fromText: true,
  item: [
    { key: 'label', label: 'Texto', type: 'text' },
    { key: 'href', label: 'Enlace (#sección, /ruta o https://…)', type: 'href' },
  ],
})

/** El rótulo «Chapter 01 / 06» de CHAPTERS: la palabra antes del número. */
/** @type {SectionField} */
export const CHAPTER_LABEL = { key: 'chapterLabel', label: 'Rótulo del capítulo («Chapter»)', type: 'text' }

/** El rótulo «Seq. 02 / 06» de NOCTURNE: la palabra antes del número. */
/** @type {SectionField} */
export const SEQ_LABEL = { key: 'seqLabel', label: 'Rótulo de la secuencia («Seq.»)', type: 'text' }

/**
 * Formularios de contacto (FIZZ ContactSteps, MERIDIAN Contact): adónde se
 * mandan los mensajes.
 * @type {FieldHelp}
 */
export const FORM_ENDPOINT_HELP = {
  title: 'Cómo recibir los mensajes',
  steps: [
    'Vacío, el formulario funciona en modo demo: valida y muestra el «gracias», pero no manda nada.',
    'Con una URL, envía un POST con JSON { name, email, message } y toma cualquier respuesta que no sea 2xx como error.',
    'Sirve tu propia API, una función serverless o un servicio de formularios (Formspree, Basin, etc.).',
  ],
}

/** El botón del menú en el teléfono: lo que dice cerrado y abierto. */
/** @type {SectionField[]} */
export const MENU_BUTTON = [
  { key: 'menuLabel', label: 'Botón de menú — texto', type: 'text' },
  { key: 'closeLabel', label: 'Botón de menú — texto con el menú abierto', type: 'text' },
]
