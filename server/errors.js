/**
 * Error de dominio con status HTTP. Lo tiran los servicios y la validación;
 * errorHandler (middleware.js) lo traduce a la respuesta. Las rutas que deciden
 * por tipo (p. ej. el webhook de MP: 4xx no se reintenta) usan `instanceof`,
 * así que esta clase tiene que existir una sola vez: importala de acá.
 */
export class HttpError extends Error {
  /**
   * `expose` habilita que el mensaje viaje al cliente aunque sea 5xx: los 5xx
   * crudos se enmascaran porque pueden traer detalles internos.
   * `code` y `details` son opcionales y viajan al cliente: sirven para que el
   * front distinga dos errores con el mismo status sin leer el texto.
   * @param {number} status
   * @param {string} message
   * @param {{ expose?: boolean, code?: string, details?: any }} [options]
   */
  constructor(status, message, { expose, code, details } = {}) {
    super(message)
    this.status = status
    this.name = 'HttpError'
    this.expose = expose ?? status < 500
    if (code) this.code = code
    if (details) this.details = details
  }
}
