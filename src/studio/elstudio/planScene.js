import * as THREE from 'three'
import { PLAN, ROOMS, WALLS } from './planData'

/**
 * La escena del hero: el plano que se dibuja y la maqueta que sube.
 *
 * Tres capas, todas armadas desde `planData.js`:
 *   1. líneas   el plano en tinta (contornos de muros, ventanas, puertas con su arco). Se dibujan
 *               en orden, como un trazo continuo: cada vértice sabe en qué punto del recorrido está
 *               (`aDist`, 0→1) y el shader descarta lo que todavía no se dibujó (`uDraw`).
 *   2. poché    el relleno de los muros cortados, en tinta, como en un plano de arquitectura.
 *   3. maqueta  los muros en 3D (papel blanco con aristas en tinta), que suben desde el plano.
 *
 * El fondo es transparente: el papel con grano de la página se ve detrás y las sombras caen sobre
 * él (un plano que solo recibe sombras).
 *
 *   const scene = createPlanScene({ canvas })
 *   scene.setDraw(0..1)     cuánto del plano está dibujado
 *   scene.setProgress(0..1) el scroll del hero: la cámara pasa de planta a 3/4 y los muros suben
 *   scene.probe(x, y)       el punto del plano bajo el puntero, en metros (o null)
 *   scene.render()          dibuja si algo cambió
 */

const INK = new THREE.Color('#161513')
const PAPER = new THREE.Color('#f6f4ee')
const LINE_W = 0.024 // el grosor de la tinta del plano, en metros
const FOV = 28
const CENTER = new THREE.Vector3(PLAN.w / 2, 0, PLAN.d / 2)

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeOut = (t) => 1 - (1 - t) ** 3

/** Parte un muro en tramos llenos y aberturas, a lo largo de su eje. */
function splitWall(wall) {
  const [ax, az] = wall.a
  const [bx, bz] = wall.b
  const len = Math.hypot(bx - ax, bz - az)
  const dir = { x: (bx - ax) / len, z: (bz - az) / len }
  const normal = { x: -dir.z, z: dir.x }
  const openings = [...wall.openings].sort((p, q) => p.at - q.at)
  const pieces = []
  let cursor = 0
  for (const o of openings) {
    const s = o.at - o.w / 2
    const e = o.at + o.w / 2
    if (s > cursor) pieces.push({ kind: 'solid', s: cursor, e: s })
    pieces.push({ kind: o.type, s, e, swing: o.swing ?? 1 })
    cursor = e
  }
  if (cursor < len) pieces.push({ kind: 'solid', s: cursor, e: len })
  const at = (d, off = 0) => ({ x: ax + dir.x * d + normal.x * off, z: az + dir.z * d + normal.z * off })
  return { len, dir, normal, pieces, at, t: wall.t }
}

/** Los trazos del plano, en el orden en que se dibujan: cada uno es una polilínea en metros. */
function planStrokes(walls) {
  const outlines = []
  const symbols = []
  for (const w of walls) {
    const h = w.t / 2
    for (const p of w.pieces) {
      // Un tramo lleno que llega a la punta del muro se estira medio espesor: así las esquinas se cierran.
      const s = p.kind === 'solid' && p.s === 0 ? -h : p.s
      const e = p.kind === 'solid' && p.e === w.len ? w.len + h : p.e
      if (p.kind === 'solid') {
        outlines.push([w.at(s, -h), w.at(e, -h), w.at(e, h), w.at(s, h), w.at(s, -h)])
      } else if (p.kind === 'window') {
        // Las dos caras del muro y el vidrio al medio.
        symbols.push([w.at(p.s, -h), w.at(p.e, -h)], [w.at(p.e, h), w.at(p.s, h)], [w.at(p.s, 0), w.at(p.e, 0)])
      } else if (p.kind === 'door') {
        // La hoja abierta a 90° desde la bisagra y el arco del giro hasta el otro marco.
        const r = p.e - p.s
        const side = p.swing
        const hinge = w.at(p.s, side * h)
        const leafEnd = w.at(p.s, side * (h + r))
        symbols.push([hinge, leafEnd])
        const arc = []
        for (let i = 0; i <= 18; i += 1) {
          const a = (i / 18) * (Math.PI / 2)
          arc.push(w.at(p.s + Math.sin(a) * r, side * (h + Math.cos(a) * r)))
        }
        symbols.push(arc)
      }
    }
  }
  return [...outlines, ...symbols]
}

