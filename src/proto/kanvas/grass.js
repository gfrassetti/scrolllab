/**
 * El pasto seco del hero: miles de hojas instanciadas que se mecen con el viento (un solo draw call).
 *
 * La altura sale del suelo del GLB: es una grilla regular, así que se arma un mapa de alturas con sus
 * vértices y se interpola (nada de raycasts). El viento va en el vertex shader: la punta de cada hoja se
 * corre más que la base, con una ola que cruza el campo. El sendero queda limpio.
 */

const rnd = (seed) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

/** Mapa de alturas a partir de la malla de una grilla (coordenadas de mundo de three). */
function heightField(mesh, cell) {
  mesh.updateMatrixWorld(true)
  const pos = mesh.geometry.attributes.position
  const v = { x: 0, y: 0, z: 0 }
  const map = new Map()
  let minX = Infinity
  let minZ = Infinity
  const pts = []
  const m = mesh.matrixWorld.elements
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    v.x = m[0] * x + m[4] * y + m[8] * z + m[12]
    v.y = m[1] * x + m[5] * y + m[9] * z + m[13]
    v.z = m[2] * x + m[6] * y + m[10] * z + m[14]
    pts.push([v.x, v.y, v.z])
    minX = Math.min(minX, v.x)
    minZ = Math.min(minZ, v.z)
  }
  for (const [x, y, z] of pts) map.set(`${Math.round((x - minX) / cell)},${Math.round((z - minZ) / cell)}`, y)
  const at = (i, j) => map.get(`${i},${j}`) ?? 0
  return (x, z) => {
    const fx = (x - minX) / cell
    const fz = (z - minZ) / cell
    const i = Math.floor(fx)
    const j = Math.floor(fz)
    const tx = fx - i
    const tz = fz - j
    const a = at(i, j) * (1 - tx) + at(i + 1, j) * tx
    const b = at(i, j + 1) * (1 - tx) + at(i + 1, j + 1) * tx
    return a * (1 - tz) + b * tz
  }
}

export function createGrass(THREE, { ground, cell, count = 20000, area = [-11, 11, -15, 12], avoid = () => false, height = 0.3 }) {
  const heightAt = heightField(ground, cell)

  // una hoja: tira de 3 tramos que se afina hacia la punta (y de 0 a 1)
  const g = new THREE.BufferGeometry()
  const w = 0.018
  const P = []
  const I = []
  for (let k = 0; k <= 3; k++) {
    const t = k / 3
    const hw = w * (1 - t * 0.9)
    P.push(-hw, t, 0, hw, t, 0)
  }
  for (let k = 0; k < 3; k++) {
    const a = k * 2
    I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
  g.setIndex(I)
  g.computeVertexNormals()

  const uniforms = { uTime: { value: 0 } }
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float tip = position.y * position.y;
        float wave = sin(uTime * 1.6 + ip.x * 0.35 + ip.z * 0.22) * 0.5 + sin(uTime * 3.1 + ip.x * 1.7) * 0.18;
        transformed.x += tip * (0.18 + wave * 0.22);
        transformed.z += tip * wave * 0.08;`,
      )
    // la hoja es más oscura en la base: da volumen al campo sin sombras
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vH;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 0.72 + 0.28 * vH;')
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vH;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position.y;')
  }

  const mesh = new THREE.InstancedMesh(g, mat, count)
  const r = rnd(7)
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const e = new THREE.Euler()
  const s = new THREE.Vector3()
  const p = new THREE.Vector3()
  const c = new THREE.Color()
  const tones = ['#e2bf72', '#d4a85a', '#ecd08e', '#c39a52', '#b4a25e'].map((h) => new THREE.Color(h))
  let n = 0
  for (let tries = 0; n < count && tries < count * 4; tries++) {
    const x = area[0] + r() * (area[1] - area[0])
    const z = area[2] + r() * (area[3] - area[2])
    if (avoid(x, z)) continue
    p.set(x, heightAt(x, z) - 0.02, z)
    e.set((r() - 0.5) * 0.35, r() * Math.PI * 2, (r() - 0.5) * 0.35)
    q.setFromEuler(e)
    const hh = height * (0.55 + r() * 0.9)
    s.set(1 + r() * 0.8, hh, 1)
    m4.compose(p, q, s)
    mesh.setMatrixAt(n, m4)
    c.copy(tones[Math.floor(r() * tones.length)]).multiplyScalar(0.85 + r() * 0.3)
    mesh.setColorAt(n, c)
    n++
  }
  mesh.count = n
  mesh.frustumCulled = false

  return {
    object: mesh,
    heightAt,
    update(now) {
      uniforms.uTime.value = now * 0.001
    },
    dispose() {
      g.dispose()
      mat.dispose()
    },
  }
}
