import * as THREE from 'three'
import { createFrameBudget } from '../../lib/motion'

/**
 * cāpsula33 — el pasillo de la nave, caminable.
 *
 * Una sola imagen generada (el pasillo con la entrada del café al fondo) se
 * PROYECTA desde la cámara que la «sacó» sobre un túnel simple: piso, techo,
 * paredes y la pared del fondo. Quieta, la cámara ve la imagen exacta; al
 * avanzar, las paredes pasan de costado con su perspectiva real. Encima, en la
 * pared del fondo, la entrada en alta resolución (con el hueco de la puerta),
 * las dos hojas y, detrás, el interior del café: se ve por la puerta con su
 * propia profundidad y al cruzarla llena la pantalla.
 *
 * Coordenadas: la cámara original está en el origen mirando a −Z; un píxel
 * (px, py) de la imagen a la profundidad z cae en x = (px − 1344)·z/F.
 */

const IMG = { w: 2688, h: 1520 } // la toma original: toda la geometría se mide acá
const FOV = 60
const F = IMG.h / 2 / Math.tan(((FOV / 2) * Math.PI) / 180)
// La textura es esa toma extendida arriba y abajo (cuadrada) para que en vertical también
// se vea el pasillo: la original queda en el centro, desde y = TEX.top.
const TEX = { w: 2688, h: 2688, top: 584 }
const TEX_FOV = (2 * Math.atan(TEX.h / 2 / F) * 180) / Math.PI
const MAX_TAN = (TEX.w / 2 / F) * 0.97 // más allá, la cámara vería fuera de la textura
const D = 10 // la pared del fondo
const at = (px, py, z = D) => ({ x: ((px - IMG.w / 2) * z) / F, y: ((IMG.h / 2 - py) * z) / F })

// El túnel, medido en la imagen: borde interior de la última costilla, piso y dintel.
const TUN = { a: (568 * D) / F, b: ((985 - IMG.h / 2) * D) / F, c: ((IMG.h / 2 - 433) * D) / F }

// La entrada en alta: el recorte de su imagen y dónde cae dentro del pasillo.
const MOD_SRC = { x: 138, y: 196, w: 2418, h: 1105 }
const MOD_DST = { x: 800, y: 501, w: 1086, h: 484 }
const toCorridor = (mx, my) => ({
  px: MOD_DST.x + ((mx - MOD_SRC.x) * MOD_DST.w) / MOD_SRC.w,
  py: MOD_DST.y + ((my - MOD_SRC.y) * MOD_DST.h) / MOD_SRC.h,
})
// En la imagen de la entrada (2688 × 1520).
export const PARTS = {
  door: { x0: 1018, y0: 422, x1: 1592, y1: 1223, split: 1303 },
  sign: { x0: 355, y0: 320, x1: 965, y1: 445 },
  port: { x0: 363, y0: 625, x1: 713, y1: 975 },
}
const rectAt = ({ x0, y0, x1, y1 }, z = D) => {
  const a = toCorridor(x0, y0)
  const b = toCorridor(x1, y1)
  const p = at(a.px, a.py, z)
  const q = at(b.px, b.py, z)
  return { x0: p.x, y0: q.y, x1: q.x, y1: p.y } // y0 abajo, y1 arriba
}

const Z_MODULE = -D + 0.02
const Z_LEAVES = -D + 0.01
// Lejos de la puerta (el salón es largo): así, al cruzarla, lo que ve la cámara ya es casi el
// interior entero y la imagen en DOM apenas se acomoda (de cerca había que hacer mucho zoom).
const Z_START = -1.8 // arranca cerca: la entrada manda, poco pasillo (pedido del dueño)
const Z_WALKED = -(D - 3.4) // frente a la entrada
const Z_SIGN = Z_MODULE + 0.32 // el cartel flota delante de la pared
const Z_INSIDE_CAM = -(D + 0.2) // ya cruzamos la puerta
const ENTER_STOP = 1

