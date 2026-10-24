/**
 * Las piezas que se diseñan en el hero, en el orden en que se dibujan. Cada una es el rectángulo del
 * boceto en alzado (en px de la imagen a IMG.w × IMG.h, origen arriba a la izquierda) donde está el
 * mueble: ahí el boceto vacío deja ver el boceto completo. Los rectángulos se pueden pisar: lo que ya
 * dibujó una pieza anterior queda dibujado. Si se regenera el boceto, hay que volver a medirlos.
 */
export const IMG = { w: 2100, h: 900 }

export const DESIGN_PIECES = [
  // La barra de piedra y las tres banquetas.
  { id: 'bar', rect: [1118, 536, 1758, 745] },
  // La repisa negra con sus objetos y la planta que cuelga, la rama sobre la barra y la luz lineal.
  { id: 'shelves', rect: [1175, 130, 1780, 548] },
  // El banco bajo el ventanal, con su almohadón.
  { id: 'bench', rect: [240, 595, 520, 712] },
  // La mesa redonda, las dos sillas y la planta de hojas grandes.
  { id: 'table', rect: [430, 322, 905, 733] },
  // El florero en el estante del nicho.
  { id: 'console', rect: [975, 380, 1045, 460] },
  // El pedestal con la esfera y la planta alta.
  { id: 'plinths', rect: [1835, 318, 1978, 735] },
  // El árbol en su maceta, junto al ventanal.
  { id: 'plant', rect: [130, 170, 400, 722] },
]

/** El interior en la imagen (fracciones): de muro a muro, del cielorraso al piso. Mide 9,5 × 3 m. */
export const ROOM_IN_IMAGE = { x0: 0.0595, x1: 0.942, y0: 0.164, y1: 0.822, w: 9.5, h: 3 }
