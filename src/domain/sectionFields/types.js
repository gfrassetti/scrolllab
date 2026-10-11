/**
 * @typedef {Object} SectionFieldOption
 * @property {string} value
 * @property {string} label
 *
 * @typedef {Object} SectionSubField Un campo de cada fila de una lista.
 * @property {string} key
 * @property {string} label
 * @property {string} type
 *
 * @typedef {Object} SectionField
 * @property {string} key
 * @property {string} label
 * @property {'text' | 'textarea' | 'select' | 'image' | 'url' | 'color' | 'href' | 'list'} type
 * @property {SectionFieldOption[]} [options] Solo `select`.
 * @property {number} [max] Solo `list`: tope de filas.
 * @property {SectionSubField[]} [item] Solo `list`: los campos de cada fila.
 * @property {boolean} [fromText] Solo `list`: antes era un textarea «Texto | #ancla»
 *   (`linksText`, o la misma prop como texto); sanitizeProps migra lo guardado.
 * @property {FieldHelp} [help] Guía desplegable debajo del campo: qué poner y por qué.
 *
 * @typedef {Object} FieldHelp
 * @property {string} title Lo que dice el desplegable cerrado («Cómo elegir…»).
 * @property {string[]} steps Una idea por renglón, en el orden en que se hace.
 */

// Solo tipos (JSDoc): se importan con import('./types.js').X.
export {}
