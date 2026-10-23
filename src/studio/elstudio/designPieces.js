/**
 * Las piezas que se diseñan en el hero, en el orden en que se dibujan. Cada una es el rectángulo del
 * boceto en alzado (en px de la imagen a IMG.w × IMG.h, origen arriba a la izquierda) donde está el
 * mueble: ahí el boceto vacío deja ver el boceto completo. Los rectángulos se pueden pisar: lo que ya
 * dibujó una pieza anterior queda dibujado. Si se regenera el boceto, hay que volver a medirlos.
 */
export const IMG = { w: 2100, h: 900 }

export const DESIGN_PIECES = [
  { id: 'bar', rect: [1160, 504, 1780, 754] },
  { id: 'shelves', rect: [1228, 100, 1806, 492] },
  { id: 'bench', rect: [257, 518, 637, 686] },
  { id: 'table', rect: [551, 525, 1050, 758] },
  { id: 'console', rect: [898, 383, 1136, 678] },
  { id: 'plinths', rect: [1840, 425, 1976, 752] },
  { id: 'plant', rect: [105, 212, 318, 720] },
]

/** El interior en la imagen (fracciones): de muro a muro, del cielorraso al piso. Mide 9 × 3,3 m. */
export const ROOM_IN_IMAGE = { x0: 0.053, x1: 0.948, y0: 0.111, y1: 0.822, w: 9, h: 3.3 }
