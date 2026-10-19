/**
 * El look «ilustración» de VESPER: las piezas son 3D, pero se pintan como las imágenes de referencia
 * (línea de tinta y color plano). Dos cosas:
 *
 * - `drawn`: la textura generada se ve casi tal cual (ya trae el sombreado dibujado); la luz suma apenas
 *   un poco de volumen. Nada de luz dramática ni filtro cálido: así quedaba oscuro y naranja.
 * - `outline`: contorno de tinta por casco invertido, con grosor fijo en píxeles (no engorda de cerca
 *   ni desaparece de lejos).
 */

const INK = '#2b1f17'

export function createInk(THREE, { width = 1.6, color = INK } = {}) {
  const res = new THREE.Vector2(1, 1)
  const outlineMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uRes: { value: res }, uWidth: { value: width }, uColor: { value: new THREE.Color(color) } },
    vertexShader: `
      uniform vec2 uRes;
      uniform float uWidth;
      void main() {
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vec2 dir = normalize((projectionMatrix * vec4(n, 0.0)).xy + 1e-5);
        clip.xy += dir * uWidth * 2.0 / uRes * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4(uColor, 1.0); }`,
  })

  /** Material de dibujo para una malla con textura. */
  const drawn = (old) => {
    const m = new THREE.MeshLambertMaterial({
      map: old.map,
      color: new THREE.Color(0.32, 0.32, 0.32),
      emissive: new THREE.Color(0.8, 0.8, 0.8),
      emissiveMap: old.map,
    })
    old.dispose()
    return m
  }

  return {
    /** Pasa todas las mallas con textura de `root` al material de dibujo y les suma el contorno. */
    apply(root, { outline = true, skip = () => false } = {}) {
      const meshes = []
      root.traverse((o) => {
        if (o.isMesh && o.material?.map && !skip(o)) meshes.push(o)
      })
      for (const o of meshes) {
        o.material = drawn(o.material)
        if (!outline) continue
        const hull = new THREE.Mesh(o.geometry, outlineMat)
        hull.renderOrder = -1
        o.add(hull)
      }
    },
    setSize(w, h) {
      res.set(Math.max(1, w), Math.max(1, h))
    },
    dispose() {
      outlineMat.dispose()
    },
  }
}
