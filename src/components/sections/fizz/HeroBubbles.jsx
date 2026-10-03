import { useRef } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal, createFrameBudget, prefersReducedMotion, trackPointer } from '../../../lib/motion'

const gltfLoaderMod = () => import('three/examples/jsm/loaders/GLTFLoader.js')
const dracoLoaderMod = () => import('three/examples/jsm/loaders/DRACOLoader.js')
const hdrLoaderMod = () => import('three/examples/jsm/loaders/HDRLoader.js')

/** Curated flavor presets — one flat stage color, its type ink and the drink tint. */
export const FIZZ_FLAVORS = {
  cobalt: { bg: '#2c4bff', ink: '#fff3e2', liquid: '#9db8ff' },
  berry: { bg: '#ff3ea5', ink: '#241352', liquid: '#ffc9e8' },
  citrus: { bg: '#ffb02e', ink: '#241352', liquid: '#fff1cc' },
  tropical: { bg: '#ff6b35', ink: '#241352', liquid: '#ffdccb' },
  mint: { bg: '#3ddc97', ink: '#241352', liquid: '#dcfff0' },
}

const FOAM = '#fff3e2'
const TURNS = 2
const LABEL_ARC = (70 * Math.PI) / 180

// Stand-in bottle (centimetres) for when no GLB is passed: same silhouette as
// public/fizz/soda-bottle.glb, without the flutes and the crimped cap.
const GLASS_PROFILE = [
  [0, 0.42],
  [1.4, 0.36],
  [2.3, 0.12],
  [2.72, 0],
  [2.95, 0.12],
  [3.05, 0.5],
  [3.05, 1.1],
  [3, 1.5],
  [3, 4.6],
  [3.07, 4.75],
  [3.07, 4.95],
  [3, 5.1],
  [3, 10.3],
  [3.07, 10.45],
  [3.07, 10.65],
  [3, 10.8],
  [2.98, 11.4],
  [2.84, 12.6],
  [2.52, 13.9],
  [2.1, 15.2],
  [1.72, 16.5],
  [1.46, 17.8],
  [1.34, 19.2],
  [1.3, 20.6],
  [1.3, 21.3],
  [1.5, 21.45],
  [1.58, 21.7],
  [1.58, 22],
  [1.46, 22.2],
  [1.4, 22.45],
  [1.48, 22.65],
  [1.5, 22.9],
  [1.42, 23.05],
  [1.2, 23.1],
  [0, 23.1],
]
const CAP_PROFILE = [
  [1.8, 22.3],
  [1.78, 22.35],
  [1.66, 22.6],
  [1.62, 22.95],
  [1.52, 23.2],
  [1.3, 23.36],
  [0.9, 23.42],
  [0, 23.42],
]
const LIQUID_BOX = { y0: 0.0103, y1: 0.17, radius: 0.0267 }

const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (t) => t * t * (3 - 2 * t)

function buildStandInBottle() {
  const points = (profile) => profile.map(([r, y]) => new THREE.Vector2(r * 0.01, y * 0.01))
  const group = new THREE.Group()
  const add = (name, geometry) => {
    const mesh = new THREE.Mesh(geometry)
    mesh.name = name
    group.add(mesh)
    return mesh
  }
  add('glass', new THREE.LatheGeometry(points(GLASS_PROFILE), 64))
  add('cap', new THREE.LatheGeometry(points(CAP_PROFILE), 48))
  const label = add(
    'label',
    new THREE.CylinderGeometry(0.0302, 0.0302, 0.048, 40, 1, true, -LABEL_ARC, LABEL_ARC * 2),
  )
  label.position.y = 0.077
  group.userData.liquid = LIQUID_BOX
  group.userData.labelFlipY = true
  return group
}

/** Soft boxes around the bottle: what the glass has to reflect. */
function buildStudioEnv(renderer, tint) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  // Casi negro: el vidrio necesita algo oscuro que reflejar para tener bordes.
  envScene.background = new THREE.Color(0x05060e)

  const softbox = (w, h, intensity, x, y, z) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(intensity, intensity, intensity),
        side: THREE.DoubleSide,
      }),
    )
    mesh.position.set(x, y, z)
    mesh.lookAt(0, 0, 0)
    envScene.add(mesh)
  }
  softbox(1.8, 11, 16, -6, 1, 3.5)
  softbox(0.55, 11, 12, -2.8, 0.5, 6.5)
  softbox(1.1, 11, 9, 6.5, 0, -2)
  softbox(0.45, 11, 8, 3.4, 0.5, 6)
  softbox(6, 2.6, 7, 0, 7, 1)
  softbox(9, 2, 1.1, 0, -5, 6)
  // El color del escenario, detrás: lo que el vidrio ve al otro lado.
  const stage = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 18),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(0.7) }),
  )
  stage.position.set(0, 0, -11)
  envScene.add(stage)

  const envMap = pmrem.fromScene(envScene, 0.02).texture
  envScene.traverse((n) => {
    n.geometry?.dispose?.()
    n.material?.dispose?.()
  })
  pmrem.dispose()
  return envMap
}

function disposeObject(root) {
  root.traverse((n) => {
    n.geometry?.dispose?.()
    const mats = Array.isArray(n.material) ? n.material : [n.material]
    mats.forEach((m) => {
      if (!m) return
      m.map?.dispose?.()
      m.dispose?.()
    })
  })
}

