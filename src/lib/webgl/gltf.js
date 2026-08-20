import * as THREE from 'three'

/**
 * Scale + center object so max axis fits `targetSize` (monolith HeroThree recipe).
 */
export function fitObjectToBox(object, targetSize = 1.8) {
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const maxAxis = Math.max(size.x, size.y, size.z) || 1
  object.scale.setScalar(targetSize / maxAxis)
  box.setFromObject(object)
  const center = box.getCenter(new THREE.Vector3())
  object.position.sub(center)
}

/**
 * Auto-frame hero GLB: busts stay centered; full-body meshes crop to face.
 */
export function fitHeroGlb(object, targetSize = 1.75) {
  fitObjectToBox(object, targetSize)
  const box = new THREE.Box3().setFromObject(object)
  const h = box.max.y - box.min.y || 1
  const w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 0.01)
  if (h / w > 1.45) {
    const focalY = box.min.y + h * 0.82
    object.position.y -= focalY
  } else {
    object.position.y -= h * 0.06
  }
}

export function disposeObject(object) {
  object.traverse((node) => {
    node.geometry?.dispose?.()
    const mats = Array.isArray(node.material) ? node.material : [node.material]
    mats.forEach((mat) => {
      if (!mat) return
      Object.values(mat).forEach((v) => {
        if (v?.isTexture) v.dispose()
      })
      mat.dispose?.()
    })
  })
}

/**
 * Load GLB/GLTF. Uses dynamic import so templates sin modelo no pagan el chunk en build fallido.
 */
export async function loadGltf(url) {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const loader = new GLTFLoader()
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      reject,
    )
  })
}
