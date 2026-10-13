import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { createFrameBudget, fitCameraDistance } from '../../lib/motion'

/**
 * cāpsula33 — la fachada como objeto.
 *
 * La cápsula naranja de la vereda (Gral. Roca 1120), flotando en el espacio:
 * un casco con forma de píldora, el nombre arriba, dos rieles de neón en el
 * techo y la luz cálida de la barra por debajo. Sus ventanas son la
 * navegación del sitio:
 *
 *  - el ojo de buey redondo «ā33» es un túnel infinito, como el del local;
 *  - las ventanas pastilla tienen profundidad (interior mapping: la foto vive
 *    detrás del vidrio y se corre con el ángulo, así que al girar la cápsula
 *    se ve *adentro*).
 *
 * Se gira arrastrando (mouse o dedo, horizontal: el scroll vertical del
 * teléfono sigue andando). Pasar por una ventana la enciende y avisa con
 * `onHover`; tocarla llama a `onSelect` con su id y su posición en pantalla.
 */

const ORANGE = new THREE.Color('#d9520f')
const CREAM = new THREE.Color('#efe4d2')
const NEON = new THREE.Color('#ff7a1a')

const R = 1 // radio del casco
const L = 3.7 // largo del tramo recto
const HALF = L / 2

const WINDOW_VERTEX = /* glsl */ `
  uniform float uR;
  varying vec2 vUv;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec3 p = position;
    // Marco local del parche sobre un cilindro de eje X: T a lo largo,
    // B alrededor (hacia arriba en el frente), N hacia afuera.
    vec3 n = normalize(vec3(0.0, p.y, p.z));
    vec3 b = normalize(vec3(0.0, p.z, -p.y));
    vec3 t = vec3(1.0, 0.0, 0.0);
    vec4 world = modelMatrix * vec4(p, 1.0);
    vec3 v = normalize(cameraPosition - world.xyz);
    mat3 m = mat3(modelMatrix);
    vec3 tw = normalize(m * t);
    vec3 bw = normalize(m * b);
    vec3 nw = normalize(m * n);
    vView = vec3(dot(v, tw), dot(v, bw), dot(v, nw));
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const WINDOW_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform vec2 uSize;      // ancho y alto del parche, en metros
  uniform float uRound;    // 1 = ojo de buey redondo (túnel)
  uniform float uHover;
  uniform float uTime;
  uniform float uDepth;
  uniform vec2 uImageAspect;
  uniform vec3 uRim;
  uniform vec3 uRimHot;
  uniform vec3 uNeon;
  uniform vec3 uCream;
  varying vec2 vUv;
  varying vec3 vView;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 q = (vUv - 0.5) * uSize;
    float rim = 0.055;
    float d = uRound > 0.5
      ? length(q) - min(uSize.x, uSize.y) * 0.5
      : sdRoundBox(q, uSize * 0.5, uSize.x * 0.5);
    if (d > 0.0) discard;

    vec3 view = normalize(vView);
    float facing = max(view.z, 0.12);

    // El marco: crema, se enciende naranja al pasar por encima.
    if (d > -rim) {
      vec3 frame = mix(uRim, uRimHot, uHover);
      float bevel = smoothstep(-rim, -rim * 0.4, d) * 0.18;
      gl_FragColor = vec4(frame * (0.86 + bevel), 1.0);
      #include <colorspace_fragment>
      return;
    }

    vec3 color;
    if (uRound > 0.5) {
      // Túnel infinito (el ojo de buey del local): anillos de luz que corren
      // hacia el fondo, con el centro que se corre con la mirada.
      vec2 c = q - view.xy / facing * 0.09;
      float r = length(c) / (min(uSize.x, uSize.y) * 0.5);
      float z = 0.36 / (r + 0.03);
      float speed = 0.55 + uHover * 1.6;
      float ring = fract(z - uTime * speed);
      float lineMask = smoothstep(0.0, 0.05, ring) * smoothstep(0.22, 0.05, ring);
      float spokes = 0.5 + 0.5 * cos(atan(c.y, c.x) * 12.0);
      float fade = smoothstep(0.02, 0.55, r);
      vec3 hot = mix(uNeon, uCream, 0.35 + 0.4 * uHover);
      color = mix(vec3(0.03, 0.02, 0.02), hot * 1.25, lineMask * fade);
      color += hot * (1.0 - smoothstep(0.0, 0.28, r)) * (0.85 + uHover * 0.8);
      color += uNeon * spokes * 0.05 * fade;
    } else {
      // Interior mapping: la foto está uDepth metros detrás del vidrio.
      vec2 offset = view.xy / facing * uDepth;
      vec2 room = uSize * 1.45;
      vec2 uv = (q - offset) / room + 0.5;
      // Cover: la foto llena el cuarto sin deformarse.
      float roomAspect = room.x / room.y;
      vec2 scale = uImageAspect.x / uImageAspect.y > roomAspect
        ? vec2(roomAspect / (uImageAspect.x / uImageAspect.y), 1.0)
        : vec2(1.0, (uImageAspect.x / uImageAspect.y) / roomAspect);
      uv = (uv - 0.5) * scale + 0.5;
      vec3 photo = uHasMap > 0.5 ? texture2D(uMap, clamp(uv, 0.0, 1.0)).rgb : vec3(0.08);
      // De noche y con la luz cálida del local; se aclara al pasar.
      photo = pow(photo, vec3(1.08)) * (0.62 + uHover * 0.5);
      float inner = smoothstep(-rim, -rim - 0.16, d);
      color = photo * mix(0.35, 1.0, inner);
    }

    // El vidrio: reflejo de borde y un brillo que cruza en diagonal.
    float fresnel = pow(1.0 - facing, 3.0);
    float streak = smoothstep(0.035, 0.0, abs(q.x + q.y * 0.35 - 0.12 + view.x * 0.25)) * 0.16;
    color += vec3(0.75, 0.78, 0.85) * (fresnel * 0.35 + streak);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

/** Parche curvo sobre el casco: x de x0 a x1, ángulo de a0 a a1 (0 = frente, + hacia arriba). */
function curvedPatch(x0, x1, a0, a1, radius, segX = 8, segA = 24) {
  const g = new THREE.BufferGeometry()
  const pos = []
  const uv = []
  const idx = []
  for (let j = 0; j <= segA; j += 1) {
    const a = a0 + ((a1 - a0) * j) / segA
    for (let i = 0; i <= segX; i += 1) {
      const x = x0 + ((x1 - x0) * i) / segX
      pos.push(x, radius * Math.sin(a), radius * Math.cos(a))
      uv.push(i / segX, j / segA)
    }
  }
  for (let j = 0; j < segA; j += 1) {
    for (let i = 0; i < segX; i += 1) {
      const a = j * (segX + 1) + i
      const b = a + 1
      const c = a + segX + 1
      const d = c + 1
      idx.push(a, b, d, a, d, c)
    }
  }
  g.setIndex(idx)
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}

/** El nombre escrito en un canvas (fuente del sitio), para pegarlo sobre el casco. */
function textTexture(text, { font, color = '#f6efe4', height = 256, padding = 0.08 }) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.font = `${height * 0.62}px ${font}`
  const w = Math.ceil(ctx.measureText(text).width + height * padding * 2)
  canvas.width = w
  canvas.height = height
  ctx.font = `${height * 0.62}px ${font}`
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, height * padding, height * 0.54)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return { tex, aspect: w / height }
}

/** Halo suave (sprite aditivo) para el neón y la luz de abajo. */
function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   mount: HTMLElement,
 *   windows: { id: string, kind: 'round' | 'pill', x: number, width: number, height: number, image?: string }[],
 *   wordmark: string,
 *   badge: string,
 *   fonts: { mono: string },
 *   calm?: boolean,
 *   onHover?: (win: object | null, screen: { x: number, y: number } | null) => void,
 *   onReady?: () => void,
 * }} options
 */
export function createCapsuleScene({ canvas, mount, windows, wordmark, badge, fonts, calm = false, onHover, onReady }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  const baseDpr = Math.min(window.devicePixelRatio || 1, 2)
  renderer.setPixelRatio(baseDpr)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  // Neutral respeta el naranja de la fachada (ACES lo lavaba a durazno).
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1
  renderer.setClearColor('#070708', 1)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = env

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120)
  const BASE_Z = 13.2
  // En pantallas anchas la cápsula flota arriba y deja el título abajo.
  let lift = 0.55
  camera.position.set(0, 0.35, BASE_Z)

  // Luz: cálida arriba a la izquierda, fría de contra, naranja desde abajo (la barra).
  scene.add(new THREE.HemisphereLight('#2a2a35', '#0a0604', 0.6))
  const key = new THREE.DirectionalLight('#fff1e0', 2.2)
  key.position.set(-4, 5, 6)
  scene.add(key)
  const rimLight = new THREE.DirectionalLight('#8fb4ff', 1.4)
  rimLight.position.set(5, 2, -6)
  scene.add(rimLight)
  const under = new THREE.PointLight('#ffb35c', 14, 7, 2)
  under.position.set(0, -2.1, 1.2)
  scene.add(under)

  // Estrellas.
  {
    const n = 1400
    const pts = new Float32Array(n * 3)
    for (let i = 0; i < n; i += 1) {
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const rr = 30 + Math.random() * 40
      const s = Math.sqrt(1 - u * u)
      pts[i * 3] = rr * s * Math.cos(th)
      pts[i * 3 + 1] = rr * u
      pts[i * 3 + 2] = -Math.abs(rr * s * Math.sin(th))
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3))
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#d9d2c6', size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.7 })))
  }

  const capsule = new THREE.Group()
  scene.add(capsule)
  const ship = new THREE.Group() // lo que se gira; `capsule` flota y sube con el scroll
  capsule.add(ship)

  // Casco.
  const hullMat = new THREE.MeshPhysicalMaterial({
    color: ORANGE,
    roughness: 0.5,
    metalness: 0.02,
    clearcoat: 0.4,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.55,
  })
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(R, L, 24, 96), hullMat)
  hull.rotation.z = Math.PI / 2
  ship.add(hull)

  // Juntas oscuras donde el tramo recto se encuentra con las puntas, y una línea de panel.
  const seamMat = new THREE.MeshStandardMaterial({ color: '#1a0f0a', roughness: 0.6 })
  for (const x of [-HALF, HALF, -0.95]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.004, 0.012, 8, 120), seamMat)
    ring.rotation.y = Math.PI / 2
    ring.position.x = x
    ship.add(ring)
  }

  // Zócalo negro con la luz cálida debajo (como la barra plisada).
  const skirt = new THREE.Mesh(
    curvedPatch(-HALF - 0.05, HALF + 0.05, -2.25, -1.55, R + 0.006, 16, 12),
    new THREE.MeshStandardMaterial({ color: '#111113', roughness: 0.7, side: THREE.DoubleSide }),
  )
  ship.add(skirt)
  const led = new THREE.Mesh(
    curvedPatch(-HALF, HALF, -1.6, -1.53, R + 0.012, 16, 2),
    new THREE.MeshBasicMaterial({ color: '#ffd9a0', side: THREE.DoubleSide, toneMapped: false }),
  )
  ship.add(led)

  // El plisado de la barra en la panza: costillas finas, del mismo naranja.
  {
    // Cada costilla en tramos cortos que siguen la curva (una recta se hundía en el casco).
    const SEG = 6
    const ribGeo = new THREE.BoxGeometry(0.032, 1, 0.04)
    const ribs = new THREE.InstancedMesh(ribGeo, hullMat, 64 * SEG)
    const a0 = -1.47
    const a1 = -0.86
    const step = (a1 - a0) / SEG
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, step * R * 1.04, 1)
    let n = 0
    for (let x = -HALF + 0.12; x <= HALF - 0.12; x += 0.058) {
      for (let k = 0; k < SEG; k += 1) {
        const a = a0 + step * (k + 0.5)
        const pos = new THREE.Vector3(x, (R + 0.016) * Math.sin(a), (R + 0.016) * Math.cos(a))
        q.setFromEuler(new THREE.Euler(-a, 0, 0))
        m.compose(pos, q, scale)
        ribs.setMatrixAt(n, m)
        n += 1
      }
    }
    ribs.count = n
    ship.add(ribs)
  }

  // Los anillos de luz de sus lámparas, orbitando como en una estación.
  const rings = []
  {
    const ringMat = new THREE.MeshBasicMaterial({ color: '#fff7ee', toneMapped: false })
    const ringGlowMat = new THREE.MeshBasicMaterial({ color: '#fff1dd', transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false })
    for (const [radius, tilt, spin] of [
      [3.55, 0.42, 0.09],
      [3.95, -0.28, -0.06],
    ]) {
      const g = new THREE.Group()
      g.add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.009, 8, 220), ringMat))
      g.add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.07, 8, 220), ringGlowMat))
      g.rotation.set(Math.PI / 2 + tilt, 0, tilt * 0.6)
      g.userData.spin = spin
      capsule.add(g)
      rings.push(g)
    }
  }

  // Dos rieles de neón en el techo.
  const glow = glowTexture()
  const neonMat = new THREE.MeshBasicMaterial({ color: NEON, toneMapped: false })
  for (const a of [1.32, 1.82]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, L + 0.3, 8), neonMat)
    rail.rotation.z = Math.PI / 2
    rail.position.set(0, (R + 0.06) * Math.sin(a), (R + 0.06) * Math.cos(a))
    ship.add(rail)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: NEON, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }))
    halo.scale.set(L + 1.4, 0.7, 1)
    halo.position.copy(rail.position).multiplyScalar(1.04)
    ship.add(halo)
  }

  // El derrame de luz de la barra hacia abajo.
  const spill = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ff9a3c', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }))
  spill.scale.set(7.5, 1.6, 1)
  spill.position.set(0, -1.55, 0.2)
  capsule.add(spill)

  // El nombre sobre las ventanas, como en la fachada.
  {
    const { tex, aspect } = textTexture(wordmark, { font: fonts.mono, color: '#fffaf2' })
    const h = 0.4
    const w = h * aspect
    const a0 = 0.6
    const a1 = a0 + h / R
    const x0 = -HALF + 0.05
    const label = new THREE.Mesh(
      curvedPatch(x0, x0 + w, a0, a1, R + 0.008, 24, 6),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
    )
    ship.add(label)
  }

  // Ventanas.
  const loader = new THREE.TextureLoader()
  const picks = []
  const windowMeshes = windows.map((win) => {
    const height = win.kind === 'round' ? win.width : win.height
    const da = height / R
    const center = win.kind === 'round' ? 0.08 : -0.02
    const geo = curvedPatch(win.x - win.width / 2, win.x + win.width / 2, center - da / 2, center + da / 2, R + 0.01, 24, 32)
    const uniforms = {
      uMap: { value: null },
      uHasMap: { value: 0 },
      uSize: { value: new THREE.Vector2(win.width, height) },
      uRound: { value: win.kind === 'round' ? 1 : 0 },
      uHover: { value: 0 },
      uTime: { value: 0 },
      uDepth: { value: 0.32 },
      uImageAspect: { value: new THREE.Vector2(1126, 2000) },
      uRim: { value: CREAM.clone() },
      uRimHot: { value: NEON.clone() },
      uNeon: { value: NEON.clone() },
      uCream: { value: CREAM.clone() },
      uR: { value: R },
    }
    const mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({ vertexShader: WINDOW_VERTEX, fragmentShader: WINDOW_FRAGMENT, uniforms }),
    )
    mesh.userData = { win, hover: 0, center: new THREE.Vector3(win.x, (R + 0.01) * Math.sin(center), (R + 0.01) * Math.cos(center)) }
    if (win.image) {
      loader.load(win.image, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = 8
        uniforms.uMap.value = tex
        uniforms.uHasMap.value = 1
        uniforms.uImageAspect.value.set(tex.image.width, tex.image.height)
      })
    }
    ship.add(mesh)
    picks.push(mesh)
    return mesh
  })

  // La placa «ā33» debajo del ojo de buey.
  const round = windows.find((w) => w.kind === 'round')
  if (round && badge) {
    const { tex, aspect } = textTexture(badge, { font: fonts.mono, color: '#f6efe4' })
    const h = 0.2
    const w = h * aspect
    const a1 = 0.08 - round.width / 2 / R - 0.04
    ship.add(
      new THREE.Mesh(
        curvedPatch(round.x - w / 2, round.x + w / 2, a1 - h / R, a1, R + 0.008, 8, 4),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
      ),
    )
  }

  // Tamaño y encuadre.
  let width = 1
  let height = 1
  let baseZ = BASE_Z
  const resize = () => {
    width = mount.clientWidth || 1
    height = mount.clientHeight || 1
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // La cápsula entera (5,7 m de punta a punta) entra en pantallas angostas.
    // En un teléfono parado alcanza con que entren las ventanas: las puntas se
    // salen de cuadro y la cápsula se ve grande, como vista de cerca.
    const portrait = camera.aspect < 0.8
    baseZ = fitCameraDistance({ fov: camera.fov, aspect: camera.aspect, radius: portrait ? 2.15 : HALF + R + 0.35, base: BASE_Z, fill: 0.92 })
    lift = camera.aspect > 1.1 ? 0.55 : portrait ? 0.62 : 0.35
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(mount)
  resize()

  // Arrastrar para girar (solo horizontal: el vertical es del scroll).
  const state = { yaw: -0.38, pitch: 0.12, vYaw: 0, dragging: false, lastX: 0, lastY: 0, downX: 0, downY: 0, moved: 0, progress: 0, entering: false }
  const pointer = new THREE.Vector2(-10, -10)
  let hovered = null
  const raycaster = new THREE.Raycaster()

  const toLocal = (e) => {
    const rect = canvas.getBoundingClientRect()
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
  }
  const onDown = (e) => {
    state.dragging = true
    state.lastX = state.downX = e.clientX
    state.lastY = state.downY = e.clientY
    state.moved = 0
    toLocal(e)
  }
  const onMove = (e) => {
    toLocal(e)
    if (!state.dragging) return
    const dx = e.clientX - state.lastX
    const dy = e.clientY - state.lastY
    state.lastX = e.clientX
    state.lastY = e.clientY
    // Distancia desde donde empezó: un toque con un temblor de pocos píxeles sigue siendo toque.
    state.moved = Math.hypot(e.clientX - state.downX, e.clientY - state.downY)
    if (state.moved < 6) return
    state.vYaw = (dx / width) * 6
    state.yaw += state.vYaw
    state.pitch = THREE.MathUtils.clamp(state.pitch + (dy / height) * 1.2, -0.35, 0.45)
  }
  const onUp = () => {
    state.dragging = false
  }
  const onLeave = () => {
    state.dragging = false
    pointer.set(-10, -10)
  }
  canvas.addEventListener('pointerdown', onDown)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointerleave', onLeave)

  const screenOf = (mesh) => {
    const v = mesh.userData.center.clone()
    mesh.localToWorld(v)
    v.project(camera)
    const rect = canvas.getBoundingClientRect()
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height }
  }

  const pickAt = () => {
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(picks, false)[0]
    if (!hit) return null
    // El parche es un rectángulo: solo cuenta dentro del vidrio (no las esquinas).
    const { uv } = hit
    const mesh = hit.object
    const size = mesh.material.uniforms.uSize.value
    const q = new THREE.Vector2((uv.x - 0.5) * size.x, (uv.y - 0.5) * size.y)
    const inside =
      mesh.material.uniforms.uRound.value > 0.5
        ? q.length() < Math.min(size.x, size.y) / 2
        : (() => {
            const r = size.x / 2
            const ax = Math.abs(q.x) - size.x / 2 + r
            const ay = Math.abs(q.y) - size.y / 2 + r
            return Math.hypot(Math.max(ax, 0), Math.max(ay, 0)) + Math.min(Math.max(ax, ay), 0) - r < 0
          })()
    return inside ? mesh : null
  }

  /** La ventana bajo un toque/click, o null. El arrastre no cuenta como toque. */
  const pick = (e) => {
    if (state.moved > 10) return null
    toLocal(e)
    const mesh = pickAt()
    return mesh ? { win: mesh.userData.win, screen: screenOf(mesh) } : null
  }

  // Cuadro a cuadro.
  const budget = createFrameBudget({ dpr: baseDpr, apply: (dpr) => renderer.setPixelRatio(dpr) })
  const clock = new THREE.Clock()
  let raf = 0
  let enterT = 0
  let enterFrom = null
  let enterTo = null
  let enterDone = null
  const ENTER_S = 1.05

  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05)
    budget.tick(dt * 1000)
    const t = clock.elapsedTime

    if (!state.dragging) {
      state.vYaw *= Math.pow(0.04, dt)
      state.yaw += state.vYaw
      if (!calm) state.yaw += Math.sin(t * 0.25) * 0.0009
    }
    ship.rotation.y = state.yaw + state.progress * 1.1
    ship.rotation.x = state.pitch
    capsule.position.y = lift + (calm ? 0 : Math.sin(t * 0.8) * 0.06) + state.progress * 1.6
    capsule.rotation.z = calm ? 0 : Math.sin(t * 0.5) * 0.02
    if (!calm) for (const r of rings) r.rotation.z += r.userData.spin * dt

    if (state.entering) {
      enterT = Math.min(1, enterT + dt / ENTER_S)
      const e = enterT < 0.5 ? 4 * enterT ** 3 : 1 - (-2 * enterT + 2) ** 3 / 2
      camera.position.lerpVectors(enterFrom.pos, enterTo.pos, e)
      camera.lookAt(new THREE.Vector3().lerpVectors(enterFrom.look, enterTo.look, e))
      if (enterT >= 1 && enterDone) {
        const done = enterDone
        enterDone = null
        done()
      }
    } else {
      camera.position.set(0, 0.35, baseZ + state.progress * 1.5)
      camera.lookAt(0, 0.05, 0)
    }

    // Hover.
    const next = state.dragging || state.entering ? null : pickAt()
    if (next !== hovered) {
      hovered = next
      canvas.style.cursor = hovered ? 'pointer' : 'grab'
      onHover?.(hovered ? hovered.userData.win : null, hovered ? screenOf(hovered) : null)
    }
    for (const mesh of windowMeshes) {
      const target = mesh === hovered ? 1 : 0
      mesh.userData.hover += (target - mesh.userData.hover) * Math.min(1, dt * 8)
      mesh.material.uniforms.uHover.value = mesh.userData.hover
      mesh.material.uniforms.uTime.value = t
    }

    renderer.render(scene, camera)
    raf = requestAnimationFrame(frame)
  }

  let readyCalled = false
  const startLoop = () => {
    if (raf) return
    clock.getDelta()
    raf = requestAnimationFrame((now) => {
      frame(now)
      if (!readyCalled) {
        readyCalled = true
        onReady?.()
      }
    })
  }
  const stopLoop = () => {
    cancelAnimationFrame(raf)
    raf = 0
  }

  // Solo dibuja mientras se ve.
  const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? startLoop() : stopLoop()), { threshold: 0 })
  io.observe(mount)

  return {
    pick,
    setProgress(p) {
      state.progress = p
    },
    /** La cámara se mete por la ventana; `done` corre al llegar. */
    enter(id, done) {
      const mesh = windowMeshes.find((m) => m.userData.win.id === id)
      if (!mesh || calm) {
        done?.()
        return
      }
      const center = mesh.userData.center.clone()
      mesh.localToWorld(center)
      const normal = center.clone().sub(new THREE.Vector3(mesh.userData.center.x, 0, 0).applyMatrix4(mesh.matrixWorld)).normalize()
      enterFrom = { pos: camera.position.clone(), look: new THREE.Vector3(0, 0.05, 0) }
      enterTo = { pos: center.clone().add(normal.multiplyScalar(0.18)), look: center.clone().sub(normal) }
      enterT = 0
      state.entering = true
      enterDone = done
    },
    /** Vuelve la cámara a su lugar (después de entrar). */
    reset() {
      state.entering = false
      enterDone = null
    },
    dispose() {
      stopLoop()
      io.disconnect()
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      scene.traverse((o) => {
        o.geometry?.dispose?.()
        if (o.material) {
          for (const m of [].concat(o.material)) {
            for (const v of Object.values(m.uniforms || {})) v.value?.dispose?.()
            m.map?.dispose?.()
            m.dispose()
          }
        }
      })
      env.dispose()
      pmrem.dispose()
      renderer.dispose()
    },
  }
}
