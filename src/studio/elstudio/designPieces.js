/**
 * Las piezas que se diseñan en el hero, en el orden en que se dibujan. Cada una es el rectángulo del
 * boceto (en px de la imagen a 1600 × 900, origen arriba a la izquierda) donde está el mueble: ahí
 * el boceto vacío deja ver el boceto completo. `at` es dónde va su anotación y `side` si va arriba
 * o abajo de ese punto. Si se regenera el boceto, hay que volver a medir estos rectángulos.
 */
export const DESIGN_PIECES = [
  { id: 'bar', rect: [985, 378, 1305, 580], at: [1000, 372], side: 'above', label: 'Barra · travertino y nogal' },
  { id: 'shelves', rect: [1050, 185, 1295, 398], at: [1062, 182], side: 'above', label: 'Estantes de roble · luz cálida' },
  { id: 'bench', rect: [375, 380, 655, 565], at: [470, 572], side: 'below', label: 'Banco bajo la ventana' },
  { id: 'table', rect: [685, 462, 965, 695], at: [700, 700], side: 'below', label: 'Mesa y sillas de roble' },
  { id: 'console', rect: [780, 325, 895, 450], at: [640, 300], side: 'above', label: 'Guardado en el nicho' },
  { id: 'plinths', rect: [1000, 545, 1130, 780], at: [1012, 786], side: 'below', label: 'Pedestales de exhibición' },
  { id: 'plant', rect: [280, 360, 425, 620], at: [290, 355], side: 'above', label: 'Olivo en terracota' },
]
