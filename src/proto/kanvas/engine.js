import * as THREE from 'three'

/**
 * Kanvas — prototipo del «todo en un canvas» (estudio de kprverse.com, solo local).
 *
 * Un único <canvas> fijo a pantalla completa y un único bucle. El HTML es el esqueleto: cada
 * imagen de la página es un `div` vacío (un «slot») y, cuadro a cuadro, el canvas dibuja un plano
 * exactamente encima de su rectángulo (getBoundingClientRect). La forma la recorta el shader (un radio
 * por esquina: arco arriba, píldora…), así se puede animar: un plano a pantalla completa se convierte
 * en card sin cortes.
 *
 * Nada se monta ni se desmonta: el loader, el hero y las cards son el mismo dibujo cambiando de
 * estado. Por eso no hay saltos entre tramos.
 */

// Giro en 3D (alrededor del eje vertical / horizontal del plano) con perspectiva: la cámara es
// ortográfica, así que la profundidad se simula escalando cada vértice según qué tan cerca queda.
const VERT = /* glsl */ `
uniform vec2 uSize;
uniform vec2 uTurn;   // giro en radianes: x = alrededor del eje vertical, y = del horizontal
uniform float uPersp; // distancia de la «cámara» en px
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  if (uTurn.x != 0.0 || uTurn.y != 0.0) {
    vec3 q = vec3(p.x * uSize.x, p.y * uSize.y, 0.0);
    float cy = cos(uTurn.x), sy = sin(uTurn.x);
    q = vec3(q.x * cy, q.y, -q.x * sy);
    float cx = cos(uTurn.y), sx = sin(uTurn.y);
    q = vec3(q.x, q.y * cx - q.z * sx, q.y * sx + q.z * cx);
    float k = uPersp / (uPersp - q.z);
    p = vec3(q.x * k / uSize.x, q.y * k / uSize.y, 0.0);
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform vec2 uSize;      // px del plano
uniform vec2 uMapSize;   // px de la imagen
uniform vec4 uRadii;     // radio de cada esquina: arriba-der, abajo-der, arriba-izq, abajo-izq (px)
uniform vec2 uShift;     // corrimiento de la imagen dentro del plano (parallax, en fracción)
uniform float uZoom;     // >1 = la imagen más grande que el plano (lugar para el parallax)
uniform float uAlpha;
uniform vec3 uTint;
uniform float uTintMix;
uniform vec4 uClip;      // ventana visible: x0, y0, x1, y1 en px del buffer (y desde abajo)

// Rectángulo con un radio por esquina (Inigo Quilez). Con los de arriba = medio ancho, es un arco;
// con todos = medio alto, una píldora / un ojo que se abre.
float sdRoundBox(vec2 p, vec2 b, vec4 r) {
  r.xy = (p.x > 0.0) ? r.xy : r.zw;
  r.x = (p.y > 0.0) ? r.x : r.y;
  vec2 q = abs(p) - b + r.x;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}

void main() {
  if (gl_FragCoord.x < uClip.x || gl_FragCoord.x > uClip.z || gl_FragCoord.y < uClip.y || gl_FragCoord.y > uClip.w) discard;
  vec2 hb = uSize * 0.5;
  vec2 p = (vUv - 0.5) * uSize; // centro, y hacia arriba
  vec4 r = min(uRadii, vec4(min(hb.x, hb.y)));
  float d = sdRoundBox(p, hb, r);
  float mask = 1.0 - smoothstep(-1.0, 1.0, d);
  if (mask <= 0.001) discard;

  // la imagen «cubre» el plano (como object-fit: cover), con zoom y corrimiento
  vec2 ratio = vec2(
    min((uSize.x / uSize.y) / (uMapSize.x / uMapSize.y), 1.0),
    min((uSize.y / uSize.x) / (uMapSize.y / uMapSize.x), 1.0)
  );
  vec2 uv = vUv;
  uv = (uv - 0.5) * ratio / uZoom + 0.5 + uShift * (1.0 - ratio / uZoom) * 0.5;
  vec4 col = texture2D(uMap, uv);
  col.rgb = mix(col.rgb, uTint, uTintMix);
  gl_FragColor = vec4(col.rgb, col.a * mask * uAlpha);
}
`

const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (v) => Math.min(1, Math.max(0, v))

