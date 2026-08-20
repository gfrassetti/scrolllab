import * as THREE from 'three'
import { damp } from './damp.js'

/**
 * Pointer-driven spherical orbit (KPR `camera` / `Gt` recipe).
 * Moves the camera around lookAt — not CSS rotate on a flat image.
 */
export function attachPointerOrbit({
  camera,
  lookAt = new THREE.Vector3(0, 0, 0),
  distance = 2,
  maxDeg = 10,
  lambda = 3,
  /** Map pointer inside this element; full viewport if omitted (KPR default). */
  boundsEl = null,
  getPointer = (pointer) => pointer,
  skipCoarse = true,
}) {
  let theta = 0
  let phi = 0
  const max = THREE.MathUtils.degToRad(maxDeg)
  const look = lookAt.clone?.() ?? new THREE.Vector3().copy(lookAt)

  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 }

  const onMove = (event) => {
    if (skipCoarse && window.matchMedia('(pointer: coarse)').matches) return
    pointer.x = event.clientX
    pointer.y = event.clientY
  }

  window.addEventListener('pointermove', onMove)

  return {
    update(dt) {
      const { x, y } = getPointer(pointer)
      const rect = boundsEl?.getBoundingClientRect?.()
      const ox = rect?.left ?? 0
      const oy = rect?.top ?? 0
      const vw = rect?.width || window.innerWidth
      const vh = rect?.height || window.innerHeight
      const localX = THREE.MathUtils.clamp(x - ox, 0, vw)
      const localY = THREE.MathUtils.clamp(y - oy, 0, vh)
      const tTheta = THREE.MathUtils.mapLinear(localX, 0, vw, max, -max)
      const tPhi = THREE.MathUtils.mapLinear(localY, 0, vh, max, -max)
      theta = damp(theta, tTheta, lambda, dt)
      phi = damp(phi, tPhi, lambda, dt)
      camera.position.setFromSphericalCoords(distance, phi + Math.PI / 2, theta)
      camera.lookAt(look)
    },
    dispose() {
      window.removeEventListener('pointermove', onMove)
    },
  }
}
