/**
 * Qué almacén usa la API: `mongo` (producción) o `file` (JSON en
 * storage/db, solo desarrollo). Lo decide el entorno al arrancar y lo fija
 * connectDb() (server/db.js) según si Mongo responde; los repositorios lo
 * consultan en cada llamada, por eso es una función y no una constante.
 */
let mode =
  process.env.STORE === "file"
    ? "file"
    : process.env.STORE === "mongo"
      ? "mongo"
      : process.env.NODE_ENV === "production"
        ? "mongo"
        : "file";

export function getMode() {
  return mode;
}

export function setMode(next) {
  mode = next;
}

export function isFileMode() {
  return mode === "file";
}
