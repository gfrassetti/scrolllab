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

  // El plano "cubre" el frustum con overscan de sobra (12%), pero un focal lejos
  // del centro puede pedir MÁS corrimiento que ese margen — sobre todo a mitad de
  // un scrub, cuando el aspect ratio cambia y el margen de sobra se achica. Sin
  // clamp, el borde del plano se mete adentro del frustum y aparece un tajo de
  // fondo (clearColor) donde debería seguir habiendo foto. Acotamos el corrimiento
  // al margen real disponible: se prioriza cubrir el frame por sobre respetar el
  // focal al 100%.
  const slackX = Math.max(0, (mesh.scale.x - viewW) / 2)
  const slackY = Math.max(0, (planeH - viewH) / 2)
  const wantX = (0.5 - focalX) * mesh.scale.x
  const wantY = -(0.5 - focalY) * planeH
  mesh.position.x = Math.min(Math.max(wantX, -slackX), slackX)
  mesh.position.y = Math.min(Math.max(wantY, -slackY), slackY)
}

/**
 * Textured plane sized to cover the viewport (hero card v1 — no GLB yet).
 *
 * `tint` + `opacity` multiply the texture (material.color acts as a filter in
 * MeshBasicMaterial) — used to turn one photo into a cheap, darkened "bleed"
 * layer for a background plane when there's no separate environment asset yet.
 * It's a placeholder technique, not a blur; swap for real environment art
 * once it exists.
 */
export function createCoverPlane(
  texture,
  { colorSpace = THREE.SRGBColorSpace, maxAnisotropy = 16, tint = null, opacity = 1 } = {},
) {
  texture.colorSpace = colorSpace
  texture.anisotropy = maxAnisotropy
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: texture,
      toneMapped: false,
      // Pasar `color: undefined` cuando no hay tint hace que Three.js loguee
      // "parameter 'color' has value of undefined" — solo se incluye la key
      // si de verdad hay un tint.
      ...(tint ? { color: new THREE.Color(tint) } : {}),
      transparent: opacity < 1,
      opacity,
    }),
  )
  return mesh
}
