/**
 * Un puente chico entre el hero y el cursor: el hero registra cómo pasar un punto de la pantalla a
 * metros del plano, y la mira del cursor lo usa para mostrar coordenadas reales (X:4.20M) en vez de
 * píxeles. Sin hero montado, el cursor vuelve a los px.
 */
let probe = null

export function setPlanProbe(fn) {
  probe = fn
}

/** Metros del plano bajo el punto (px del viewport), o null si no hay plano debajo. */
export function readPlanProbe(clientX, clientY) {
  return probe ? probe(clientX, clientY) : null
}
