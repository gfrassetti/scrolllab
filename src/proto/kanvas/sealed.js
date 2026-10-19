import { api } from '../../lib/api'
import { SEAL } from './seal'

/**
 * Las piezas de VESPER (modelos e imágenes) viajan cifradas (scripts/vesper-seal.mjs). Acá se pide un
 * pase a la API (vence a los 15 min), se baja cada una y se descifra en memoria con WebCrypto: en la
 * pestaña de red no hay ningún .glb ni .webp para guardar. Las imágenes pasan por una URL `blob:` que se
 * revoca apenas cargan.
 *
 * Los nombres son los de siempre (`/proto/kanvas/hero/field.glb`): `sealedGltfLoader` se comporta como un
 * GLTFLoader para relic.js y oaths.js, que no se enteran.
 *
 * WebCrypto pide un contexto seguro: anda en localhost y en https, no en http por la IP de la red local.
 */
const PREFIX = '/proto/kanvas/'
const nameOf = (url) => (url.startsWith(PREFIX) ? url.slice(PREFIX.length) : url)
const bytes = (hex) => Uint8Array.from(hex.match(/../g), (b) => parseInt(b, 16))

let keyP = null
let passP = null
let passUntil = 0
const key = () => (keyP ||= crypto.subtle.importKey('raw', bytes(SEAL.k), 'AES-GCM', false, ['decrypt']))
const pass = () => {
  // uno por visita (todas las piezas lo comparten); se renueva un minuto antes de vencer
  if (!passP || Date.now() > passUntil - 60_000) {
    passUntil = Date.now() + 14 * 60_000 // mientras llega, el pedido en curso vale para todas
    passP = fetch(`${api.base}/api/showcase/vesper/pass`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`pase ${r.status}`))))
      .then((j) => {
        passUntil = j.expiresAt
        return j.pass
      })
    passP.catch(() => (passP = null))
  }
  return passP
}

const cache = new Map()
/**
 * El archivo descifrado (ArrayBuffer, una copia por pedido). La misma pieza se baja una sola vez aunque la
 * pidan dos secciones (los dos personajes están en el hero y en los juramentos).
 */
export function sealedBuffer(url) {
  const name = nameOf(url)
  if (!cache.has(name)) {
    const p = fetchSealed(name)
    p.catch(() => cache.delete(name))
    cache.set(name, p)
  }
  return cache.get(name).then((buf) => buf.slice(0))
}

async function fetchSealed(name) {
  const id = SEAL.m[name]
  if (!id) throw new Error(`pieza desconocida: ${name}`)
  const [k, p] = await Promise.all([key(), pass()])
  const r = await fetch(`${api.base}/api/showcase/vesper/a/${id}?p=${encodeURIComponent(p)}`)
  if (!r.ok) throw new Error(`pieza ${r.status}`)
  const b = new Uint8Array(await r.arrayBuffer())
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(0, 12) }, k, b.subarray(12))
}

/** Un «loader» con la forma de GLTFLoader (`load(url, onLoad)`) que lee las piezas selladas. */
export function sealedGltfLoader(gltf, manager) {
  return {
    load(url, onLoad) {
      manager?.itemStart(url)
      const fail = (e) => {
        console.error('VESPER:', url, e)
        manager?.itemError(url)
        manager?.itemEnd(url)
      }
      sealedBuffer(url)
        .then((buf) =>
          gltf.parse(
            buf,
            '',
            (g) => {
              onLoad(g)
              manager?.itemEnd(url)
            },
            fail,
          ),
        )
        .catch(fail)
    },
  }
}

/** Una imagen sellada como `HTMLImageElement` (cuenta en el manager de la carga). */
export function sealedImage(url, manager) {
  manager?.itemStart(url)
  return sealedBuffer(url)
    .then(
      (buf) =>
        new Promise((resolve, reject) => {
          const src = URL.createObjectURL(new Blob([buf], { type: 'image/webp' }))
          const im = new Image()
          im.onload = () => {
            URL.revokeObjectURL(src)
            resolve(im)
          }
          im.onerror = (e) => {
            URL.revokeObjectURL(src)
            reject(e)
          }
          im.src = src
        }),
    )
    .finally(() => manager?.itemEnd(url))
}