/** One line of the headline as an alpha mask, sized to `targetWidth` CSS px. */
function drawTitleLine(text, { family, weight, tracking, targetWidth, maxSize, dpr }) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const setFont = (px) => {
    ctx.font = `${weight} ${px}px ${family}`
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${px * tracking}px`
  }
  setFont(100)
  const size = Math.min(maxSize, (targetWidth / Math.max(ctx.measureText(text).width, 1)) * 100)
  setFont(size)
  const m = ctx.measureText(text)
  const pad = size * 0.08
  const width = m.width + pad * 2
  const height = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + pad * 2
  const scale = Math.min(dpr, 4096 / width)
  canvas.width = Math.ceil(width * scale)
  canvas.height = Math.ceil(height * scale)
  ctx.scale(scale, scale)
  setFont(size)
  ctx.fillStyle = '#fff'
  ctx.fillText(text, pad, pad + m.actualBoundingBoxAscent)

  // Where each letter sits in the line, so every one can fly in on its own.
  const advance = (n) => ctx.measureText(text.slice(0, n)).width
  const cuts = []
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === ' ') continue
    // Cut along the glyph's own ink, so a neighbour's edge never rides along.
    const glyph = ctx.measureText(text[i])
    const origin = pad + advance(i + 1) - glyph.width
    const x0 = Math.max(0, origin - glyph.actualBoundingBoxLeft - 1)
    const x1 = Math.min(width, origin + glyph.actualBoundingBoxRight + 1)
    cuts.push({ x0, x1, u0: x0 / width, u1: x1 / width })
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 8
  return { texture, width, height, cuts }
}

/**
 * Screen print straight on the glass, in white ink, like a returnable bottle:
 * a bubble emblem, `canLabel` as the wordmark and a little small print. The
 * texture is transparent; the glass shows through everywhere else.
 */
function drawPrint(brand, { family }) {
  const S = 2048
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  const cx = S / 2
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.textAlign = 'center'
  const track = (px) => {
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`
  }

  // Bubbles rising out of the wordmark.
  ;[
    [cx - 170, 700, 46],
    [cx - 30, 590, 74],
    [cx + 120, 690, 40],
    [cx + 205, 520, 30],
    [cx - 150, 470, 24],
    [cx + 40, 405, 18],
    [cx - 60, 330, 11],
  ].forEach(([x, y, r]) => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.lineWidth = Math.max(6, r * 0.16)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(x - r * 0.38, y - r * 0.38, r * 0.22, r * 0.13, -Math.PI / 4, 0, Math.PI * 2)
    ctx.fill()
  })

  const text = String(brand || '').toUpperCase()
  track(0)
  ctx.font = `800 100px ${family}`
  const size = Math.min(380, ((S * 0.56) / Math.max(ctx.measureText(text).width, 1)) * 100)
  ctx.font = `800 ${size}px ${family}`
  ctx.fillText(text, cx, 1080)

  ctx.fillRect(cx - S * 0.19, 1150, S * 0.38, 7)
  track(20)
  ctx.font = `700 58px ${family}`
  ctx.fillText('SPARKLING SODA', cx + 10, 1265)
  track(14)
  ctx.font = `500 44px ${family}`
  ctx.fillText('EST. 2026  ·  1 L  ·  RETURNABLE', cx + 7, 1345)

  // A short column of small print on the right, a number on the left.
  track(2)
  ctx.textAlign = 'left'
  ctx.font = `600 40px ${family}`
  ;['BUBBLES', 'FIRST,', 'QUESTIONS', 'LATER.', '', 'SERVE', 'ICE COLD.'].forEach((line, i) => {
    ctx.fillText(line, S * 0.79, 760 + i * 52)
  })
  ctx.save()
  ctx.translate(S * 0.2, 1000)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  track(16)
  ctx.font = `700 48px ${family}`
  ctx.fillText('N° 01  —  FIZZ CO.', 0, 0)
  ctx.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 16
  return texture
}

/**
 * Wear for the glass: smudges, a couple of fingerprints and fine scratches.
 * Barely there head-on, they light up when the bottle turns into the light.
 * Returns a roughness map and the normal map derived from the same marks.
 */
function drawGlassWear() {
  const S = 1024
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, S, S)

  for (let i = 0; i < 30; i += 1) {
    const x = Math.random() * S
    const y = Math.random() * S
    const r = 30 + Math.random() * 120
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,255,255,${0.08 + Math.random() * 0.16})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * (0.5 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let f = 0; f < 4; f += 1) {
    const x = Math.random() * S
    const y = Math.random() * S
    for (let k = 0; k < 14; k += 1) {
      ctx.strokeStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.1})`
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.ellipse(x, y, 6 + k * 3.2, 4 + k * 2.4, 0.5, 0.2, Math.PI * 1.7)
      ctx.stroke()
    }
  }
  for (let i = 0; i < 170; i += 1) {
    const x = Math.random() * S
    const y = Math.random() * S
    const len = 8 + Math.random() * 110
    const a = (Math.random() - 0.5) * 0.7
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.55})`
    ctx.lineWidth = 0.5 + Math.random() * 1.1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
    ctx.stroke()
  }

  const height = ctx.getImageData(0, 0, S, S).data
  const rough = ctx.createImageData(S, S)
  const normal = ctx.createImageData(S, S)
  const h = (x, y) => height[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const i = (y * S + x) * 4
      const v = h(x, y)
      // Roughness lives in G: clean glass 0.04, smudges and scratches up to ~0.55.
      const r = Math.round((0.04 + v * 0.5) * 255)
      rough.data[i] = r
      rough.data[i + 1] = r
      rough.data[i + 2] = r
      rough.data[i + 3] = 255
      const dx = (h(x + 1, y) - h(x - 1, y)) * 2.4
      const dy = (h(x, y + 1) - h(x, y - 1)) * 2.4
      const len = Math.hypot(dx, dy, 1)
      normal.data[i] = Math.round((-dx / len) * 127.5 + 127.5)
      normal.data[i + 1] = Math.round((dy / len) * 127.5 + 127.5)
      normal.data[i + 2] = Math.round((1 / len) * 127.5 + 127.5)
      normal.data[i + 3] = 255
    }
  }
  const toTexture = (data) => {
    const c = document.createElement('canvas')
    c.width = S
    c.height = S
    c.getContext('2d').putImageData(data, 0, 0)
    const texture = new THREE.CanvasTexture(c)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 8
    return texture
  }
  return { roughness: toTexture(rough), normal: toTexture(normal) }
}

