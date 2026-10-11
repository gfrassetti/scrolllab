import { create } from 'zustand'

/**
 * Un .glb de la computadora del comprador, solo para la vista previa del
 * builder: se ve el modelo propio sin hostearlo en ningún lado. Vive en esta
 * pestaña (object URL) y NO entra en las props de la composición: lo que viaja
 * al carrito y al ZIP es lo que el comprador escribió en «modelo propio».
 */

/** Más que esto no se prueba en el navegador (la guía pide < 5 MB en producción). */
export const LOCAL_MODEL_MAX_BYTES = 30 * 1024 * 1024

/**
 * `mi botella (v2).GLB` → `mi-botella-v2.glb`: el nombre que va en la ruta
 * `/nombre.glb` del proyecto (sin espacios ni tildes que rompan la URL).
 */
export function modelFileSlug(name) {
  const base = String(name || 'modelo')
    .replace(/\.glb$/i, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'modelo'}.glb`
}

export const useLocalModel = create((set, get) => ({
  /** @type {Record<string, { url: string, name: string, size: number }>} */
  byUid: {},

  /** Devuelve '' si está bien, o un código de error (`notGlb` | `tooLarge`). */
  setFile(uid, file) {
    if (!file || !/\.glb$/i.test(file.name || '')) return 'notGlb'
    if (file.size > LOCAL_MODEL_MAX_BYTES) return 'tooLarge'
    const previous = get().byUid[uid]
    if (previous) URL.revokeObjectURL(previous.url)
    set((s) => ({
      byUid: {
        ...s.byUid,
        [uid]: { url: URL.createObjectURL(file), name: file.name, size: file.size },
      },
    }))
    return ''
  },

  clear(uid) {
    const previous = get().byUid[uid]
    if (!previous) return
    URL.revokeObjectURL(previous.url)
    set((s) => {
      const next = { ...s.byUid }
      delete next[uid]
      return { byUid: next }
    })
  },

  clearAll() {
    Object.values(get().byUid).forEach((m) => URL.revokeObjectURL(m.url))
    set({ byUid: {} })
  },
}))

/** Evento con el que las secciones 3D avisan si su modelo cargó (lo escucha el panel). */
export const MODEL_STATUS_EVENT = 'scrolllab:model3d'
