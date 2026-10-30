import { gsap } from '../../lib/gsap'

/**
 * «Se pinta»: un elemento aparece barrido de izquierda a derecha por un trazo de borde irregular,
 * como una pasada de lápiz o pincel (en vez de un fundido). Es una máscara CSS (`.es-paint` en
 * elstudio.css) que se corre con la variable `--paint` (100 escondido → 0 entero).
 *
 *   hidePaint(targets)                 antes de mostrar
 *   paint(targets, { stagger, delay }) lo pinta; devuelve el tween
 *
 * Con «reducir movimiento» se ve directo, sin barrido.
 */
export function hidePaint(targets) {
  gsap.set(targets, { '--paint': 100 })
}

export function paint(targets, { duration = 0.9, stagger = 0.08, delay = 0, calm = false } = {}) {
  if (calm) return gsap.set(targets, { '--paint': 0 })
  return gsap.fromTo(targets, { '--paint': 100 }, { '--paint': 0, duration, stagger, delay, ease: 'power2.inOut', overwrite: 'auto' })
}