// El salón, del otro lado de la puerta: la foto se proyecta desde su cámara (la final del
// recorrido) sobre una caja con su piso, sus paredes, el techo y el fondo, medidos en la foto.
// Así el piso es piso de verdad y las mesas se apoyan en él desde cualquier punto de vista.
const ROOM = {
  eye: 1.71, // altura de la cámara sobre el piso (la misma que en el pasillo)
  horizon: 760, // fila del horizonte en la foto (2688 × 1520, 60° vertical)
  back: { left: 894, right: 1371, floor: 1001, top: 632 }, // el fondo (la barra), en píxeles
  near: { left: 402, right: 2265 }, // donde las paredes tocan el piso en el borde de abajo
}
// Las mesas: un juego (mesa y dos sillas) parado sobre el piso del salón, en varios lugares.
// [x respecto de la pared (+ desde la izquierda, − desde la derecha), profundidad, espejado]
const TABLES = [
  [1.15, 3.9, false],
  [-1.05, 4.7, true],
  [1.2, 6.2, true],
  [-1.1, 7.4, false],
]
// La foto se proyecta desde un poco antes de la puerta (no desde la cámara final): así su cono
// cubre también el piso y el techo que se ven al acercarse; al final del recorrido se ve un
// poco recortada, nada más.
const PHOTO_BACK = 1.6
const TABLE_W = 1.7 // ancho del juego (mesa + dos sillas)
const TABLE_ASPECT = 1160 / 1840 // alto / ancho del recorte
const TABLE_FLOOR = 0.94 // fila del recorte donde apoyan las patas (desde arriba)

const PROJECT_VERT = /* glsl */ `
  uniform mat4 uProj0;
  varying vec4 vClip;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vClip = uProj0 * world;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`
const PROJECT_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec4 uHole;
  uniform float uDim;
  uniform float uShade;
  varying vec4 vClip;
  void main() {
    if (vClip.w <= 0.0) discard;
    vec2 uv = vClip.xy / vClip.w * 0.5 + 0.5;
    if (uv.x > uHole.x && uv.x < uHole.z && uv.y > uHole.y && uv.y < uHole.w) discard;
    vec3 c = texture2D(uMap, clamp(uv, vec2(0.001), vec2(0.999))).rgb;
    // Más de noche que la imagen: el techo baja, los costados se apagan un poco.
    float top = smoothstep(0.5, 1.0, uv.y);
    float side = smoothstep(0.25, 0.5, abs(uv.x - 0.5));
    c *= mix(1.0, mix(1.0, 0.58, top) * mix(1.0, 0.82, side), uShade) * uDim;
    // El salón: lo que la foto no cubre (cerca de la puerta, visto desde afuera) se apaga en
    // vez de estirar el borde de la imagen.
    vec2 out2 = max(vec2(0.0), max(-uv, uv - 1.0));
    c *= mix(1.0, 1.0 - smoothstep(0.0, 0.12, max(out2.x, out2.y)), 1.0 - uShade);
    gl_FragColor = vec4(c, 1.0);
  }
`
const FLAT_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const FLAT_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec4 uCrop;
  uniform float uGlow;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uMap, mix(uCrop.xy, uCrop.zw, vUv));
    c.rgb += uGlow * vec3(1.0, 0.55, 0.2) * c.a;
    gl_FragColor = vec4(c.rgb, c.a * uOpacity);
  }
`

function flat(map, { crop = [0, 0, 1, 1], transparent = false } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map }, uCrop: { value: new THREE.Vector4(...crop) }, uGlow: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: FLAT_VERT,
    fragmentShader: FLAT_FRAG,
    transparent,
    depthWrite: !transparent,
  })
}

function plane(rect, z, material) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rect.x1 - rect.x0, rect.y1 - rect.y0), material)
  mesh.position.set((rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2, z)
  return mesh
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ srcs: Record<string,string>, onProgress?: (p:number)=>void, onReady?: ()=>void, onFrame?: (camera: THREE.Camera)=>void }} opts
 */
