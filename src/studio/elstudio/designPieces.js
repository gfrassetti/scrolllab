/**
 * Las piezas que se diseñan en el hero, en el orden en que se dibujan. Cada una es el rectángulo del
 * boceto (en px de la imagen a 1600 × 900, origen arriba a la izquierda) donde está el mueble: ahí
 * el boceto vacío deja ver el boceto completo. Si se regenera el boceto, hay que volver a medir
 * estos rectángulos.
 */
export const DESIGN_PIECES = [
  { id: 'bar', rect: [985, 378, 1305, 580] },
  { id: 'shelves', rect: [1050, 185, 1295, 398] },
  { id: 'bench', rect: [375, 380, 655, 565] },
  { id: 'table', rect: [685, 462, 965, 695] },
  { id: 'console', rect: [780, 325, 895, 450] },
  { id: 'plinths', rect: [1000, 545, 1130, 780] },
  { id: 'plant', rect: [280, 360, 425, 620] },
]
