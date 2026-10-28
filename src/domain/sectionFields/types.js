/**
 * @typedef {Object} SectionFieldOption
 * @property {string} value
 * @property {string} label
 *
 * @typedef {Object} SectionSubField Un campo de cada fila de una lista.
 * @property {string} key
 * @property {string} label
 * @property {string} type
 * @property {SectionFieldOption[]} [options] `select` y `toggle` dentro de la fila.
 * @property {'on' | 'off'} [default] Solo `toggle`: cómo arranca sin valor.
 * @property {FieldHelp} [help]
 *
 * @typedef {Object} SectionField
 * @property {string} key
 * @property {string} label
 * @property {'text' | 'textarea' | 'select' | 'toggle' | 'image' | 'url' | 'color' | 'href' | 'list'} type
 * @property {SectionFieldOption[]} [options] `select` y `toggle` (on/off).
 * @property {number} [max] Solo `list`: tope de filas.
 * @property {SectionSubField[]} [item] Solo `list`: los campos de cada fila.
 * @property {boolean} [fromText] Solo `list`: antes era un textarea «Texto | #ancla»
 *   (`linksText`, o la misma prop como texto); sanitizeProps migra lo guardado.
 * @property {FieldHelp} [help] Guía desplegable debajo del campo: qué poner y por qué.
 * @property {'on' | 'off'} [default] Solo `toggle`: cómo arranca sin valor (por defecto 'on').
 * @property {FieldExample} [example] Botón bajo el campo que lo completa con un valor de prueba.
 * @property {string} [group] El grupo plegable del panel (ver SectionFieldGroup).
 * @property {'hide' | 'only'} [shopify] Con Shopify encendido: 'hide' lo oculta, 'only' solo se ve ahí.
 *
 * @typedef {Object} SectionFieldGroup
 * @property {string} id
 * @property {string} title
 * @property {boolean} [open] Arranca abierto.
 * @property {string} [switch] Un toggle del mismo panel que enciende el grupo (su interruptor va en el título).
 * @property {string} [note] Qué hace el interruptor (debajo del título).
 *
 * @typedef {Object} FieldExample
 * @property {string} label El botón («Probar con…»).
 * @property {string} value Lo que escribe en el campo.
 * @property {string} active Lo que dice mientras el campo tiene ese valor.
 *
 * @typedef {Object} FieldHelp
 * @property {string} title Lo que dice el desplegable cerrado («Cómo elegir…»).
 * @property {string[]} steps Una idea por renglón, en el orden en que se hace.
 * @property {string[]} [zipSteps] Renglones que solo valen con el código (builder, ZIP):
 *   van al final de `steps` y LAB no los muestra (ahí no hay carpeta `public/`).
 */

// Solo tipos (JSDoc): se importan con import('./types.js').X.
export {}
