/**
 * Las piezas que se diseñan en el hero, en el orden en que se dibujan. Cada una es un rectángulo del
 * boceto en alzado (en px de la imagen a IMG.w × IMG.h, origen arriba a la izquierda).
 *
 * Hay dos capas, como en un proyecto de interiorismo: primero la obra (`obra: true`) y después el
 * equipamiento. En la obra, sobre el local como se recibió (boceto-obra: ventana chica, paredes con
 * parches, el caño y la lamparita) se dibuja lo que proyecta el estudio: el ventanal, el nicho, el
 * cielorraso y los revestimientos, hasta el local vacío (boceto-vacio). En el equipamiento, sobre el
 * local vacío se dibuja cada mueble hasta el boceto completo. Los rectángulos se pueden pisar: lo que
 * ya dibujó una pieza anterior queda dibujado. Si se regeneran los bocetos, hay que volver a medirlos.
 */
export const IMG = { w: 2100, h: 900 }

export const DESIGN_PIECES = [
  // La obra. El ventanal: la ventana chica de siempre se vuelve un paño de piso a techo.
  { id: 'window', obra: true, rect: [150, 140, 545, 715] },
  // El nicho con su estante (donde estaba la lamparita colgando).
  { id: 'niche', obra: true, rect: [905, 140, 1115, 645] },
  // El cielorraso: se tapa la losa con el caño a la vista.
  { id: 'ceiling', obra: true, rect: [118, 108, 1985, 192] },
  // Los revestimientos: paredes y piso terminados (se van los parches de la obra).
  { id: 'finishes', obra: true, rect: [118, 120, 1985, 748] },
  // El equipamiento.
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
