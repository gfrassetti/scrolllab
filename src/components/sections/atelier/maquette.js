import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import oakUrl from './assets/tex-oak.webp'
import concreteUrl from './assets/tex-concrete.webp'

/**
 * maquette — the studio's architectural model, the kind that sits on the big
 * table of an architecture office: white card volumes on an oak base, a glass
 * ground floor, a cantilevered first floor, a stair tower, lollipop trees.
 * Hero and Services share it.
 *
 * `setBuild(t)` — 0 = only the drawing on the base, 1 = the model built: each
 * piece drops into its place in order (slab, glass, columns, floors, tower,
 * roof), so the scroll assembles the building and can run it backwards.
 *
 * `setState(s)` — the services, as a float (scrubbed with the scroll):
 *   0 Architecture — the white massing model
 *   1 Interiors    — the upper floors lift off and the furnished plan shows
 *   2 Landscape    — the trees and the planting grow around the building
 *   3 Materials    — the card turns into cast concrete and the slabs into oak
 *
 * Textures: Poly Haven (CC0) — oak_veneer_01, concrete_wall_008.
 */

export const STATE_COUNT = 4
const FLOOR = -0.9 // top of the base plate
const ease = (t) => t * t * (3 - 2 * t)
const clamp01 = (t) => Math.min(1, Math.max(0, t))
/** 0→1 inside [a, b] of t. */
const span = (t, a, b) => ease(clamp01((t - a) / (b - a)))

/** Carga una textura; mientras llega, el material muestra `fallback` (y no negro). */
function loadTexture(url, renderer, repeat = 1, onReady) {
  const t = new THREE.TextureLoader().load(url, () => onReady?.())
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  return t
}

/** The lines of the plan drawn on the base (a canvas texture). */
function planTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 768
  const g = c.getContext('2d')
  g.strokeStyle = 'rgba(40,36,30,0.55)'
  g.lineWidth = 2
  // retícula de ejes
  g.setLineDash([14, 10])
  for (let x = 112; x < 1024; x += 160) {
    g.beginPath()
    g.moveTo(x, 40)
    g.lineTo(x, 728)
    g.stroke()
  }
  for (let y = 104; y < 768; y += 160) {
    g.beginPath()
    g.moveTo(40, y)
    g.lineTo(984, y)
    g.stroke()
  }
  g.setLineDash([])
  g.lineWidth = 3
  // la planta del edificio y el recorrido del jardín
  g.strokeRect(272, 224, 480, 300)
  g.strokeRect(232, 244, 120, 120)
  g.beginPath()
  g.arc(820, 600, 70, 0, Math.PI * 2)
  g.stroke()
  g.font = '28px monospace'
  g.fillStyle = 'rgba(40,36,30,0.6)'
  g.fillText('A', 92, 64)
  g.fillText('B', 252, 64)
  g.fillText('PLAN 1:100', 760, 740)
  return new THREE.CanvasTexture(c)
}

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {{ tint?: string, accent?: string }} [opts] tint = the card colour, accent = the trees
 */
