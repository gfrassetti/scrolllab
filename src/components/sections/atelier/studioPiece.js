import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * studioPiece — the studio's own object, drawn in code: a low bench (a slab on
 * two solid legs) with a vessel on top. Hero and Services share it.
 *
 * The bench can be shown in four materials — travertine, oak, linen, ink — and
 * `setMaterial(s)` moves between them with a sweep, so it can be scrubbed with
 * the scroll and run backwards: `s` is a float, 0 = travertine … 3 = ink, and
 * each step between two whole numbers is one sweep across the piece.
 *
 * `setExplode(e)` pulls it apart like an assembly drawing: the slab lifts, the
 * legs slide out, the vessel rises.
 */

const FLOOR = -0.7
const LEG = { w: 0.62, h: 0.78, d: 1.05, x: 0.85 }
const TOP = { w: 2.7, h: 0.34, d: 1.2 }
const TOP_Y = FLOOR + LEG.h + TOP.h / 2

function rng(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SIZE = 512

function canvas() {
  const c = document.createElement('canvas')
  c.width = SIZE
  c.height = SIZE
  return c
}

/** Warm stone with horizontal strata and the small pits travertine has. */
function travertine() {
  const r = rng(11)
  const c = canvas()
  const g = c.getContext('2d')
  g.fillStyle = '#c9b999'
  g.fillRect(0, 0, SIZE, SIZE)
  for (let y = 0; y < SIZE; ) {
    const h = 3 + r() * 13
    const l = 176 + r() * 40
    g.fillStyle = `rgba(${l},${l - 10},${l - 32},${0.35 + r() * 0.35})`
    g.fillRect(0, y, SIZE, h)
    y += h
  }
  for (let i = 0; i < 260; i += 1) {
    g.fillStyle = `rgba(112,92,66,${0.25 + r() * 0.4})`
    g.beginPath()
    g.ellipse(r() * SIZE, r() * SIZE, 3 + r() * 20, 1 + r() * 2.6, 0, 0, Math.PI * 2)
    g.fill()
  }
  for (let i = 0; i < 6000; i += 1) {
    g.fillStyle = `rgba(${r() < 0.5 ? '255,250,240' : '90,76,58'},${r() * 0.12})`
    g.fillRect(r() * SIZE, r() * SIZE, 1.4, 1.4)
  }
  return c
}

/** Oak: long wavering grain. */
function oak() {
  const r = rng(23)
  const c = canvas()
  const g = c.getContext('2d')
  g.fillStyle = '#b3845a'
  g.fillRect(0, 0, SIZE, SIZE)
  for (let i = 0; i < 220; i += 1) {
    const x0 = r() * SIZE
    const amp = 2 + r() * 9
    const f = 0.01 + r() * 0.02
    g.strokeStyle = r() < 0.7 ? `rgba(92,56,28,${0.1 + r() * 0.22})` : `rgba(226,178,124,${0.1 + r() * 0.2})`
    g.lineWidth = 0.8 + r() * 2.4
    g.beginPath()
    for (let y = 0; y <= SIZE; y += 8) {
      const x = x0 + Math.sin(y * f + i) * amp
      if (y === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
  }
  for (let i = 0; i < 4000; i += 1) {
    g.fillStyle = `rgba(60,36,18,${r() * 0.1})`
    g.fillRect(r() * SIZE, r() * SIZE, 1, 2.4)
  }
  return c
}

/** Linen: a fine woven grid with a few thicker threads. */
function linen() {
  const r = rng(37)
  const c = canvas()
  const g = c.getContext('2d')
  g.fillStyle = '#cfc7b4'
  g.fillRect(0, 0, SIZE, SIZE)
  for (let i = 0; i < SIZE; i += 2) {
    g.fillStyle = `rgba(80,70,52,${0.05 + r() * 0.1})`
    g.fillRect(0, i, SIZE, 1)
    g.fillStyle = `rgba(255,252,244,${0.05 + r() * 0.1})`
    g.fillRect(i, 0, 1, SIZE)
  }
  for (let i = 0; i < 70; i += 1) {
    g.fillStyle = `rgba(${r() < 0.5 ? '255,250,236' : '110,98,76'},${0.12 + r() * 0.16})`
    if (r() < 0.5) g.fillRect(0, r() * SIZE, SIZE, 1 + r() * 2)
    else g.fillRect(r() * SIZE, 0, 1 + r() * 2, SIZE)
  }
  return c
}

/** Ink: near-black lacquer with a fine paper grain. */
function ink() {
  const r = rng(53)
  const c = canvas()
  const g = c.getContext('2d')
  g.fillStyle = '#1b1a1c'
  g.fillRect(0, 0, SIZE, SIZE)
  for (let i = 0; i < 9000; i += 1) {
    g.fillStyle = `rgba(255,255,255,${r() * 0.06})`
    g.fillRect(r() * SIZE, r() * SIZE, 1, 1)
  }
  for (let i = 0; i < 40; i += 1) {
    g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.04})`
    g.fillRect(0, r() * SIZE, SIZE, 1)
  }
  return c
}

const RECIPES = [
  { make: travertine, rough: 0.82, bump: 1.4 },
  { make: oak, rough: 0.55, bump: 0.9 },
  { make: linen, rough: 1, bump: 1.3 },
  { make: ink, rough: 0.32, bump: 0.25 },
]

export const MATERIAL_COUNT = RECIPES.length

function vesselGeometry() {
  const pts = [
    [0.0, 0.0],
    [0.15, 0.0],
    [0.2, 0.05],
    [0.33, 0.27],
    [0.36, 0.42],
    [0.27, 0.62],
    [0.13, 0.72],
    [0.12, 0.8],
    [0.17, 0.86],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const smooth = new THREE.SplineCurve(pts).getPoints(48)
  smooth[0].x = 0
  return new THREE.LatheGeometry(smooth, 48)
}

function bowlGeometry() {
  const pts = [
    [0.0, 0.0],
    [0.16, 0.0],
    [0.3, 0.07],
    [0.42, 0.2],
    [0.44, 0.24],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const smooth = new THREE.SplineCurve(pts).getPoints(32)
  smooth[0].x = 0
  return new THREE.LatheGeometry(smooth, 48)
}

function shadowTexture() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62)
  grad.addColorStop(0, 'rgba(0,0,0,0.65)')
  grad.addColorStop(0.55, 'rgba(0,0,0,0.25)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {{ tint?: string|number, vessel?: string|number }} [opts]
 */
export function createStudioPiece(renderer, scene, { tint, vessel } = {}) {
  renderer.localClippingEnabled = true

  // soft studio reflections: stone and lacquer read as stone and lacquer
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const envMap = pmrem.fromScene(room, 0.04).texture
  scene.environment = envMap
  scene.environmentIntensity = 0.55

  const textures = RECIPES.map((recipe) => {
    const t = new THREE.CanvasTexture(recipe.make())
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    return t
  })
  // one plane for the old material, one for the new: they meet on the sweep front
  const clipOld = new THREE.Plane(new THREE.Vector3(-1, -0.2, 0).normalize(), 0)
  const clipNew = new THREE.Plane(new THREE.Vector3(1, 0.2, 0).normalize(), 0)
  const makeMaterial = (i, clipping) =>
    new THREE.MeshStandardMaterial({
      map: textures[i],
      bumpMap: textures[i],
      bumpScale: RECIPES[i].bump,
      roughness: RECIPES[i].rough,
      metalness: 0,
      color: tint || 0xffffff,
      clippingPlanes: clipping,
      clipShadows: false,
    })
  const matsOld = RECIPES.map((_, i) => makeMaterial(i, []))
  const matsNew = RECIPES.map((_, i) => makeMaterial(i, [clipNew]))
  const matsOldClipped = RECIPES.map((_, i) => makeMaterial(i, [clipOld]))

  const topGeo = new RoundedBoxGeometry(TOP.w, TOP.h, TOP.d, 4, 0.07)
  const legGeo = new RoundedBoxGeometry(LEG.w, LEG.h, LEG.d, 4, 0.06)
  const group = new THREE.Group()

  // each part exists twice (the material being left, the material arriving)
  const make = (geo) => {
    const a = new THREE.Mesh(geo, matsOld[0])
    const b = new THREE.Mesh(geo, matsNew[1])
    b.visible = false
    const holder = new THREE.Group()
    holder.add(a, b)
    return { holder, a, b }
  }
  const top = make(topGeo)
  const legL = make(legGeo)
  const legR = make(legGeo)
  top.holder.position.y = TOP_Y
  legL.holder.position.set(-LEG.x, FLOOR + LEG.h / 2, 0)
  legR.holder.position.set(LEG.x, FLOOR + LEG.h / 2, 0)
  const parts = [top, legL, legR]
  group.add(top.holder, legL.holder, legR.holder)

  const vesselMat = new THREE.MeshStandardMaterial({ color: vessel || 0x2b2723, roughness: 0.48, metalness: 0.05 })
  const vesselGeo = vesselGeometry()
  const bowlGeo = bowlGeometry()
  const vase = new THREE.Mesh(vesselGeo, vesselMat)
  const bowl = new THREE.Mesh(bowlGeo, vesselMat)
  const topSurface = TOP_Y + TOP.h / 2
  vase.position.set(-0.6, topSurface, 0.1)
  bowl.position.set(0.55, topSurface, -0.08)
  group.add(vase, bowl)

  scene.add(group)

  // a soft contact shadow on the floor (the group spins, the shadow doesn't)
  const shadowTex = shadowTexture()
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.7 }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = FLOOR + 0.005
  shadow.scale.set(4.4, 2.6, 1)
  scene.add(shadow)

  scene.add(new THREE.AmbientLight(0xffffff, 0.25))
  const key = new THREE.DirectionalLight(0xfff1e0, 1.5)
  key.position.set(3.5, 5, 4)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0x9fb4ff, 0.35)
  fill.position.set(-4, 1.5, 2)
  scene.add(fill)

  let current = -1
  const apply = (from, to, sweep) => {
    const sweeping = sweep > 0.001 && sweep < 0.999 && to !== from
    for (const part of parts) {
      part.a.material = sweeping ? matsOldClipped[from] : matsOld[sweep >= 0.999 ? to : from]
      part.b.material = matsNew[to]
      part.b.visible = sweeping
    }
    if (sweeping) {
      const f = THREE.MathUtils.lerp(-2.1, 2.1, sweep)
      clipOld.constant = -f
      clipNew.constant = f
    }
  }

  return {
    group,
    parts: { top: top.holder, legL: legL.holder, legR: legR.holder, vase, bowl },
    key,
    fill,

    /** s: 0 = travertine … 3 = ink. Between two whole numbers, a sweep (in the last 45 %). */
    setMaterial(s) {
      const clamped = THREE.MathUtils.clamp(s, 0, MATERIAL_COUNT - 1)
      const from = Math.min(Math.floor(clamped), MATERIAL_COUNT - 2)
      const t = clamped - from
      const sweep = THREE.MathUtils.smoothstep(t, 0.55, 1)
      const to = from + 1
      const key2 = `${from}:${sweep.toFixed(3)}`
      if (key2 === current) return
      current = key2
      apply(from, to, sweep)
    },

    /** Puts the piece (and its shadow on the floor) at x, y in the scene, at scale k. */
    place(x, y, k) {
      group.position.set(x, y, 0)
      group.scale.setScalar(k)
      shadow.position.set(x, y + FLOOR * k + 0.005, 0)
      shadow.scale.set(4.4 * k, 2.6 * k, 1)
    },

    /** e: 0 = assembled … 1 = pulled apart. */
    setExplode(e) {
      top.holder.position.y = TOP_Y + e * 0.85
      legL.holder.position.x = -LEG.x - e * 0.6
      legR.holder.position.x = LEG.x + e * 0.6
      vase.position.y = topSurface + e * 1.5
      bowl.position.y = topSurface + e * 1.1
      shadow.material.opacity = 0.7 * (1 - e * 0.45)
    },

    dispose() {
      envMap.dispose()
      pmrem.dispose()
      textures.forEach((t) => t.dispose())
      ;[...matsOld, ...matsNew, ...matsOldClipped, vesselMat, shadow.material].forEach((m) => m.dispose())
      ;[topGeo, legGeo, vesselGeo, bowlGeo, shadow.geometry].forEach((g) => g.dispose())
      shadowTex.dispose()
      scene.remove(group, shadow, key, fill)
    },
  }
}