export function createKanvas(canvas, { clear = '#ffffff' } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
  // Como la referencia: en el teléfono se dibuja a menos píxeles que la pantalla (90 %, sin la
  // densidad ×3). En PC, hasta ×2. Es buena parte de la ligereza.
  const phone = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches
  renderer.setPixelRatio(phone ? 0.9 : Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const clearColor = new THREE.Color(clear)
  renderer.setClearColor(clearColor, 1)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -1000, 1000)
  // subdividido: con el giro en perspectiva, dos triángulos solos deformarían la imagen
  const geo = new THREE.PlaneGeometry(1, 1, 24, 24)

  let W = 1
  let H = 1
  const resize = () => {
    W = window.innerWidth
    H = window.innerHeight
    renderer.setSize(W, H, false)
    camera.right = W
    camera.bottom = -H
    camera.updateProjectionMatrix()
    for (const l of layers) l.onResize?.(W, H)
  }

  /**
   * Un plano recortado por el shader. Devuelve su manejador: rect, forma y textura se fijan por cuadro.
   * `frag` / `uniforms` permiten otro fragment shader con los mismos uniforms de base (la palabra de la carga).
   */
  const plane = (map, mapSize, z = 0, { frag = FRAG, uniforms = {} } = {}) => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: frag,
      transparent: true,
      depthTest: false,
      uniforms: {
        uMap: { value: map },
        uSize: { value: new THREE.Vector2(1, 1) },
        uMapSize: { value: new THREE.Vector2(...mapSize) },
        uRadii: { value: new THREE.Vector4(0, 0, 0, 0) },
        uShift: { value: new THREE.Vector2(0, 0) },
        uZoom: { value: 1 },
        uAlpha: { value: 1 },
        uTint: { value: new THREE.Color(0, 0, 0) },
        uTintMix: { value: 0 },
        uClip: { value: new THREE.Vector4(-1e5, -1e5, 1e5, 1e5) },
        uTurn: { value: new THREE.Vector2(0, 0) },
        uPersp: { value: 1400 },
        ...uniforms,
      },
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = z
    mesh.frustumCulled = false
    scene.add(mesh)
    const u = mat.uniforms
    return {
      mesh,
      u,
      /** Rect en px de pantalla (x, y arriba a la izquierda) y giro en radianes alrededor de su centro. */
      rect(x, y, w, h, rot = 0) {
        mesh.visible = w > 0.5 && h > 0.5 && y < H + 50 && y + h > -50
        mesh.scale.set(Math.max(1, w), Math.max(1, h), 1)
        mesh.position.set(x + w / 2, -(y + h / 2), 0)
        mesh.rotation.z = -rot // la pantalla tiene la y hacia abajo: positivo = horario, como en CSS
        u.uSize.value.set(Math.max(1, w), Math.max(1, h))
      },
      /** Radio de cada esquina en px: arriba / abajo (los de arriba en medio ancho = un arco). */
      shape({ top = 0, bottom = 0 } = {}) {
        u.uRadii.value.set(top, bottom, top, bottom)
      },
      /** Ventana fuera de la cual el plano no se dibuja (px de pantalla); sin argumentos, sin recorte. */
      clip(x, y, w, h) {
        if (x === undefined) return u.uClip.value.set(-1e5, -1e5, 1e5, 1e5)
        const d = renderer.getPixelRatio()
        u.uClip.value.set(x * d, (H - y - h) * d, (x + w) * d, (H - y) * d)
      },
      dispose() {
        scene.remove(mesh)
        mat.dispose()
      },
    }
  }

  const layers = []
  const add = (layer) => {
    layers.push(layer)
    layer.onResize?.(W, H)
    return layer
  }

  // --- el bucle -----------------------------------------------------------------------------
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 }
  const onPointer = (e) => {
    pointer.x = (e.clientX / W) * 2 - 1
    pointer.y = (e.clientY / H) * 2 - 1
  }
  window.addEventListener('pointermove', onPointer, { passive: true })

  let raf = 0
  let last = performance.now()
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    // amortiguado exponencial (λ ≈ 4): igual a cualquier frecuencia de refresco
    const k = 1 - Math.exp(-4 * dt)
    pointer.sx += (pointer.x - pointer.sx) * k
    pointer.sy += (pointer.y - pointer.sy) * k
    const state = { now, dt, W, H, scrollY: window.scrollY, pointer }
    for (const l of layers) l.update?.(state)
    renderer.setClearColor(clearColor, 1)
    renderer.setRenderTarget(null)
    renderer.render(scene, camera)
  }

  window.addEventListener('resize', resize)
  resize()
  raf = requestAnimationFrame(frame)

  return {
    THREE,
    renderer,
    scene,
    plane,
    add,
    clearColor,
    size: () => ({ W, H }),
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      for (const l of layers) l.dispose?.()
      geo.dispose()
      renderer.dispose()
    },
  }
}

export { lerp, clamp01, VERT }
