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
 *
 * @typedef {Object} FieldHelp
 * @property {string} title Lo que dice el desplegable cerrado («Cómo elegir…»).
 * @property {string[]} steps Una idea por renglón, en el orden en que se hace.
 * @property {string[]} [zipSteps] Renglones que solo valen con el código (builder, ZIP):
 *   van al final de `steps` y LAB no los muestra (ahí no hay carpeta `public/`).
 */

// Solo tipos (JSDoc): se importan con import('./types.js').X.
export {}
