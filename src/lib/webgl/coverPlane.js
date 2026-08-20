import * as THREE from 'three'

/**
 * Scale a unit plane so its texture covers the camera frustum at `distance`.
 */
export function fitCoverPlane({
  mesh,
  camera,
  distance,
  texture,
  /** 0–1. 0.5 = center. Lower Y shows more of the top of the photo. */
  focalX = 0.5,
  focalY = 0.5,
}) {
  const imgW = texture?.image?.width || 1600
  const imgH = texture?.image?.height || 2000
  const planeAspect = imgW / imgH
  const vFov = (camera.fov * Math.PI) / 180
  const viewH = 2 * Math.tan(vFov / 2) * distance
  const viewW = viewH * camera.aspect
  let planeH
  if (viewW / viewH > planeAspect) {
    planeH = viewW / planeAspect
    mesh.scale.set(viewW, planeH, 1)
  } else {
    planeH = viewH
    mesh.scale.set(viewH * planeAspect, planeH, 1)
  }
  const overscan = 1.12
  mesh.scale.multiplyScalar(overscan)
  planeH *= overscan
  mesh.position.x = (0.5 - focalX) * mesh.scale.x
  mesh.position.y = -(0.5 - focalY) * planeH
}

/**
 * Textured plane sized to cover the viewport (hero card v1 — no GLB yet).
 */
export function createCoverPlane(texture, { colorSpace = THREE.SRGBColorSpace, maxAnisotropy = 16 } = {}) {
  texture.colorSpace = colorSpace
  texture.anisotropy = maxAnisotropy
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  )
  return mesh
}
