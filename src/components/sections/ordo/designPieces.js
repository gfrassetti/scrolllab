/**
 * The pieces designed in the hero, in the order they are drawn. Each one is a rectangle of the
 * elevation sketch (in image px at IMG.w × IMG.h, origin at the top left).
 *
 * There are two layers, as in an interior design project: first the building work (`obra: true`) and then the
 * furnishings. In the building work, over the shop as it was received (sketch-raw: small window, patched walls,
 * the pipe and the bare bulb) what the studio designs is drawn: the big window, the niche, the
 * ceiling and the wall and floor finishes, up to the empty shop (sketch-empty). In the furnishings, over the
 * empty shop each piece of furniture is drawn up to the complete sketch. Rectangles may overlap: what
 * an earlier piece already drew stays drawn. If the sketches are regenerated, they must be measured again.
 */
export const IMG = { w: 2100, h: 900 }

export const DESIGN_PIECES = [
  // The building work. The big window: the usual small window becomes a floor-to-ceiling pane.
  { id: 'window', obra: true, rect: [150, 140, 545, 715] },
  // The niche with its shelf (where the bare bulb used to hang).
  { id: 'niche', obra: true, rect: [905, 140, 1115, 645] },
  // The ceiling: the slab with the exposed pipe is covered.
  { id: 'ceiling', obra: true, rect: [118, 108, 1985, 192] },
  // The finishes: walls and floor completed (the patches from the building work are gone).
  { id: 'finishes', obra: true, rect: [118, 120, 1985, 748] },
  // The furnishings.
  // The stone bar and the three stools.
  { id: 'bar', rect: [1118, 536, 1758, 745] },
  // The black shelf with its objects and the hanging plant, the branch over the bar and the linear light.
  { id: 'shelves', rect: [1175, 130, 1780, 548] },
  // The bench under the big window, with its cushion.
  { id: 'bench', rect: [240, 595, 520, 712] },
  // The round table, the two chairs and the big-leafed plant.
  { id: 'table', rect: [430, 322, 905, 733] },
  // The vase on the niche shelf.
  { id: 'console', rect: [975, 380, 1045, 460] },
  // The plinth with the sphere and the tall plant.
  { id: 'plinths', rect: [1835, 318, 1978, 735] },
  // The tree in its pot, next to the big window.
  { id: 'plant', rect: [130, 170, 400, 722] },
]

/** The interior in the image (fractions): from wall to wall, from the ceiling to the floor. It measures 9.5 × 3 m. */
export const ROOM_IN_IMAGE = { x0: 0.0595, x1: 0.942, y0: 0.164, y1: 0.822, w: 9.5, h: 3 }