export function createCorridorScene(canvas, { srcs, onProgress = () => {}, onReady = () => {}, onFrame = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x05060a, 1)
  const maxDpr = Math.min(window.devicePixelRatio || 1, 2)
  const budget = createFrameBudget({ dpr: maxDpr, apply: (d) => renderer.setPixelRatio(d) })
  renderer.setPixelRatio(maxDpr)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 60)

  // La cámara que «sacó» la imagen: la matriz con la que se proyecta sobre el túnel.
  const cam0 = new THREE.PerspectiveCamera(TEX_FOV, TEX.w / TEX.h, 0.01, 100)
  cam0.updateMatrixWorld()
  const proj0 = new THREE.Matrix4().multiplyMatrices(cam0.projectionMatrix, cam0.matrixWorldInverse)

  const loader = new THREE.TextureLoader()
  const names = Object.keys(srcs)
  const tex = {}
  let loaded = 0
  const ready = Promise.all(
    names.map(
      (n) =>
        new Promise((res) => {
          loader.load(
            srcs[n],
            (t) => {
              t.colorSpace = THREE.NoColorSpace
              t.anisotropy = renderer.capabilities.getMaxAnisotropy()
              tex[n] = t
              loaded += 1
              onProgress(loaded / names.length)
              res()
            },
            undefined,
            () => {
              loaded += 1
              onProgress(loaded / names.length)
              res()
            },
          )
        }),
    ),
  )

  const state = { walk: 0, enter: 0, open: 0, peek: 0, glow: 0, px: 0, py: 0, yaw: 0, portrait: false, flickerAt: -1e9, flickerAmp: 1, signOn: 0, landedAt: 0 }
  const parts = {}
  let built = false

  const build = () => {
    // 1. El túnel con la imagen proyectada (sin el hueco de la puerta).
    const d = toCorridor(PARTS.door.x0, PARTS.door.y0)
    const e = toCorridor(PARTS.door.x1, PARTS.door.y1)
    const hole = new THREE.Vector4(d.px / TEX.w, 1 - (e.py + TEX.top) / TEX.h, e.px / TEX.w, 1 - (d.py + TEX.top) / TEX.h)
    const projMat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex.corridor }, uProj0: { value: proj0 }, uHole: { value: hole }, uDim: { value: 1 }, uShade: { value: 1 } },
      vertexShader: PROJECT_VERT,
      fragmentShader: PROJECT_FRAG,
      side: THREE.DoubleSide,
    })
    const { a, b, c } = TUN
    const len = D + 2
    const zMid = -D + len / 2
    const h = b + c
    const yMid = (c - b) / 2
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * a, len), projMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, -b, zMid)
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(2 * a, len), projMat)
    ceil.rotation.x = Math.PI / 2
    ceil.position.set(0, c, zMid)
    const left = new THREE.Mesh(new THREE.PlaneGeometry(len, h), projMat)
    left.rotation.y = Math.PI / 2
    left.position.set(-a, yMid, zMid)
    const right = new THREE.Mesh(new THREE.PlaneGeometry(len, h), projMat)
    right.rotation.y = -Math.PI / 2
    right.position.set(a, yMid, zMid)
    const end = new THREE.Mesh(new THREE.PlaneGeometry(2 * a, h), projMat)
    end.position.set(0, yMid, -D)
    scene.add(floor, ceil, left, right, end)
    parts.proj = projMat

    // 2. El salón: la caja con la foto proyectada y las mesas paradas sobre su piso.
    buildRoom()

    // 3. Las hojas de la puerta.
    const door = rectAt(PARTS.door)
    const split = toCorridor(PARTS.door.split, 0)
    const sx = at(split.px, 0).x
    const leafL = plane({ x0: door.x0, y0: door.y0, x1: sx, y1: door.y1 }, Z_LEAVES, flat(tex.doorL))
    const leafR = plane({ x0: sx, y0: door.y0, x1: door.x1, y1: door.y1 }, Z_LEAVES, flat(tex.doorR))
    scene.add(leafL, leafR)
    parts.leafL = { mesh: leafL, x: leafL.position.x, w: sx - door.x0 }
    parts.leafR = { mesh: leafR, x: leafR.position.x, w: door.x1 - sx }

    // 4. La entrada en alta, con el hueco de la puerta.
    const crop = [MOD_SRC.x / IMG.w, 1 - (MOD_SRC.y + MOD_SRC.h) / IMG.h, (MOD_SRC.x + MOD_SRC.w) / IMG.w, 1 - MOD_SRC.y / IMG.h]
    const modRect = (() => {
      const p = at(MOD_DST.x, MOD_DST.y)
      const q = at(MOD_DST.x + MOD_DST.w, MOD_DST.y + MOD_DST.h)
      return { x0: p.x, y0: q.y, x1: q.x, y1: p.y }
    })()
    const module = plane(modRect, Z_MODULE, flat(tex.module, { crop, transparent: true }))
    module.renderOrder = 2
    scene.add(module)
    parts.module = module

    // 5. El cartel, aparte: letras de luz que flotan delante de la entrada.
    const signRect = rectAt(PARTS.sign, D)
    makeSign(signRect)

    // 6. Polvo en el aire del pasillo: profundidad mientras caminamos.
    parts.dust = makeDust()
    scene.add(parts.dust)

    // 7. Paneles de la nave a distintas profundidades (capas entre nosotros y la puerta): pasan
    // por los costados mientras caminamos y se corren distinto que el fondo con el puntero.
    parts.huds = makeHuds()
    parts.huds.forEach((h) => scene.add(h.mesh))

    parts.rects = { door, sign: signRect, port: rectAt(PARTS.port, D) }
    built = true
  }

  /** Cartel «cāpsula33» en canvas (nítido de cerca) y su sombra difusa sobre la pared. */
  const makeSign = async (rect) => {
    try {
      await document.fonts?.load('400 120px "Roboto Mono"')
    } catch {
      /* sin la fuente, la de reemplazo */
    }
    const W = 2048
    const H = Math.round((W * (rect.y1 - rect.y0)) / (rect.x1 - rect.x0))
    const draw = (shadow) => {
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      const g = c.getContext('2d')
      let size = H * 0.7
      g.font = `400 ${size}px "Roboto Mono", ui-monospace, monospace`
      size *= (W * 0.86) / g.measureText('cāpsula33').width
      g.font = `400 ${size}px "Roboto Mono", ui-monospace, monospace`
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      if (shadow) {
        g.filter = 'blur(40px)'
        g.fillStyle = 'rgba(0,0,0,0.6)'
        g.fillText('cāpsula33', W / 2, H * 0.55)
      } else {
        g.shadowColor = 'rgba(255,140,60,0.95)'
        g.shadowBlur = 60
        g.fillStyle = '#ffe9cc'
        g.fillText('cāpsula33', W / 2, H * 0.55)
        g.shadowBlur = 18
        g.shadowColor = 'rgba(255,220,180,0.9)'
        g.fillStyle = '#fff7ec'
        g.fillText('cāpsula33', W / 2, H * 0.55)
      }
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.NoColorSpace
      t.anisotropy = renderer.capabilities.getMaxAnisotropy()
      return t
    }
    const sign = plane(rect, Z_SIGN, flat(draw(false), { transparent: true }))
    const shadow = plane(rect, Z_MODULE + 0.004, flat(draw(true), { transparent: true }))
    shadow.position.x += 0.03
    sign.renderOrder = 4
    shadow.renderOrder = 3
    scene.add(shadow, sign)
    parts.sign = sign
    parts.signShadow = shadow
    parts.signY = sign.position.y
  }

  /** Un panel de interfaz de nave dibujado en canvas: marco, esquinas y un instrumento. */
  const hudTexture = (kind) => {
    const W = 640
    const H = 400
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')
    const CREAM = '#f2e9dc'
    const ICE = '#a9d6ff'
    const ORANGE = '#ff7a1a'
    const mono = (px, w = 500) => `${w} ${px}px 'Roboto Mono', ui-monospace, monospace`
    // Vidrio y marco.
    g.fillStyle = 'rgba(40,70,100,0.16)'
    g.fillRect(0, 0, W, H)
    g.strokeStyle = 'rgba(169,214,255,0.55)'
    g.lineWidth = 2
    g.strokeRect(10, 10, W - 20, H - 20)
    g.strokeStyle = CREAM
    g.lineWidth = 4
    for (const [x, y, dx, dy] of [[10, 10, 1, 1], [W - 10, 10, -1, 1], [10, H - 10, 1, -1], [W - 10, H - 10, -1, -1]]) {
      g.beginPath()
      g.moveTo(x, y + dy * 38)
      g.lineTo(x, y)
      g.lineTo(x + dx * 38, y)
      g.stroke()
    }
    g.fillStyle = ICE
    g.font = mono(22, 600)
    const title = { gauge: 'CAFETERA · GRUPO', radar: 'SECTOR SMA · C-33', bars: 'PRESIÓN DE CABINA', arrow: 'ACCESO · CAFÉ' }[kind]
    g.fillText(title, 34, 52)
    g.fillStyle = 'rgba(169,214,255,0.4)'
    g.fillRect(34, 66, W - 68, 2)
    if (kind === 'gauge') {
      const cx = W / 2
      const cy = 262
      g.lineWidth = 16
      g.lineCap = 'round'
      g.strokeStyle = 'rgba(169,214,255,0.22)'
      g.beginPath()
      g.arc(cx, cy, 118, Math.PI * 0.85, Math.PI * 2.15)
      g.stroke()
      g.strokeStyle = ORANGE
      g.beginPath()
      g.arc(cx, cy, 118, Math.PI * 0.85, Math.PI * 0.85 + Math.PI * 1.3 * 0.93)
      g.stroke()
      g.fillStyle = CREAM
      g.font = mono(78, 600)
      g.textAlign = 'center'
      g.fillText('93°', cx, cy + 22)
      g.font = mono(20, 500)
      g.fillStyle = ICE
      g.fillText('ESPRESSO · LISTO', cx, cy + 58)
      g.textAlign = 'left'
    } else if (kind === 'radar') {
      const cx = W / 2
      const cy = 240
      g.lineWidth = 2
      g.strokeStyle = 'rgba(169,214,255,0.5)'
      for (const r of [40, 80, 120]) {
        g.beginPath()
        g.arc(cx, cy, r, 0, Math.PI * 2)
        g.stroke()
      }
      g.beginPath()
      g.moveTo(cx - 135, cy)
      g.lineTo(cx + 135, cy)
      g.moveTo(cx, cy - 135)
      g.lineTo(cx, cy + 135)
      g.stroke()
      const sweep = g.createConicGradient(-0.6, cx, cy)
      sweep.addColorStop(0, 'rgba(255,122,26,0.55)')
      sweep.addColorStop(0.18, 'rgba(255,122,26,0)')
      sweep.addColorStop(1, 'rgba(255,122,26,0)')
      g.fillStyle = sweep
      g.beginPath()
      g.arc(cx, cy, 120, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = CREAM
      for (const [x, y] of [[cx + 52, cy - 34], [cx - 70, cy + 28], [cx + 18, cy + 74], [cx - 24, cy - 92]]) {
        g.beginPath()
        g.arc(x, y, 5, 0, Math.PI * 2)
        g.fill()
      }
      g.font = mono(18, 500)
      g.fillStyle = ICE
      g.fillText('LÁCAR · CHAPELCO · LANÍN', 34, H - 30)
    } else if (kind === 'bars') {
      const heights = [0.5, 0.74, 0.62, 0.88, 0.7, 0.56, 0.8, 0.66, 0.92, 0.6, 0.72, 0.5]
      heights.forEach((v, i) => {
        const h = v * 200
        g.fillStyle = i % 5 === 3 ? ORANGE : ICE
        g.fillRect(48 + i * 46, 330 - h, 28, h)
      })
      g.fillStyle = CREAM
      g.font = mono(46, 600)
      g.fillText('1,0 ATM', 34, 118)
      g.font = mono(18, 500)
      g.fillStyle = ICE
      g.fillText('ESTABLE', 330, 118)
    } else {
      g.fillStyle = CREAM
      g.font = mono(72, 700)
      g.fillText('CAFÉ', 34, 190)
      g.fillStyle = ORANGE
      for (let i = 0; i < 4; i++) {
        const x = 330 + i * 64
        g.beginPath()
        g.moveTo(x, 130)
        g.lineTo(x + 40, 170)
        g.lineTo(x, 210)
        g.lineTo(x + 18, 210)
        g.lineTo(x + 58, 170)
        g.lineTo(x + 18, 130)
        g.closePath()
        g.globalAlpha = 0.35 + i * 0.22
        g.fill()
        g.globalAlpha = 1
      }
      g.fillStyle = ICE
      g.font = mono(20, 500)
      g.fillText('AV. GRAL. ROCA 1120', 34, 262)
      g.fillText('DOMO 1 · PUERTA PRINCIPAL', 34, 296)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.NoColorSpace
    t.anisotropy = renderer.capabilities.getMaxAnisotropy()
    return t
  }

  const makeHuds = () => {
    const defs = [
      { kind: 'gauge', x: -2.55, y: 0.55, z: -4.7, ry: 0.5, s: 0.95 },
      { kind: 'radar', x: 2.65, y: -0.05, z: -5.7, ry: -0.5, s: 0.95 },
      { kind: 'bars', x: -2.5, y: -0.5, z: -6.6, ry: 0.45, s: 0.85 },
      { kind: 'arrow', x: 2.55, y: 0.6, z: -7.4, ry: -0.45, s: 0.85 },
    ]
    return defs.map((d) => {
      const mat = new THREE.MeshBasicMaterial({ map: hudTexture(d.kind), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d.s * 1.0, d.s * 0.625), mat)
      mesh.position.set(d.x, d.y, d.z)
      mesh.rotation.y = d.ry
      mesh.renderOrder = 5
      return { mesh, mat, d, phase: Math.random() * 6 }
    })
  }

  const makeDust = () => {
    const N = 520
    const pos = new Float32Array(N * 3)
    const { a, b, c } = TUN
    for (let i = 0; i < N; i += 1) {
      pos[i * 3] = (Math.random() * 2 - 1) * a * 0.9
      pos[i * 3 + 1] = -b + Math.random() * (b + c)
      pos[i * 3 + 2] = -1 - Math.random() * (D - 1.4)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const dot = document.createElement('canvas')
    dot.width = dot.height = 64
    const g = dot.getContext('2d')
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.35, 'rgba(255,255,255,0.35)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    const mat = new THREE.PointsMaterial({
      size: 0.035,
      map: new THREE.CanvasTexture(dot),
      color: 0xdfe6ff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    return new THREE.Points(geo, mat)
  }

  ready.then(() => {
    build()
    onReady()
  })

  const buildRoom = () => {
    const F1 = IMG.h / 2 / Math.tan(((FOV / 2) * Math.PI) / 180)
    const z0 = Z_INSIDE_CAM + PHOTO_BACK // la cámara de la foto está acá
    const dDoor = z0 - Z_LEAVES + 0.03 // la caja empieza justo detrás de la puerta (nunca delante de la fachada)
    // Un punto del piso visto en la foto (px, py) → mundo.
    const onFloor = (px, py) => {
      const d = (ROOM.eye * F1) / (py - ROOM.horizon)
      return { x: ((px - IMG.w / 2) * d) / F1, d }
    }
    const db = (ROOM.eye * F1) / (ROOM.back.floor - ROOM.horizon)
    const top = ((ROOM.horizon - ROOM.back.top) * db) / F1
    const yF = -ROOM.eye
    const bl = { x: ((ROOM.back.left - IMG.w / 2) * db) / F1, d: db }
    const br = { x: ((ROOM.back.right - IMG.w / 2) * db) / F1, d: db }
    const nl = onFloor(ROOM.near.left, IMG.h)
    const nr = onFloor(ROOM.near.right, IMG.h)
    // Las paredes siguen hasta casi la puerta (más cerca de lo que muestra la foto).
    const ext = (a, b, d) => ({ x: a.x + ((b.x - a.x) * (d - a.d)) / (b.d - a.d), d })
    const fl = ext(nl, bl, dDoor)
    const fr = ext(nr, br, dDoor)
    parts.wallX = (side, d) => (side < 0 ? ext(nl, bl, d).x : ext(nr, br, d).x)
    const P = (q, y) => [q.x, y, z0 - q.d]
    const quad = (a, b, c, d) => {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3))
      return g
    }
    const cam1 = new THREE.PerspectiveCamera(FOV, IMG.w / IMG.h, 0.01, 100)
    cam1.position.set(0, 0, z0)
    cam1.updateMatrixWorld()
    const proj1 = new THREE.Matrix4().multiplyMatrices(cam1.projectionMatrix, cam1.matrixWorldInverse)
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex.interior }, uProj0: { value: proj1 }, uHole: { value: new THREE.Vector4(2, 2, 2, 2) }, uDim: { value: 1 }, uShade: { value: 0 } },
      vertexShader: PROJECT_VERT,
      fragmentShader: PROJECT_FRAG,
      side: THREE.DoubleSide,
    })
    const room = new THREE.Group()
    room.add(
      new THREE.Mesh(quad(P(fl, yF), P(fr, yF), P(br, yF), P(bl, yF)), mat), // piso
      new THREE.Mesh(quad(P(fl, top), P(bl, top), P(br, top), P(fr, top)), mat), // techo
      new THREE.Mesh(quad(P(fl, yF), P(bl, yF), P(bl, top), P(fl, top)), mat), // pared izquierda
      new THREE.Mesh(quad(P(fr, yF), P(fr, top), P(br, top), P(br, yF)), mat), // pared derecha
      new THREE.Mesh(quad(P(bl, yF), P(br, yF), P(br, top), P(bl, top)), mat), // el fondo
    )
    scene.add(room)
    parts.roomMat = mat

    // Las mesas: el mismo juego en varios lugares, con las patas en el piso.
    const h = TABLE_W * TABLE_ASPECT
    const geo = new THREE.PlaneGeometry(TABLE_W, h)
    TABLES.forEach(([dx, d, mirror]) => {
      const x = dx > 0 ? parts.wallX(-1, d) + dx : parts.wallX(1, d) + dx
      const m = new THREE.Mesh(geo, flat(tex.table, { transparent: true }))
      m.position.set(x, yF + h * (TABLE_FLOOR - 0.5), z0 - d)
      if (mirror) m.scale.x = -1
      m.renderOrder = 1
      scene.add(m)
    })
  }

  const resize = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // En horizontal, el encuadre de la toma; en vertical, más angular (la textura extendida
    // lo banca) para que entre la entrada entera con el pasillo alrededor. Nunca fuera de la textura.
    const aspect = camera.aspect
    let tanV = aspect >= 1 ? Math.tan(((FOV / 2) * Math.PI) / 180) : 0.8 / aspect
    tanV = Math.min(tanV, MAX_TAN, MAX_TAN / aspect)
    camera.fov = (2 * Math.atan(tanV) * 180) / Math.PI
    camera.updateProjectionMatrix()
    state.portrait = aspect < 0.9
    state.yaw = 0
  }
  resize()
  window.addEventListener('resize', resize)

  const smooth = (t) => t * t * (3 - 2 * t)
  let raf = 0
  let last = performance.now()
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    budget.tick(now - last)
    last = now
    const walk = smooth(state.walk)
    const enter = smooth(Math.min(1, state.enter / ENTER_STOP))
    const z = Z_START + (Z_WALKED - Z_START) * walk + (Z_INSIDE_CAM - Z_WALKED) * enter
    const still = 1 - Math.min(1, walk * 1.4 + enter)
    // Paso: un vaivén mínimo mientras se camina.
    const bob = Math.sin(-z * 2.4) * 0.018 * Math.sin(Math.PI * state.walk)
    // Adentro el puntero sigue moviendo la cámara (de costado, más que afuera): las mesas se
    // corren contra el salón.
    camera.position.set(state.px * (0.16 + 0.22 * enter), state.py * -(0.08 - 0.04 * enter) + bob, z)
    camera.rotation.set(state.py * -0.018 * still, state.yaw * (1 - Math.max(walk, enter)) - state.px * (0.03 * still + 0.012 * enter), 0)
    if (built) {
      const peek = state.peek * (1 - state.open)
      parts.leafL.mesh.position.x = parts.leafL.x - parts.leafL.w * (state.open + peek * 0.1)
      parts.leafR.mesh.position.x = parts.leafR.x + parts.leafR.w * (state.open + peek * 0.1)
      parts.module.material.uniforms.uGlow.value = state.glow * 0.12
      parts.proj.uniforms.uDim.value = 1 - 0.25 * enter
      // El cartel flota: respira despacio y su sombra en la pared lo acompaña.
      if (parts.sign) {
        // La flotación arranca en cero desde que la marca llegó (sin salto) y crece despacio.
        const since = state.landedAt ? (now - state.landedAt) / 1000 : 0
        const amp = state.landedAt ? Math.min(1, since / 1.8) : 0
        parts.sign.position.y = parts.signY + Math.sin(since * 1.1) * 0.02 * amp
        parts.sign.rotation.z = Math.sin(since * 0.7) * 0.006 * amp
        parts.signShadow.position.y = parts.signY - 0.035 * amp + Math.sin(since * 1.1) * 0.0067 * amp
        // Al pasar el puntero, titila como un neón que se reacomoda.
        const f = now - state.flickerAt
        const raw = f >= 0 && f < 1100 ? [1, 0.25, 1, 0.4, 0.9, 0.15, 1, 1, 0.75, 1, 1][Math.floor(f / 100)] : 1
        const flick = 1 - (1 - raw) * state.flickerAmp
        // El cartel espera a que la marca del loader llegue volando (signOn) y entra titilando.
        parts.sign.material.uniforms.uOpacity.value = flick * state.signOn
        // La sombra se nota de lejos y se borra al acercarse (de cerca se leía como un doble).
        parts.signShadow.material.uniforms.uOpacity.value = 0.32 * flick * (1 - walk) * state.signOn
      }
      // Los paneles: aparecen de lejos, flotan, y se van al pasar a nuestro lado.
      if (parts.huds) {
        const base = Math.min(1, state.signOn) * (1 - Math.min(1, state.enter * 4))
        for (const h of parts.huds) {
          const dist = camera.position.z - h.d.z // > 0: todavía delante nuestro
          const near = Math.min(1, Math.max(0, (dist - 0.5) / 1.1))
          const far = 1 - Math.min(1, Math.max(0, (dist - 4.2) / 2.2))
          h.mat.opacity = 0.9 * near * far * base
          h.mesh.position.y = h.d.y + Math.sin(now * 0.0009 + h.phase) * 0.025
          h.mesh.visible = h.mat.opacity > 0.01
        }
      }
      if (parts.dust) {
        parts.dust.position.y = Math.sin(now * 0.00025) * 0.06
        parts.dust.rotation.z = Math.sin(now * 0.0001) * 0.02
      }
    }
    renderer.render(scene, camera)
    if (built) onFrame(camera)
  }
  raf = requestAnimationFrame(frame)

  /** Rectángulo en pantalla (px CSS) de una parte de la entrada. */
  const v = new THREE.Vector3()
  const screenRect = (name) => {
    if (!built) return null
    const r = parts.rects[name]
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const [x, y] of [
      [r.x0, r.y0],
      [r.x1, r.y1],
      [r.x0, r.y1],
      [r.x1, r.y0],
    ]) {
      v.set(x, y, name === 'sign' ? Z_SIGN : Z_MODULE).project(camera)
      const sx = (v.x * 0.5 + 0.5) * w
      const sy = (1 - (v.y * 0.5 + 0.5)) * h
      minX = Math.min(minX, sx)
      maxX = Math.max(maxX, sx)
      minY = Math.min(minY, sy)
      maxY = Math.max(maxY, sy)
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, behind: v.z > 1 }
  }

  /** Un punto del pasillo en pantalla (px CSS) y a qué distancia está de la cámara. */
  const projectPoint = (x, y, z) => {
    v.set(x, y, z).project(camera)
    return {
      x: (v.x * 0.5 + 0.5) * canvas.clientWidth,
      y: (1 - (v.y * 0.5 + 0.5)) * canvas.clientHeight,
      depth: camera.position.z - z,
    }
  }

  return {
    state,
    screenRect,
    projectPoint,
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      scene.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose()
          o.material.dispose()
        }
      })
      Object.values(tex).forEach((t) => t.dispose())
      renderer.dispose()
    },
  }
}