/** Una cinta por cada tramo de cada polilínea, con la distancia recorrida en cada vértice (0→1). */
function ribbonGeometry(strokes) {
  const segments = []
  let total = 0
  for (const line of strokes) {
    for (let i = 0; i < line.length - 1; i += 1) {
      const p = line[i]
      const q = line[i + 1]
      const len = Math.hypot(q.x - p.x, q.z - p.z)
      if (len < 1e-6) continue
      segments.push({ p, q, d0: total, d1: total + len })
      total += len
    }
  }
  const pos = new Float32Array(segments.length * 4 * 3)
  const dist = new Float32Array(segments.length * 4)
  const index = []
  segments.forEach(({ p, q, d0, d1 }, k) => {
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    // Media cinta hacia cada lado, y un poco más larga para que las uniones no queden mordidas.
    const nx = (-(q.z - p.z) / len) * (LINE_W / 2)
    const nz = ((q.x - p.x) / len) * (LINE_W / 2)
    const ex = ((q.x - p.x) / len) * (LINE_W / 2)
    const ez = ((q.z - p.z) / len) * (LINE_W / 2)
    const verts = [
      [p.x - ex + nx, p.z - ez + nz, d0],
      [p.x - ex - nx, p.z - ez - nz, d0],
      [q.x + ex + nx, q.z + ez + nz, d1],
      [q.x + ex - nx, q.z + ez - nz, d1],
    ]
    verts.forEach(([x, z, d], v) => {
      pos.set([x, 0.004, z], (k * 4 + v) * 3)
      dist[k * 4 + v] = d / total
    })
    const o = k * 4
    index.push(o, o + 2, o + 1, o + 1, o + 2, o + 3)
  })
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aDist', new THREE.BufferAttribute(dist, 1))
  geo.setIndex(index)
  return geo
}

function inkLineMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uDraw: { value: 0 }, uColor: { value: INK }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aDist;
      varying float vDist;
      void main() {
        vDist = aDist;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uDraw;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vDist;
      void main() {
        if (vDist > uDraw) discard;
        gl_FragColor = vec4(uColor, uOpacity);
      }
    `,
  })
}

/** Una caja de muro alineada con el tramo, apoyada en el piso entre `y0` e `y1`. */
function wallBox(w, s, e, y0, y1, depth = w.t) {
  const len = e - s
  const geo = new THREE.BoxGeometry(len, y1 - y0, depth)
  geo.translate(0, (y0 + y1) / 2, 0)
  const mid = w.at((s + e) / 2)
  const mesh = new THREE.Mesh(geo)
  mesh.position.set(mid.x, 0, mid.z)
  mesh.rotation.y = -Math.atan2(w.dir.z, w.dir.x)
  return mesh
}

export function createPlanScene({ canvas, phone = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setClearColor(0x000000, 0)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200)

  const walls = WALLS.map(splitWall)

  // 1 + 2. El plano: líneas y poché.
  const lineMat = inkLineMaterial()
  const lines = new THREE.Mesh(ribbonGeometry(planStrokes(walls)), lineMat)
  lines.renderOrder = 2
  scene.add(lines)

  const pocheMat = new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0, depthWrite: false })
  const poche = new THREE.Group()
  for (const w of walls) {
    const h = w.t / 2
    for (const p of w.pieces) {
      if (p.kind !== 'solid') continue
      const s = p.s === 0 ? -h : p.s
      const e = p.e === w.len ? w.len + h : p.e
      const geo = new THREE.PlaneGeometry(e - s, w.t)
      geo.rotateX(-Math.PI / 2)
      const m = new THREE.Mesh(geo, pocheMat)
      const mid = w.at((s + e) / 2)
      m.position.set(mid.x, 0.002, mid.z)
      m.rotation.y = -Math.atan2(w.dir.z, w.dir.x)
      m.renderOrder = 1
      poche.add(m)
    }
  }
  scene.add(poche)

  // 3. La maqueta: un grupo por muro, que sube entero desde el piso (escala en y).
  // El polygonOffset empuja las caras un poco hacia atrás: las aristas en tinta quedan limpias encima.
  const paperMat = new THREE.MeshLambertMaterial({ color: PAPER, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
  const glassMat = new THREE.MeshBasicMaterial({ color: '#c9d4d2', transparent: true, opacity: 0.35, depthWrite: false })
  const edgeMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.55 })
  const risers = walls.map((w) => {
    const group = new THREE.Group()
    const h = w.t / 2
    const add = (mesh, glass = false) => {
      mesh.material = glass ? glassMat : paperMat
      if (!glass) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), edgeMat)
        mesh.add(edges)
      }
      group.add(mesh)
    }
    for (const p of w.pieces) {
      const s = p.kind === 'solid' && p.s === 0 ? -h : p.s
      const e = p.kind === 'solid' && p.e === w.len ? w.len + h : p.e
      if (p.kind === 'solid') add(wallBox(w, s, e, 0, PLAN.height))
      if (p.kind === 'window') {
        add(wallBox(w, s, e, 0, PLAN.sill))
        add(wallBox(w, s, e, PLAN.lintel, PLAN.height))
        add(wallBox(w, s, e, PLAN.sill, PLAN.lintel, 0.02), true)
      }
      if (p.kind === 'door') {
        add(wallBox(w, s, e, PLAN.lintel, PLAN.height))
        // La hoja, abierta a 90° hacia el lado del giro.
        const r = e - s
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.04, PLAN.lintel - 0.02, r))
        leaf.geometry.translate(0, (PLAN.lintel - 0.02) / 2, 0)
        const c = w.at(s, p.swing * (h + r / 2))
        leaf.position.set(c.x, 0, c.z)
        leaf.rotation.y = -Math.atan2(w.dir.z, w.dir.x)
        add(leaf)
      }
    }
    group.scale.y = 0.0001
    group.visible = false
    scene.add(group)
    return group
  })

  // Luz: cielo parejo y un sol bajo desde el noroeste, con sombras suaves sobre el papel.
  // Maqueta de papel: mucha luz de cielo (las caras a la sombra quedan claras) y un sol que marca las sombras.
  scene.add(new THREE.HemisphereLight('#ffffff', '#ece6d8', 2.3))
  scene.add(new THREE.AmbientLight('#ffffff', 0.35))
  const sun = new THREE.DirectionalLight('#fff4e2', 1.5)
  sun.position.set(CENTER.x - 7, 11, CENTER.z - 6)
  sun.target.position.copy(CENTER)
  sun.castShadow = true
  sun.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048)
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 })
  sun.shadow.bias = -0.0004
  sun.shadow.radius = 4
  scene.add(sun, sun.target)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.16 }))
  ground.rotation.x = -Math.PI / 2
  ground.position.copy(CENTER)
  ground.receiveShadow = true
  scene.add(ground)

  // Estado.
  let width = 1
  let height = 1
  let draw = 0
  let progress = 0
  let dirty = true
  const labels = ROOMS.map((r) => ({ ...r, world: new THREE.Vector3(r.at[0], 0, r.at[1]), x: 0, y: 0, alpha: 0 }))

  /** La distancia de cámara a la que la planta entra entera, con aire para el encabezado. */
  const fitDistance = (portrait) => {
    const tan = Math.tan((FOV * Math.PI) / 360)
    const halfAcross = (portrait ? PLAN.d : PLAN.w) / 2 + 1.1
    const halfAlong = (portrait ? PLAN.w : PLAN.d) / 2 + 1.6
    return Math.max(halfAlong / tan, halfAcross / (tan * camera.aspect))
  }

  const placeCamera = () => {
    const portrait = camera.aspect < 0.9
    const c = smooth(0, 0.75, progress)
    // De la planta (mirando derecho hacia abajo, el norte arriba) a una vista 3/4 de maqueta.
    const polar = THREE.MathUtils.lerp(0.0005, (portrait ? 48 : 54) * (Math.PI / 180), c)
    const turn = portrait ? Math.PI / 2 : 0 // en vertical, el lado largo del plano va a lo alto
    const azimuth = turn + THREE.MathUtils.lerp(0, -0.62, c) + progress * 0.12
    const d0 = fitDistance(portrait)
    const dist = THREE.MathUtils.lerp(d0, d0 * (portrait ? 1.42 : 1.08), c)
    const target = CENTER.clone()
    target.y = THREE.MathUtils.lerp(0, 0.9, c)
    camera.position.set(
      target.x + dist * Math.sin(polar) * Math.sin(azimuth),
      target.y + dist * Math.cos(polar),
      target.z + dist * Math.sin(polar) * Math.cos(azimuth),
    )
    camera.up.set(0, 1, 0)
    camera.lookAt(target)
  }

  const update = () => {
    lineMat.uniforms.uDraw.value = draw
    // El poché entra cuando el contorno ya va por el final, como el relleno de la S del loader.
    pocheMat.opacity = smooth(0.55, 1, draw)
    // Los muros suben de a uno, en el orden en que se dibujaron.
    const rise = smooth(0.08, 0.78, progress)
    risers.forEach((g, i) => {
      const delay = (i / risers.length) * 0.55
      const k = easeOut(clamp01((rise - delay) / 0.45))
      g.visible = k > 0.001
      g.scale.y = Math.max(0.0001, k)
    })
    placeCamera()
    camera.updateMatrixWorld()
    // Las etiquetas de los ambientes: se ven en la planta y se van cuando la maqueta sube.
    const show = smooth(0.7, 1, draw) * (1 - smooth(0.02, 0.2, progress))
    for (const l of labels) {
      const v = l.world.clone().project(camera)
      l.x = (v.x * 0.5 + 0.5) * width
      l.y = (-v.y * 0.5 + 0.5) * height
      l.alpha = show
    }
  }

  const raycaster = new THREE.Raycaster()
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const hit = new THREE.Vector3()

  return {
    labels,
    setDraw(v) {
      if (v !== draw) {
        draw = v
        dirty = true
      }
    },
    setProgress(v) {
      if (Math.abs(v - progress) > 1e-5) {
        progress = v
        dirty = true
      }
    },
    setPixelRatio(v) {
      renderer.setPixelRatio(v)
      dirty = true
    },
    resize(w, h) {
      width = w
      height = h
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      dirty = true
    },
    /** El punto del piso bajo el puntero (px dentro del canvas), en metros del plano; null si cae afuera. */
    probe(x, y) {
      const ndc = new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      if (!raycaster.ray.intersectPlane(floor, hit)) return null
      if (hit.x < 0 || hit.x > PLAN.w || hit.z < 0 || hit.z > PLAN.d) return null
      return { x: hit.x, y: hit.z }
    },
    /** Dibuja solo si algo cambió. Devuelve true si dibujó. */
    render(force = false) {
      if (!dirty && !force) return false
      dirty = false
      update()
      renderer.render(scene, camera)
      return true
    },
    dispose() {
      scene.traverse((o) => {
        o.geometry?.dispose?.()
      })
      ;[lineMat, pocheMat, paperMat, glassMat, edgeMat, ground.material].forEach((m) => m.dispose())
      renderer.dispose()
    },
  }
}
