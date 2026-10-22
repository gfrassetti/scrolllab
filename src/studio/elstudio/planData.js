/**
 * El plano del hero: un departamento tipo de 96 m² (inventado, hasta que el cliente pase uno real).
 * Todo en metros. El plano es x hacia la derecha y z hacia abajo (el norte arriba), con el origen en
 * la esquina de arriba a la izquierda. La escena 3D lee esto mismo: cada muro del plano es el muro
 * que sube en la maqueta, así que cambiar de plano es cambiar este archivo.
 *
 * Un muro va de `a` a `b` con su espesor `t`. Sus aberturas se miden desde `a` (`at` es el centro y
 * `w` el ancho):
 *   window  ventana: antepecho y dintel, vidrio en el medio
 *   door    puerta: hoja abierta a 90° y el arco del giro. `swing: 1` abre hacia la normal del muro
 *           (girando `a→b` 90° en sentido horario en el plano: en los exteriores, hacia adentro); -1, al revés
 *   pass    paso libre, sin carpintería (cocina integrada, living abierto al hall)
 */

export const PLAN = { w: 12, d: 8, height: 2.6, sill: 0.9, lintel: 2.1 }

const EXT = 0.25 // muros exteriores
const INT = 0.12 // tabiques

export const WALLS = [
  // Exteriores, en el orden en que se dibujan (norte, este, sur, oeste).
  {
    a: [0, 0],
    b: [12, 0],
    t: EXT,
    openings: [
      { type: 'window', at: 1.6, w: 2.2 },
      { type: 'window', at: 4.6, w: 1.6 },
      { type: 'window', at: 9.2, w: 1.8 },
    ],
  },
  { a: [12, 0], b: [12, 8], t: EXT, openings: [{ type: 'window', at: 5.6, w: 1.6 }] },
  {
    a: [12, 8],
    b: [0, 8],
    t: EXT,
    openings: [
      { type: 'door', at: 4.55, w: 1, swing: 1 }, // la entrada, al hall
      { type: 'window', at: 9.9, w: 1.6 },
    ],
  },
  {
    a: [0, 8],
    b: [0, 0],
    t: EXT,
    openings: [
      { type: 'window', at: 1.5, w: 1.2 },
      { type: 'window', at: 5.5, w: 2 },
    ],
  },
  // Tabiques.
  { a: [6.5, 0], b: [6.5, 0.9], t: INT, openings: [] }, // cocina integrada: solo un muro corto desde la fachada
  { a: [8.4, 3.2], b: [12, 3.2], t: INT, openings: [] }, // cocina | estudio (el hall queda abierto a la cocina)
  { a: [0, 5], b: [6.5, 5], t: INT, openings: [{ type: 'door', at: 3.5, w: 0.85, swing: 1 }] }, // dormitorio
  { a: [4.2, 5], b: [4.2, 8], t: INT, openings: [] }, // dormitorio | baño
  { a: [6.5, 5], b: [6.5, 8], t: INT, openings: [{ type: 'door', at: 1.2, w: 0.8, swing: 1 }] }, // baño
  { a: [8.4, 3.2], b: [8.4, 8], t: INT, openings: [{ type: 'door', at: 2.6, w: 0.85, swing: -1 }] }, // estudio
]

/** Los ambientes: nombre, superficie y dónde va la etiqueta. */
export const ROOMS = [
  { name: 'Living · comedor', area: 32.5, at: [3.25, 2.5] },
  { name: 'Cocina', area: 17.6, at: [9.25, 1.6] },
  { name: 'Dormitorio', area: 12.6, at: [2.1, 6.5] },
  { name: 'Baño', area: 6.9, at: [5.35, 6.5] },
  { name: 'Hall', area: 9.1, at: [7.45, 5.6] },
  { name: 'Estudio', area: 17.3, at: [10.2, 5.6] },
]

export const PLAN_AREA = 96