export function createMaquette(renderer, scene, { tint, accent } = {}) {
  const lowPower = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
  renderer.shadowMap.enabled = !lowPower
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envMap
  scene.environmentIntensity = 0.65

  const owned = { geo: [], mat: [], tex: [] }
  const own = (kind, x) => (owned[kind].push(x), x)

  // —— materiales ——
  const cardColor = new THREE.Color(tint || '#f1eee8')
  const concreteColor = new THREE.Color('#c9c4bb')
  // mientras cargan las texturas, la madera y el hormigón se ven de su color (no negros)
  const oak = own('tex', loadTexture(oakUrl, renderer, 1.4, () => {
    base.map = oak
    slabOak.map = oak
    base.color.set('#ffffff')
    slabOak.color.set('#ffffff')
    base.needsUpdate = slabOak.needsUpdate = true
  }))
  const concrete = own('tex', loadTexture(concreteUrl, renderer, 1.2, () => {
    cardConcrete.map = concrete
    cardConcrete.color.copy(concreteColor)
    cardConcrete.needsUpdate = true
  }))
  const card = own('mat', new THREE.MeshStandardMaterial({ color: cardColor.clone(), roughness: 0.82, metalness: 0 }))
  const cardConcrete = own('mat', new THREE.MeshStandardMaterial({ color: concreteColor, roughness: 0.92, transparent: true, opacity: 0 }))
  const slab = own('mat', new THREE.MeshStandardMaterial({ color: cardColor.clone(), roughness: 0.75 }))
  const slabOak = own('mat', new THREE.MeshStandardMaterial({ color: '#b98b5c', roughness: 0.6, transparent: true, opacity: 0 }))
  const base = own('mat', new THREE.MeshStandardMaterial({ color: '#b98b5c', roughness: 0.55 }))
  const plan = own('tex', planTexture())
  const planMat = own('mat', new THREE.MeshBasicMaterial({ map: plan, transparent: true, opacity: 0.85, depthWrite: false }))
  const glass = own('mat', new THREE.MeshPhysicalMaterial({ color: '#b8c6c9', roughness: 0.08, metalness: 0, transparent: true, opacity: 0.32 }))
  const dark = own('mat', new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.4 }))
  const tree = own('mat', new THREE.MeshStandardMaterial({ color: accent || '#dfe3d6', roughness: 0.9 }))
  const furniture = own('mat', new THREE.MeshStandardMaterial({ color: '#c8b49a', roughness: 0.8 }))

  const box = (w, h, d, r = 0.012) => own('geo', new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)))
  const mesh = (geo, ...mats) => {
    const m = new THREE.Mesh(geo, mats[0])
    m.castShadow = true
    m.receiveShadow = true
    // la versión en hormigón / roble, encima, que aparece con el estado «Materials»
    if (mats[1]) {
      const twin = new THREE.Mesh(geo, mats[1])
      twin.scale.setScalar(1.002)
      m.add(twin)
    }
    return m
  }

  const group = new THREE.Group()
  scene.add(group)

  // —— la base de roble con el plano dibujado ——
  const baseMesh = mesh(box(3.6, 0.14, 2.6, 0.02), base)
  baseMesh.position.y = FLOOR - 0.07
  group.add(baseMesh)
  const planMesh = new THREE.Mesh(own('geo', new THREE.PlaneGeometry(3.4, 2.4)), planMat)
  planMesh.rotation.x = -Math.PI / 2
  planMesh.position.y = FLOOR + 0.002
  group.add(planMesh)

  // —— las piezas del edificio, en el orden en que se arman ——
  // cada pieza: { obj, home (posición final), from (desplazamiento desde arriba), at (cuándo llega) }
  const pieces = []
  const add = (obj, x, y, z, at, lift = 1.6) => {
    obj.position.set(x, y, z)
    group.add(obj)
    pieces.push({ obj, home: new THREE.Vector3(x, y, z), at, lift, spin: (Math.random() - 0.5) * 0.6 })
    return obj
  }
  const y0 = FLOOR
  // planta baja: losa, caja de vidrio, columnas
  add(mesh(box(2.1, 0.06, 1.3), slab, slabOak), 0, y0 + 0.03, 0, 0.05)
  add(mesh(box(1.5, 0.46, 0.9, 0.004), glass), -0.12, y0 + 0.29, 0.02, 0.14)
  for (const [x, z] of [[-0.95, -0.55], [0.95, -0.55], [-0.95, 0.55], [0.95, 0.55], [0.32, 0.55], [0.32, -0.55]]) {
    add(mesh(box(0.045, 0.46, 0.045, 0.006), card, cardConcrete), x, y0 + 0.29, z, 0.2)
  }
  // primer piso: volumen en voladizo con ventana corrida
  const l1 = add(mesh(box(2.3, 0.5, 1.12), card, cardConcrete), 0.18, y0 + 0.77, 0, 0.34)
  const ribbon = mesh(box(2.02, 0.12, 0.02, 0.004), dark)
  ribbon.position.set(0, 0.04, 0.565)
  l1.add(ribbon)
  // segundo piso y terraza
  const l2 = add(mesh(box(1.25, 0.48, 1.0), card, cardConcrete), -0.36, y0 + 1.26, -0.04, 0.5)
  const l2win = mesh(box(0.9, 0.2, 0.02, 0.004), dark)
  l2win.position.set(0.05, 0.02, 0.505)
  l2.add(l2win)
  add(mesh(box(1.1, 0.04, 1.0), slab, slabOak), 0.85, y0 + 1.04, -0.04, 0.58)
  // torre de escalera y techo
  add(mesh(box(0.36, 1.72, 0.36), card, cardConcrete), -1.12, y0 + 0.86, -0.42, 0.66)
  add(mesh(box(1.4, 0.05, 1.1), slab, slabOak), -0.36, y0 + 1.525, -0.04, 0.76)

  // —— el interior (se ve cuando los pisos de arriba se levantan) ——
  const interior = new THREE.Group()
  const fit = [
    [box(0.5, 0.1, 0.22), 0.55, 0.06, 0.2], // sofá
    [box(0.28, 0.07, 0.28), 0.0, 0.035, 0.18], // mesa baja
    [box(0.62, 0.09, 0.3), -0.55, 0.05, -0.2], // mesa de comedor
    [box(0.14, 0.24, 0.14), 0.9, 0.12, -0.3], // planta / lámpara
    [box(0.9, 0.02, 0.02), -0.2, 0.25, -0.5], // estante
  ]
  for (const [geo, x, y, z] of fit) {
    const f = mesh(geo, furniture)
    f.position.set(x, y, z)
    interior.add(f)
  }
  interior.position.set(0.18, y0 + 0.52 + 0.005, 0)
  interior.scale.setScalar(0.001)
  group.add(interior)

  // —— el paisaje: árboles de maqueta y canteros ——
  const trees = new THREE.Group()
  const trunk = own('geo', new THREE.CylinderGeometry(0.018, 0.024, 0.5, 8))
  const crown = own('geo', new THREE.IcosahedronGeometry(0.24, 2))
  const spots = [
    [1.4, 0.75], [1.55, -0.2], [1.25, -0.95], [-1.45, 0.85], [-0.6, 1.05], [0.4, 1.05], [-1.5, -0.95], [1.5, 0.15],
  ]
  for (const [x, z] of spots) {
    const t = new THREE.Group()
    const s = 0.75 + ((x * 13 + z * 7) % 1 + 1) % 1 * 0.5
    const a = new THREE.Mesh(trunk, tree)
    a.position.y = 0.25
    const b = new THREE.Mesh(crown, tree)
    b.position.y = 0.62
    a.castShadow = b.castShadow = true
    t.add(a, b)
    t.position.set(x, y0, z)
    t.userData.size = s
    t.scale.setScalar(0.001)
    trees.add(t)
  }
  group.add(trees)

  // —— luz ——
  const ambient = new THREE.AmbientLight(0xffffff, 0.25)
  const key = new THREE.DirectionalLight(0xfff3e4, 2.1)
  key.position.set(3, 5.5, 3.2)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 14 })
  key.shadow.radius = 5
  key.shadow.bias = -0.0005
  key.target = group
  const fill = new THREE.DirectionalLight(0xcfdcff, 0.5)
  fill.position.set(-4, 2, 2)
  scene.add(ambient, key, fill)

  let build = 1
  let state = 0
  const apply = () => {
    for (const p of pieces) {
      const k = span(build, p.at - 0.12, p.at + 0.1)
      p.obj.position.copy(p.home)
      p.obj.position.y += (1 - k) * p.lift
      p.obj.rotation.y = (1 - k) * p.spin
      p.obj.visible = k > 0.001
    }
    // el plano se ve más mientras no hay edificio
    planMat.opacity = 0.35 + (1 - span(build, 0.1, 0.8)) * 0.5

    // Interiors: el primer piso y lo de arriba se levantan, aparece el plan amueblado
    const lift = span(state, 0.35, 1) * (1 - span(state, 1.4, 1.9))
    for (const p of pieces) if (p.home.y > y0 + 0.6) p.obj.position.y += lift * 1.15
    interior.scale.setScalar(Math.max(0.001, lift))
    // Landscape: crecen los árboles (y se quedan)
    const grow = span(state, 1.35, 2.1)
    trees.children.forEach((t, i) => {
      const k = span(grow, i * 0.06, 0.55 + i * 0.06)
      t.scale.setScalar(Math.max(0.001, k * t.userData.size))
    })
    // Materials: la cartulina se vuelve hormigón y las losas, roble
    const mat = span(state, 2.35, 3)
    cardConcrete.opacity = mat
    slabOak.opacity = mat
  }

  return {
    group,
    key,
    fill,
    /** 0 = solo el plano … 1 = el edificio armado. */
    setBuild(t) {
      build = clamp01(t)
      apply()
    },
    /** 0 Architecture · 1 Interiors · 2 Landscape · 3 Materials (float). */
    setState(s) {
      state = Math.min(STATE_COUNT - 1, Math.max(0, s))
      apply()
    },
    place(x, y, k) {
      group.position.set(x, y, 0)
      group.scale.setScalar(k)
    },
    dispose() {
      envMap.dispose()
      pmrem.dispose()
      owned.tex.forEach((t) => t.dispose())
      owned.mat.forEach((m) => m.dispose())
      owned.geo.forEach((g) => g.dispose())
      scene.remove(group, ambient, key, fill)
    },
  }
}