const TITLE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Opaque on purpose: the glass only refracts what the opaque pass drew, so the
// headline lives in the canvas instead of the DOM. Each letter is its own quad
// reading its slice of the line (`uUv0`..`uUv1`); `uIn` fades it up as it lands.
const TITLE_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 uInk;
  uniform vec3 uPaper;
  uniform float uUv0;
  uniform float uUv1;
  uniform float uIn;
  uniform float uFade;
  varying vec2 vUv;
  void main() {
    vec2 uv = vec2(mix(uUv0, uUv1, vUv.x), vUv.y);
    float a = texture2D(map, uv).a * uFade * uIn;
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(uPaper, uInk, a), 1.0);
    #include <colorspace_fragment>
  }
`

const BUBBLE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

// Soap film: clear in the middle, bright on the rim, a window highlight up-left
// and its bounce down-right, with a thin iridescent drift.
const BUBBLE_FRAGMENT = /* glsl */ `
  uniform vec3 uTint;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    float facing = max(dot(n, v), 0.0);
    float rim = pow(1.0 - facing, 2.4);
    vec3 film = 0.5 + 0.5 * cos(6.2831 * (rim * 1.3 + vec3(0.0, 0.33, 0.67)));
    float key = smoothstep(0.93, 0.985, dot(n, normalize(vec3(-0.5, 0.62, 0.6)))) * 0.85;
    float bounce = smoothstep(0.95, 0.99, dot(n, normalize(vec3(0.46, -0.58, 0.67)))) * 0.45;
    vec3 color = mix(uTint, film, rim * 0.28) + key + bounce;
    float alpha = clamp(rim * 0.9 + key * 0.95 + bounce + 0.035, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

/**
 * HeroBubbles — a glass bottle, the headline and the fizz in one Three.js
 * canvas. The headline is drawn inside the canvas so the glass refracts it;
 * scroll spins the bottle across the stage while it keeps floating on its own.
 *
 * `modelUrl` swaps in a GLB (meshes named glass / liquid / cap / label get the
 * glass, the flavor tint, the inner bubbles and the label). Without it, a
 * lathe-built bottle stands in. `canImage` replaces the drawn label.
 */
export default function HeroBubbles({
  title = 'YOUR BIG TITLE',
  tagline = 'Placeholder tagline — every text, the flavor and the 3D bottle are replaceable.',
  meta = 'Placeholder meta — ©2026',
  hint = 'Scroll',
  statement = 'Placeholder statement — two or three short lines about the drink, set big.',
  cta = 'Placeholder CTA',
  ctaHref = '#',
  flavor = 'cobalt',
  canLabel = 'BRAND*',
  canImage = '',
  modelUrl = '',
  envUrl = '',
  dracoPath = '/fizz/draco/',
}) {
  const root = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const titleRef = useRef(null)
  const resolvedFlavor = flavor in FIZZ_FLAVORS ? flavor : 'cobalt'
  const flavorCfg = FIZZ_FLAVORS[resolvedFlavor]

  useGSAP(
    () => {
      const reduced = prefersReducedMotion()
      const stage = stageRef.current
      let W = stage.clientWidth
      let H = stage.clientHeight
      let narrow = W < 768
      let disposed = false

      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })
      // En un teléfono (DPR 3) 1.5 se ve igual de nítido y cuesta la mitad de GPU.
      // En escritorio se dibuja un poco por encima de la pantalla: las líneas finas
      // del vidrio y la serigrafía quedan nítidas.
      const dpr = Math.min(window.devicePixelRatio * (narrow ? 1 : 1.25), narrow ? 1.5 : 2)
      renderer.setPixelRatio(dpr)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      // Sin tone mapping: el fondo visto a través del vidrio tiene que ser el
      // mismo color que el fondo de al lado.
      renderer.toneMapping = THREE.NoToneMapping

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(flavorCfg.bg)
      const envMap = buildStudioEnv(renderer, flavorCfg.bg)
      scene.environment = envMap
      // Un HDRI de estudio real (si se pasa `envUrl`) reemplaza al estudio armado
      // a mano: reflejos de cajas de luz de verdad en el vidrio y el metal.
      let hdrEnv = null
      if (envUrl) {
        hdrLoaderMod()
          .then(({ HDRLoader }) => {
            new HDRLoader().load(envUrl, (texture) => {
              if (disposed) return texture.dispose()
              const pmrem = new THREE.PMREMGenerator(renderer)
              hdrEnv = pmrem.fromEquirectangular(texture).texture
              pmrem.dispose()
              texture.dispose()
              scene.environment = hdrEnv
              scene.environmentRotation.set(0, Math.PI * 0.55, 0)
              renderOnce()
            })
          })
          .catch(() => {})
      }
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
      keyLight.position.set(-3, 4, 6)
      scene.add(keyLight)

      // 1 unidad = 1 px CSS en el plano z = 0: se maqueta como en el DOM.
      const camera = new THREE.PerspectiveCamera(30, 1, 10, 10000)
      scene.add(camera)

      /* ── Headline, dentro del canvas ───────────────────────────── */
      const titleGroup = new THREE.Group()
      camera.add(titleGroup)
      const family = getComputedStyle(titleRef.current).fontFamily
      const words = String(title).trim().toUpperCase().split(/\s+/).filter(Boolean)
      const lines =
        words.length > 1
          ? [
              {
                text: words.slice(0, -1).join(' '),
                weight: 300,
                tracking: 0.04,
                width: 0.44,
                widthNarrow: 0.6,
                max: 0.19,
              },
              {
                text: words.at(-1),
                weight: 800,
                tracking: -0.03,
                width: 0.86,
                widthNarrow: 0.9,
                max: 0.36,
              },
            ]
          : [
              {
                text: words[0] || '',
                weight: 800,
                tracking: -0.03,
                width: 0.86,
                widthNarrow: 0.9,
                max: 0.36,
              },
            ]
      const planeGeo = new THREE.PlaneGeometry(1, 1)
      const lineTextures = []
      let letters = []
      // The state outlives every re-layout (fonts arriving, resizes): t goes 0 → 1
      // as the letter flies in from its scattered start.
      const letterStates = []
      const letterState = (i) =>
        (letterStates[i] ||= {
          t: reduced ? 1 : 0,
          ox: (Math.random() - 0.5) * W * 0.6,
          oy: -(0.12 + Math.random() * 0.4) * H,
          rot: (Math.random() - 0.5) * 1.8,
          s0: 0.35 + Math.random() * 1.1,
        })

      const applyLetters = () => {
        letters.forEach(({ mesh, state, x, y, w, h }) => {
          const k = 1 - state.t
          const sc = lerp(state.s0, 1, state.t)
          mesh.position.set(x + k * state.ox, y + k * state.oy, 0)
          mesh.rotation.z = k * state.rot
          mesh.scale.set(w * sc, h * sc, 1)
          mesh.material.uniforms.uIn.value = clamp01(state.t * 2)
        })
      }

      const clearTitle = () => {
        letters.forEach(({ mesh }) => {
          titleGroup.remove(mesh)
          mesh.material.dispose()
        })
        lineTextures.forEach((texture) => texture.dispose())
        letters = []
        lineTextures.length = 0
      }

      const layoutTitle = () => {
        clearTitle()
        const gap = H * 0.035
        const drawnLines = lines.map((line) =>
          drawTitleLine(line.text, {
            family,
            weight: line.weight,
            tracking: line.tracking,
            targetWidth: W * (narrow ? line.widthNarrow : line.width),
            maxSize: H * line.max,
            dpr,
          }),
        )
        const total = drawnLines.reduce((sum, d, i) => sum + d.height + (i ? gap : 0), 0)
        let top = total / 2 + H * 0.02
        let n = 0
        drawnLines.forEach((drawn) => {
          lineTextures.push(drawn.texture)
          const y = top - drawn.height / 2
          drawn.cuts.forEach((cut) => {
            const mesh = new THREE.Mesh(
              planeGeo,
              new THREE.ShaderMaterial({
                uniforms: {
                  map: { value: drawn.texture },
                  uInk: { value: new THREE.Color(flavorCfg.ink) },
                  uPaper: { value: new THREE.Color(flavorCfg.bg) },
                  uUv0: { value: cut.u0 },
                  uUv1: { value: cut.u1 },
                  uIn: { value: 0 },
                  uFade: { value: 1 },
                },
                vertexShader: TITLE_VERTEX,
                fragmentShader: TITLE_FRAGMENT,
              }),
            )
            titleGroup.add(mesh)
            letters.push({
              mesh,
              state: letterState(n),
              x: (cut.x0 + cut.x1) / 2 - drawn.width / 2,
              y,
              w: cut.x1 - cut.x0,
              h: drawn.height,
            })
            n += 1
          })
          top -= drawn.height + gap
        })
        applyLetters()
      }

      /* ── Sombra sobre el fondo ─────────────────────────────────── */
      // Un plano opaco al fondo con la sombra suave de la botella: opaco, para
      // que el vidrio también la refracte.
      const shadowMat = new THREE.ShaderMaterial({
        uniforms: {
          uBg: { value: new THREE.Color(flavorCfg.bg) },
          uDark: { value: new THREE.Color(flavorCfg.bg).multiplyScalar(0.28) },
          uRes: { value: new THREE.Vector2(W, H) },
          uCenter: { value: new THREE.Vector2() },
          uAxes: { value: new THREE.Vector2(1, 1) },
          uAngle: { value: 0 },
          uStrength: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy * 2.0, 0.9999, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uBg;
          uniform vec3 uDark;
          uniform vec2 uRes;
          uniform vec2 uCenter;
          uniform vec2 uAxes;
          uniform float uAngle;
          uniform float uStrength;
          varying vec2 vUv;
          void main() {
            vec2 p = (vUv - 0.5) * uRes - uCenter;
            float c = cos(uAngle);
            float s = sin(uAngle);
            vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y) / uAxes;
            float a = exp(-dot(q, q) * 2.2) * uStrength;
            gl_FragColor = vec4(mix(uBg, uDark, a), 1.0);
            #include <colorspace_fragment>
          }
        `,
        depthWrite: false,
      })
      const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat)
      shadowMesh.frustumCulled = false
      shadowMesh.renderOrder = -10
      scene.add(shadowMesh)

      /* ── Botella ───────────────────────────────────────────────── */
      const rig = new THREE.Group()
      const spin = new THREE.Group()
      rig.add(spin)
      rig.visible = false
      scene.add(rig)

      const liquidUniforms = {
        uFizzFill: { value: 1e6 },
        uFizzEdge: { value: 0.001 },
        uFizzTint: { value: new THREE.Color(flavorCfg.liquid) },
        // La capa lechosa: el color del escenario aclarado.
        uFizzVeil: { value: new THREE.Color(flavorCfg.bg).lerp(new THREE.Color(0xffffff), 0.6) },
      }
      const wear = drawGlassWear()
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xf4fffa,
        transmission: 1,
        // La aspereza la pone el mapa: vidrio limpio y nítido, salvo huellas y rayones.
        roughness: 1,
        roughnessMap: wear.roughness,
        normalMap: wear.normal,
        normalScale: new THREE.Vector2(0.1, 0.1),
        ior: 1.5,
        thickness: 0.016,
        dispersion: narrow ? 0 : 2.5,
        envMapIntensity: 1.25,
        specularIntensity: 1,
      })
      // El vidrio y el líquido no pueden ser dos mallas con transmisión (una
      // tapa a la otra): el líquido es un tinte del mismo vidrio por debajo de
      // la línea de llenado.
      glassMat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, liquidUniforms)
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying float vFizzY;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFizzY = position.y;')
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            '#include <common>\nvarying float vFizzY;\nuniform float uFizzFill;\nuniform float uFizzEdge;\nuniform vec3 uFizzTint;\nuniform vec3 uFizzVeil;',
          )
          .replace(
            '#include <transmission_fragment>',
            `#include <transmission_fragment>
            float fizzLiquid = 1.0 - smoothstep(uFizzFill - uFizzEdge, uFizzFill + uFizzEdge, vFizzY);
            float fizzLine = 1.0 - smoothstep(0.0, uFizzEdge * 4.0, abs(vFizzY - uFizzFill));
            totalDiffuse = mix(totalDiffuse, totalDiffuse * mix(vec3(1.0), uFizzTint, 0.35), fizzLiquid) + fizzLine * 0.22;
            totalDiffuse = mix(totalDiffuse, uFizzVeil, 0.05 + fizzLiquid * 0.12);`,
          )
      }
      const capMat = new THREE.MeshStandardMaterial({
        color: FOAM,
        metalness: 0.85,
        roughness: 0.3,
        envMapIntensity: 1.2,
      })
      const stopperMat = new THREE.MeshPhysicalMaterial({
        color: 0xece6d8,
        roughness: 0.3,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
        envMapIntensity: 0.85,
      })
      const sealMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(flavorCfg.bg).multiplyScalar(0.5),
        roughness: 0.5,
      })
      const wireMat = new THREE.MeshStandardMaterial({
        color: 0xdcdde2,
        metalness: 1,
        roughness: 0.26,
        envMapIntensity: 1.4,
      })
      // Serigrafía: tinta blanca sobre el vidrio. Va en la pasada transparente,
      // después del vidrio: si estuviera en la opaca, el vidrio la volvería a
      // refractar entre los trazos y se vería doble.
      const labelMat = new THREE.MeshStandardMaterial({
        color: 0xf6f3ea,
        roughness: 0.38,
        envMapIntensity: 0.6,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      })

      let model = null
      let labelFlipY = false
      let fizz = null

      const paintLabel = () => {
        if (!model || canImage) return
        labelMat.map?.dispose()
        labelMat.map = drawPrint(canLabel, { family })
        labelMat.map.flipY = labelFlipY
        labelMat.needsUpdate = true
      }

      /** Hilos de burbujas que suben por dentro del líquido. */
      const buildFizz = (host, box) => {
        const count = narrow ? 50 : 90
        const mesh = new THREE.InstancedMesh(
          new THREE.SphereGeometry(1, 8, 6),
          new THREE.MeshBasicMaterial({ color: FOAM, toneMapped: false, transparent: true, opacity: 0.85 }),
          count,
        )
        const streams = Array.from({ length: 11 }, () => ({
          angle: Math.random() * Math.PI * 2,
          radius: 0.2 + Math.random() * 0.62,
        }))
        const items = Array.from({ length: count }, (_, i) => ({
          stream: streams[i % streams.length],
          t: Math.random(),
          speed: 0.2 + Math.random() * 0.22,
          size: (0.012 + Math.random() * 0.02) * box.radius,
          jitter: Math.random() * Math.PI * 2,
        }))
        const dummy = new THREE.Object3D()
        const span = box.y1 - box.y0
        const update = (time, dt) => {
          items.forEach((b, i) => {
            b.t += b.speed * dt
            if (b.t > 1) b.t -= 1
            // El hombro angosta la botella: las burbujas se cierran al subir.
            const reach = b.t < 0.78 ? 1 : lerp(1, 0.5, (b.t - 0.78) / 0.22)
            const r = b.stream.radius * box.radius * reach
            const a = b.stream.angle + Math.sin(time * 1.7 + b.jitter) * 0.12
            dummy.position.set(Math.cos(a) * r, box.y0 + span * b.t, Math.sin(a) * r)
            dummy.scale.setScalar(b.size * (0.55 + b.t * 0.6) * Math.min(1, (1 - b.t) * 12))
            dummy.updateMatrix()
            mesh.setMatrixAt(i, dummy.matrix)
          })
          mesh.instanceMatrix.needsUpdate = true
        }
        update(0, 0)
        host.add(mesh)
        return { mesh, update }
      }

      const mountModel = (object) => {
        model = object
        const glass = model.getObjectByName('glass')
        if (glass) {
          const liquid = model.getObjectByName('liquid')
          let box = model.userData.liquid
          if (liquid) {
            liquid.visible = false
            liquid.geometry.computeBoundingBox()
            const b = liquid.geometry.boundingBox
            box = { y0: b.min.y, y1: b.max.y, radius: b.max.x }
          }
          glass.material = glassMat
          if (box) {
            liquidUniforms.uFizzFill.value = box.y1
            liquidUniforms.uFizzEdge.value = (box.y1 - box.y0) * 0.006
            fizz = buildFizz(glass.parent, box)
          }
          const parts = {
            cap: capMat,
            stopper: stopperMat,
            seal: sealMat,
            wire: wireMat,
          }
          Object.entries(parts).forEach(([name, mat]) => {
            const part = model.getObjectByName(name)
            if (part) part.material = mat
          })
          const label = model.getObjectByName('label')
          if (label) {
            label.material = labelMat
            labelFlipY = Boolean(model.userData.labelFlipY)
            if (canImage) {
              new THREE.TextureLoader().load(canImage, (texture) => {
                if (disposed) return texture.dispose()
                texture.colorSpace = THREE.SRGBColorSpace
                texture.flipY = labelFlipY
                labelMat.map = texture
                labelMat.needsUpdate = true
                renderOnce()
              })
            } else paintLabel()
          }
        }
        // Altura 1, centrada: el rig la escala a píxeles.
        const bounds = new THREE.Box3().setFromObject(model)
        const size = bounds.getSize(new THREE.Vector3())
        const center = bounds.getCenter(new THREE.Vector3())
        const fit = 1 / (size.y || 1)
        model.scale.setScalar(fit)
        model.position.copy(center).multiplyScalar(-fit)
        // `thickness` se mide en unidades del modelo: la refracción escala con él.
        glassMat.thickness = 0.034 / fit
        spin.add(model)
        rig.visible = true
        startBottle()
        renderOnce()
      }

      /* ── Burbujas del escenario ────────────────────────────────── */
      const bubbleCount = narrow ? 14 : 30
      const bubbleMesh = new THREE.InstancedMesh(
        new THREE.SphereGeometry(1, 32, 20),
        new THREE.ShaderMaterial({
          uniforms: { uTint: { value: new THREE.Color(FOAM) } },
          vertexShader: BUBBLE_VERTEX,
          fragmentShader: BUBBLE_FRAGMENT,
          transparent: true,
          depthWrite: false,
        }),
        bubbleCount,
      )
      bubbleMesh.frustumCulled = false
      scene.add(bubbleMesh)
      const bubbleDummy = new THREE.Object3D()
      const spawnBubble = (b, scatter) => {
        // Los costados cargan más burbujas: el centro queda para el titular.
        const lane = Math.random()
        const side =
          lane < 0.42
            ? Math.random() * 0.26
            : lane < 0.84
              ? 0.74 + Math.random() * 0.26
              : 0.26 + Math.random() * 0.48
        const big = Math.random() < 0.22
        b.r = (big ? 22 + Math.random() * 30 : 4 + Math.random() * 10) * (narrow ? 0.7 : 1)
        b.x = (side - 0.5) * W * 1.08
        b.z = -100 + Math.random() * 320
        b.speed = (0.1 + (b.r / 52) * 0.2) * (0.8 + Math.random() * 0.4)
        b.phase = Math.random() * Math.PI * 2
        b.sway = 6 + Math.random() * 16
        b.y = scatter
          ? (Math.random() - 0.5) * H * 1.1
          : -H * 0.5 - b.r * 2 - Math.random() * H * 0.25
        b.born = b.y
        return b
      }
      const bubbles = Array.from({ length: bubbleCount }, () => {
        const b = spawnBubble({}, true)
        b.delay = Math.random() * 0.5
        return b
      })
      // The first thing on screen: the bubbles, popping in one by one.
      const intro = { bubbles: reduced ? 1 : 0 }
      const placeBubbles = (time, dt, boost) => {
        bubbles.forEach((b, i) => {
          b.y += b.speed * H * dt * boost
          if (b.y > H * 0.5 + b.r * 3) spawnBubble(b, false)
          const grow =
            clamp01((b.y - b.born) / (H * 0.12) + (b.born > -H * 0.5 ? 1 : 0)) *
            smooth(clamp01((intro.bubbles - (b.delay || 0)) / 0.5))
          const wobble = Math.sin(time * 3.1 + b.phase) * 0.05
          bubbleDummy.position.set(b.x + Math.sin(time * 0.9 + b.phase) * b.sway, b.y, b.z)
          bubbleDummy.scale.set(b.r * grow * (1 + wobble), b.r * grow * (1 - wobble), b.r * grow)
          bubbleDummy.updateMatrix()
          bubbleMesh.setMatrixAt(i, bubbleDummy.matrix)
        })
        bubbleMesh.instanceMatrix.needsUpdate = true
      }

      /* ── Medidas ───────────────────────────────────────────────── */
      let cameraZ = 1
      const layout = () => {
        W = stage.clientWidth
        H = stage.clientHeight
        narrow = W < 768
        renderer.setSize(W, H, false)
        shadowMat.uniforms.uRes.value.set(W, H)
        cameraZ = H / (2 * Math.tan((Math.PI / 180) * 15))
        camera.aspect = W / Math.max(H, 1)
        camera.near = cameraZ / 10
        camera.far = cameraZ * 10
        camera.position.z = cameraZ
        camera.updateProjectionMatrix()
        titleGroup.position.z = -cameraZ
        layoutTitle()
      }

      const state = { p: 0, enter: reduced ? 0 : 1 }
      // El mouse en PC, el dedo en el teléfono (un dedo que scrollea cancela
      // pointermove). En calma la botella queda quieta: no escucha nada.
      const pointer = reduced ? { x: 0, y: 0 } : trackPointer()
      // Lo que la botella usa de ese puntero, suavizado: un dedo aparece de golpe
      // (touchstart) y se va de golpe (touchend), y sin esto la botella daba un salto.
      const look = { x: 0, y: 0 }
      let lastTop = 0
      let boost = 1

      const pose = (time) => {
        const { p, enter } = state
        const s = smooth(p)
        const out = 1 - (1 - p) * (1 - p)
        const bob = reduced ? 0 : Math.sin(time * 1.05) * H * 0.016
        const sway = reduced ? 0 : Math.sin(time * 0.29) * 0.42
        const size = narrow ? Math.min(H * 0.5, W * 1.35) : Math.min(H * 0.86, W * 0.62)
        rig.position.x = W * (narrow ? lerp(0, 0.22, s) : lerp(-0.06, 0.29, s))
        rig.position.y =
          H * (narrow ? lerp(-0.04, -0.2, s) : lerp(-0.03, -0.05, s)) + bob - enter * H * 1.05
        rig.rotation.z = narrow ? lerp(0.3, -0.34, s) : lerp(0.4, -0.2, s)
        rig.rotation.x = Math.sin(Math.PI * p) * 0.3 + look.y * 0.06
        spin.rotation.y = -TURNS * Math.PI * 2 * out + sway + look.x * 0.25 - enter * 2.4
        rig.scale.setScalar(size * lerp(1, 1.12, s))
        // Luz de arriba a la izquierda: la sombra cae abajo a la derecha.
        const u = shadowMat.uniforms
        const scale = rig.scale.x
        u.uCenter.value.set(rig.position.x + scale * 0.1, rig.position.y - scale * 0.05)
        u.uAxes.value.set(scale * 0.2, scale * 0.58)
        u.uAngle.value = rig.rotation.z
        u.uStrength.value = 0.55 * (1 - enter)
      }

      const render = () => renderer.render(scene, camera)
      const renderOnce = () => {
        if (!reduced || disposed) return
        pose(0)
        render()
      }

      // Fuera de pantalla no se dibuja: en un teléfono la GPU seguía renderizando
      // el 3D mientras se leía el resto de la página.
      let onScreen = true
      const io = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting
      })
      io.observe(root.current)

      // Si el teléfono no llega a ~30 cuadros (vidrio con transmisión, DPR alto),
      // baja la resolución de a escalones. En un equipo rápido no cambia nada.
      const budget = createFrameBudget({
        dpr,
        apply: (value) => {
          renderer.setPixelRatio(value)
          layout()
        },
      })

      const tick = (time, deltaMs) => {
        if (!onScreen) return
        const dt = Math.min(deltaMs / 1000, 0.05)
        // El titular sube con la página, 1:1, como si fuera DOM.
        const rect = root.current.getBoundingClientRect()
        titleGroup.position.y = Math.min(Math.max(-rect.top, 0), rect.height - H)
        // Al irse hacia arriba el titular se apaga, sin cortarse de golpe.
        const fade = 1 - smooth(clamp01((-rect.top - H * 0.05) / (H * 0.55)))
        letters.forEach(({ mesh }) => {
          mesh.material.uniforms.uFade.value = fade
        })
        applyLetters()
        // Scrollear agita el gas.
        const speed = Math.abs(rect.top - lastTop)
        lastTop = rect.top
        boost += (1 + Math.min(speed * 0.06, 2.5) - boost) * 0.12

        camera.position.x += (pointer.x * W * 0.04 - camera.position.x) * 0.03
        camera.position.y += (-pointer.y * H * 0.04 - camera.position.y) * 0.03
        const follow = 1 - Math.exp(-dt * 12)
        look.x += (pointer.x - look.x) * follow
        look.y += (pointer.y - look.y) * follow
        pose(time)
        placeBubbles(time, dt, boost)
        fizz?.update(time, dt * boost)
        render()
        budget.tick(deltaMs)
      }

      let introDone = reduced
      function startBottle() {
        if (reduced || !introDone || !model) return
        gsap.to(state, { enter: 0, duration: 2, ease: 'power3.out' })
      }

      layout()
      placeBubbles(0, 0, 1)
      const ro = new ResizeObserver(() => {
        if (stage.clientWidth === W && stage.clientHeight === H) return
        layout()
        renderOnce()
      })
      ro.observe(stage)
      // La tipografía de la página llega después del primer dibujo.
      document.fonts?.ready.then(() => {
        if (disposed) return
        layoutTitle()
        paintLabel()
        renderOnce()
      })

      if (modelUrl) {
        Promise.all([gltfLoaderMod(), dracoLoaderMod()])
          .then(([{ GLTFLoader }, { DRACOLoader }]) => {
            const draco = new DRACOLoader().setDecoderPath(dracoPath)
            new GLTFLoader().setDRACOLoader(draco).load(
              modelUrl,
              (gltf) => {
                draco.dispose()
                if (disposed) return disposeObject(gltf.scene)
                mountModel(gltf.scene)
              },
              undefined,
              () => {
                console.warn(`HeroBubbles: could not load model "${modelUrl}"`)
                if (!disposed) mountModel(buildStandInBottle())
              },
            )
          })
          .catch(() => {})
      } else {
        mountModel(buildStandInBottle())
      }

      if (reduced) {
        gsap.set('[data-fizz-fade]', { opacity: 1 })
        calmReveal('[data-fizz-statement], [data-fizz-cta]')
        renderOnce()
      } else {
        gsap.ticker.add(tick)

        gsap.to(state, {
          p: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.6,
          },
        })

        // Entrada en orden, sin prisa: burbujas → titular letra por letra → textos
        // chicos → botella.
        const LETTERS_AT = 1.5
        gsap.to(intro, { bubbles: 1, duration: 1.8, ease: 'none' })
        letters.forEach(({ state }, i) => {
          gsap.to(state, {
            t: 1,
            duration: 1.25,
            ease: 'power3.out',
            delay: LETTERS_AT + i * 0.06,
          })
        })
        const lettersDone = LETTERS_AT + letters.length * 0.06 + 1.25
        gsap.to('[data-fizz-fade]', {
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          stagger: 0.1,
          delay: lettersDone - 0.7,
        })
        gsap.to('[data-fizz-arrow]', {
          y: 6,
          opacity: 0.35,
          duration: 0.85,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })
        gsap.delayedCall(lettersDone - 0.9, () => {
          introDone = true
          startBottle()
        })

        SplitText.create('[data-fizz-statement]', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1,
              ease: 'power4.out',
              stagger: 0.09,
              scrollTrigger: {
                trigger: '[data-fizz-statement]',
                start: 'top 78%',
              },
            }),
        })
        gsap.from('[data-fizz-cta]', {
          opacity: 0,
          y: 16,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: '[data-fizz-cta]', start: 'top 88%' },
        })
      }

      return () => {
        disposed = true
        ro.disconnect()
        io.disconnect()
        pointer.dispose?.()
        gsap.ticker.remove(tick)
        clearTitle()
        planeGeo.dispose()
        shadowMesh.geometry.dispose()
        shadowMat.dispose()
        bubbleMesh.geometry.dispose()
        bubbleMesh.material.dispose()
        if (fizz) {
          fizz.mesh.geometry.dispose()
          fizz.mesh.material.dispose()
        }
        if (model) disposeObject(model)
        ;[glassMat, capMat, stopperMat, sealMat, wireMat, labelMat].forEach((m) => {
          m.map?.dispose()
          m.dispose()
        })
        envMap.dispose()
        hdrEnv?.dispose()
        wear.roughness.dispose()
        wear.normal.dispose()
        renderer.dispose()
      }
    },
    {
      scope: root,
      dependencies: [resolvedFlavor, modelUrl, envUrl, dracoPath, canImage, canLabel, title],
      revertOnUpdate: true,
    },
  )

  return (
    <section
      ref={root}
      className="relative"
      style={{
        backgroundColor: flavorCfg.bg,
        color: flavorCfg.ink,
        '--fizz-bg': flavorCfg.bg,
        '--fizz-ink': flavorCfg.ink,
      }}
    >
      <div
        ref={stageRef}
        className="pointer-events-none sticky top-0 h-svh w-full overflow-hidden calm:absolute calm:inset-x-0"
      >
        <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
      </div>

      <div className="relative -mt-[100svh] calm:mt-0">
        <div className="pointer-events-none h-[170svh] calm:h-svh">
          <div className="flex h-svh flex-col justify-between px-5 pt-28 pb-6 md:px-10">
            <p
              data-fizz-fade
              className="max-w-[30ch] text-xs font-semibold uppercase tracking-[0.22em] opacity-0 md:text-sm"
            >
              {tagline}
            </p>

            <h1 ref={titleRef} className="sr-only font-brico">
              {title}
            </h1>

            <div className="flex items-end justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.2em] md:text-xs">
              <p data-fizz-fade className="hidden opacity-0 md:block">
                {meta}
              </p>
              <p data-fizz-fade className="ml-auto flex items-center gap-3 opacity-0 max-md:pb-2">
                {hint}
                <span aria-hidden="true" className="flex flex-col items-center gap-1">
                  <span className="h-8 w-px bg-current opacity-60 md:h-10" />
                  <span data-fizz-arrow className="block text-sm leading-none">
                    ↓
                  </span>
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-[90svh] items-start px-5 pt-8 pb-24 md:items-center md:px-10 md:pt-0">
          <div className="md:w-[58%]">
            <p
              data-fizz-statement
              className="font-brico text-[clamp(2rem,5vw,5.25rem)] leading-[0.98] font-extrabold tracking-[-0.02em] uppercase"
            >
              {statement}
            </p>
            <a
              data-fizz-cta
              href={ctaHref}
              className="tpl-hit relative mt-10 inline-flex items-center rounded-full border border-current px-7 py-4 text-xs font-semibold uppercase tracking-[0.2em] transition-[background-color,color,transform] duration-300 ease-out hover:bg-[var(--fizz-ink)] hover:text-[var(--fizz-bg)] active:scale-[0.97] md:mt-14"
            >
              {cta}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
