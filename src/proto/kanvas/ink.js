/**
 * El look «ilustración» de VESPER: las piezas son 3D, pero se pintan como las imágenes de referencia
 * (línea de tinta y color plano). Dos cosas:
 *
 * - `drawn`: la textura generada se ve casi tal cual (ya trae el sombreado dibujado); la luz suma apenas
 *   un poco de volumen. Nada de luz dramática ni filtro cálido: así quedaba oscuro y naranja.
 * - `outline`: contorno de tinta por casco invertido, con grosor fijo en píxeles (no engorda de cerca
 *   ni desaparece de lejos).
 * - `breathe` (los personajes): respiran. El pecho se infla apenas y los hombros y la cabeza suben y bajan,
 *   un ciclo cada ~4 s, desfasado entre personajes. Es un corrimiento de vértices en el shader (los GLB
 *   no tienen esqueleto); el contorno respira con el cuerpo.
 */

const INK = '#2b1f17'

// p: posición del vértice. uSpan: la altura del modelo (mín y máx en y); uCenter: su eje (x, z); uPhase:
// desfase. Solo depende de la posición, no de la normal: los GLB traen las caras sueltas (cada una con su
// normal) y empujar por la normal las separaba y dejaba ver el contorno por las rendijas.
const BREATHE = `
uniform float uTime;
uniform vec2 uSpan;
uniform vec2 uCenter;
uniform float uPhase;
vec3 breathe(vec3 p) {
  float s = max(uSpan.y - uSpan.x, 1e-4);
  float h = clamp((p.y - uSpan.x) / s, 0.0, 1.0);
  float b = sin(uTime * 1.55 + uPhase) * 0.5 + 0.5;
  float chest = smoothstep(0.5, 0.62, h) * (1.0 - smoothstep(0.78, 0.88, h));
  p.xz += (p.xz - uCenter) * chest * b * 0.024;
  p.y += smoothstep(0.55, 0.78, h) * b * s * 0.006;
  return p;
}
`

export function createInk(THREE, { width = 1.6, color = INK } = {}) {
  const res = new THREE.Vector2(1, 1)
  const time = { value: 0 }
  const outlines = []
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

  /** El contorno de un personaje: el mismo casco invertido, pero respirando con el cuerpo. */
  const breathingOutline = (span, center, phase) => {
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { ...outlineMat.uniforms, uTime: time, uSpan: { value: span }, uCenter: { value: center }, uPhase: { value: phase } },
      vertexShader: `
        uniform vec2 uRes;
        uniform float uWidth;
        ${BREATHE}
        void main() {
          vec4 clip = projectionMatrix * modelViewMatrix * vec4(breathe(position), 1.0);
          vec3 n = normalize(normalMatrix * normal);
          vec2 dir = normalize((projectionMatrix * vec4(n, 0.0)).xy + 1e-5);
          clip.xy += dir * uWidth * 2.0 / uRes * clip.w;
          gl_Position = clip;
        }`,
      fragmentShader: outlineMat.fragmentShader,
    })
    outlines.push(m)
    return m
  }

  return {
    /**
     * Pasa todas las mallas con textura de `root` al material de dibujo y les suma el contorno. Con
     * `breathe`, además respiran (personajes); `phase` los desfasa entre sí.
     */
    apply(root, { outline = true, skip = () => false, breathe = false, phase = 0 } = {}) {
      const meshes = []
      root.traverse((o) => {
        if (o.isMesh && o.material?.map && !skip(o)) meshes.push(o)
      })
      for (const o of meshes) {
        o.material = drawn(o.material)
        let span = null
        let center = null
        if (breathe) {
          o.geometry.computeBoundingBox()
          const bb = o.geometry.boundingBox
          span = new THREE.Vector2(bb.min.y, bb.max.y)
          center = new THREE.Vector2((bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2)
          o.material.onBeforeCompile = (sh) => {
            sh.uniforms.uTime = time
            sh.uniforms.uSpan = { value: span }
            sh.uniforms.uCenter = { value: center }
            sh.uniforms.uPhase = { value: phase }
            sh.vertexShader = sh.vertexShader
              .replace('#include <common>', `#include <common>
${BREATHE}`)
              .replace('#include <begin_vertex>', 'vec3 transformed = breathe(vec3(position));')
          }
          o.material.customProgramCacheKey = () => 'vesper-breathe'
          o.frustumCulled = false // el bounding box no cuenta el inflado (es mínimo, pero no parpadea)
        }
        if (!outline) continue
        const hull = new THREE.Mesh(o.geometry, breathe ? breathingOutline(span, center, phase) : outlineMat)
        hull.renderOrder = -1
        hull.frustumCulled = !breathe
        o.add(hull)
      }
    },
    /** El reloj de la respiración (segundos). */
    tick(now) {
      time.value = now / 1000
    },
    setSize(w, h) {
      res.set(Math.max(1, w), Math.max(1, h))
    },
    dispose() {
      outlineMat.dispose()
      outlines.forEach((m) => m.dispose())
    },
  }
}
