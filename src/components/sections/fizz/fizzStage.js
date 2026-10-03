import * as THREE from 'three'
import { gsap } from '../../../lib/gsap'
import { createFrameBudget, trackPointer } from '../../../lib/motion'
import {
  buildStandInBottle,
  buildStudioEnv,
  createBottle,
  createStageShadow,
  disposeObject,
  loadBottleModel,
  loadHdrEnv,
} from './bottleKit'

/**
 * FIZZ stage — ONE canvas and ONE bottle for the whole run of FIZZ sections.
 *
 * HeroBubbles and FlavorWorlds don't draw their own bottle: whichever mounts
 * first creates this stage (a fixed, full-viewport canvas), the rest join it.
 * Each section is a *layer*: it adds its own meshes (headline, marquee,
 * bubbles, numerals) to the shared scene and asks for a bottle pose; the stage
 * blends the poses and renders one frame. The bottle never changes canvas, so
 * there is no seam, no second bottle and no jump in the stage color.
 *
 * The canvas shows only while one of its sections is on screen, and it rides
 * the edges of those sections in and out, like a regular section would.
 * In the calm version it is a plain absolute canvas inside the first section.
 */

const lerp = (a, b, t) => a + (b - a) * t
const POSE_KEYS = ['x', 'y', 'scale', 'rotZ', 'rotX', 'spinY', 'shadow']
const ANGLE_KEYS = new Set(['rotZ', 'spinY'])

let shared = null

/**
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas  the canvas the caller rendered; used
 *   only if this call creates the stage (check `stage.canvas`)
 * @param {string}  opts.family    font family for the print on the glass
 * @param {boolean} opts.reduced   calm version: static canvas, one frame
 * @param {{bg: string, liquid: string}} opts.flavor
 * @param {string}  opts.brand     wordmark on the glass
 * @param {string} [opts.image]    buyer's own print artwork
 * @param {string} [opts.modelUrl] GLB; without it a lathe bottle stands in
 * @param {string} [opts.envUrl]   studio HDRI
 * @param {string} [opts.dracoPath]
 * @returns {{ stage: object, release: () => void }}
 */
export function acquireFizzStage(opts) {
  if (!shared) shared = { stage: createStage(opts), refs: 0 }
  const entry = shared
  entry.refs += 1
  let released = false
  return {
    stage: entry.stage,
    release() {
      if (released) return
      released = true
      entry.refs -= 1
      if (entry.refs <= 0) {
        entry.stage.dispose()
        if (shared === entry) shared = null
      }
    },
  }
}

const wrap = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2))

function createStage({
  canvas,
  family,
  reduced = false,
  flavor,
  brand,
  image = '',
  modelUrl = '',
  envUrl = '',
  dracoPath = '/fizz/draco/',
}) {
  const fixed = !reduced
  canvas.style.position = fixed ? 'fixed' : 'absolute'
  canvas.style.left = '0'
  canvas.style.top = '0'
  canvas.style.width = '100%'
  // lvh: el canvas cubre la pantalla aunque la barra del navegador se esconda.
  canvas.style.height = '100vh'
  canvas.style.height = '100lvh'
  canvas.style.display = 'block'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '1'
  // Fijo, se muestra cuando una de sus secciones entra; calmo, siempre (un
  // escenario anterior sobre el mismo canvas lo pudo dejar escondido).
  canvas.style.visibility = fixed ? 'hidden' : 'visible'

  let W = canvas.clientWidth || window.innerWidth
  let H = canvas.clientHeight || window.innerHeight
  let narrow = W < 768
  let disposed = false

  const renderer = new THREE.WebGLRenderer({
    canvas,
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
  // The stage color: one live THREE.Color every layer tints (and reads).
  const color = new THREE.Color(flavor.bg)
  scene.background = color
  const envMap = buildStudioEnv(renderer, flavor.bg)
  scene.environment = envMap
  let hdrEnv = null
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
  keyLight.position.set(-3, 4, 6)
  scene.add(keyLight)

  // 1 unidad = 1 px CSS en el plano z = 0: se maqueta como en el DOM.
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 10000)
  scene.add(camera)

  const shadow = createStageShadow(color, { W, H })
  scene.add(shadow.mesh)

  const rig = new THREE.Group()
  const spin = new THREE.Group()
  rig.add(spin)
  rig.visible = false
  scene.add(rig)

  const bottle = createBottle({ narrow, liquid: flavor.liquid, stage: flavor.bg })
  let model = null
  const modelWaiters = []
  const cfg = { brand, image, subtitle: undefined }

  const pointer = reduced ? { x: 0, y: 0 } : trackPointer()
  const look = { x: 0, y: 0 }
  const layers = []
  const poses = new Map()

  const size = () => ({ W, H, narrow, dpr: renderer.getPixelRatio() })

  const paintPrint = () => {
    if (!model || cfg.image) return
    bottle.paintPrint({ family, brand: cfg.brand, subtitle: cfg.subtitle })
  }

  const applyPose = () => {
    const list = [...poses.values()].filter((p) => p.pose).sort((a, b) => a.priority - b.priority)
    if (!list.length) return
    const p = { ...list[0].pose }
    let spinAdd = list[0].pose.spinAdd || 0
    for (let i = 1; i < list.length; i += 1) {
      const { pose, weight } = list[i]
      spinAdd += pose.spinAdd || 0
      if (weight <= 0) continue
      POSE_KEYS.forEach((k) => {
        const from = p[k] ?? 0
        const to = pose[k] ?? 0
        // Los ángulos, por el camino corto: nunca una vuelta de más al mezclar.
        p[k] = ANGLE_KEYS.has(k) ? from + wrap(to - from) * weight : lerp(from, to, weight)
      })
    }
    rig.position.set(p.x, p.y, 0)
    rig.rotation.z = p.rotZ
    rig.rotation.x = p.rotX
    spin.rotation.y = p.spinY + spinAdd
    rig.scale.setScalar(p.scale)
    shadow.place({ x: p.x, y: p.y, scale: p.scale, rotZ: p.rotZ, strength: p.shadow ?? 0.55 })
  }

  const frame = (time, dt) => {
    const ctx = { time, dt, look, ...size() }
    layers.forEach((layer) => layer.update?.(ctx))
    applyPose()
    bottle.update(time)
    renderer.render(scene, camera)
  }

  const renderOnce = () => {
    if (disposed || fixed) return
    frame(0, 0)
  }

  let cameraZ = 1
  const resize = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    W = w
    H = h
    narrow = W < 768
    renderer.setSize(W, H, false)
    shadow.resize(W, H)
    cameraZ = H / (2 * Math.tan((Math.PI / 180) * 15))
    camera.aspect = W / Math.max(H, 1)
    camera.near = cameraZ / 10
    camera.far = cameraZ * 10
    camera.position.z = cameraZ
    camera.updateProjectionMatrix()
    layers.forEach((layer) => layer.resize?.(size()))
  }
  resize()
  const ro = new ResizeObserver(() => {
    if (canvas.clientWidth === W && canvas.clientHeight === H) return
    resize()
    renderOnce()
  })
  ro.observe(canvas)

  const mountModel = (object) => {
    model = object
    bottle.dress(model, {
      image: cfg.image,
      isDisposed: () => disposed,
      onImage: renderOnce,
    })
    paintPrint()
    spin.add(model)
    rig.visible = true
    modelWaiters.splice(0).forEach((fn) => fn())
    renderOnce()
  }
  if (modelUrl) {
    loadBottleModel(modelUrl, dracoPath)
      .then((object) => {
        if (disposed) return disposeObject(object)
        mountModel(object)
      })
      .catch(() => {
        console.warn(`FIZZ: could not load model "${modelUrl}"`)
        if (!disposed) mountModel(buildStandInBottle())
      })
  } else {
    mountModel(buildStandInBottle())
  }
  if (envUrl) {
    loadHdrEnv(renderer, envUrl)
      .then((env) => {
        if (disposed) return env.dispose()
        hdrEnv = env
        scene.environment = env
        scene.environmentRotation.set(0, Math.PI * 0.55, 0)
        renderOnce()
      })
      .catch(() => {})
  }
  document.fonts?.ready.then(() => {
    if (disposed) return
    paintPrint()
    layers.forEach((layer) => layer.fontsReady?.())
    renderOnce()
  })

  /**
   * The canvas follows the sections that use it: it shows while any of them
   * is on screen, slides in under the first one's top edge and leaves with
   * the last one's bottom edge, so it reads like part of the page.
   */
  const placeCanvas = () => {
    if (!fixed) return true
    const vh = window.innerHeight
    let top = Infinity
    let bottom = -Infinity
    let any = false
    // A layer with `coveredAtEnd` doesn't carry the canvas away with its bottom
    // edge: the next section slides over the canvas and hides the bottle.
    let covered = false
    layers.forEach((layer) => {
      const r = layer.el.getBoundingClientRect()
      if (r.bottom <= 0 || r.top >= vh) return
      any = true
      top = Math.min(top, r.top)
      if (r.bottom > bottom) {
        bottom = r.bottom
        covered = !!layer.coveredAtEnd
      }
    })
    canvas.style.visibility = any ? 'visible' : 'hidden'
    if (!any) return false
    let offset = 0
    if (top > 0) offset = top
    else if (bottom < H && !covered) offset = bottom - H
    canvas.style.transform = offset ? `translate3d(0, ${offset}px, 0)` : ''
    // Covered at the end: the canvas stops where the section does, so it never
    // paints over what comes after (the next section hides the rest).
    const cut = covered && bottom < H ? Math.max(0, H - bottom) : 0
    canvas.style.clipPath = cut ? `inset(0 0 ${cut}px 0)` : ''
    return true
  }

  // Si el teléfono no llega a ~30 cuadros (vidrio con transmisión, DPR alto),
  // baja la resolución de a escalones. En un equipo rápido no cambia nada.
  const budget = createFrameBudget({
    dpr,
    apply: (value) => {
      renderer.setPixelRatio(value)
      resize()
    },
  })

  const tick = (time, deltaMs) => {
    if (disposed) return
    // Si la sección que traía el canvas se desmontó y otra sigue usándolo.
    if (!canvas.isConnected) document.body.appendChild(canvas)
    if (!placeCanvas()) return
    const dt = Math.min(deltaMs / 1000, 0.05)
    camera.position.x += (pointer.x * W * 0.04 - camera.position.x) * 0.03
    camera.position.y += (-pointer.y * H * 0.04 - camera.position.y) * 0.03
    // Lo que la botella usa del puntero, suavizado: un dedo aparece de golpe
    // (touchstart) y se va de golpe (touchend), y sin esto daba un salto.
    const follow = 1 - Math.exp(-dt * 12)
    look.x += (pointer.x - look.x) * follow
    look.y += (pointer.y - look.y) * follow
    frame(time, dt)
    budget.tick(deltaMs)
  }
  if (fixed) gsap.ticker.add(tick)

  return {
    canvas,
    scene,
    camera,
    color,
    bottle,
    family,
    reduced,
    size,
    renderOnce,

    /** Adds a layer `{ el, update(ctx), resize(size), fontsReady() }`. */
    addLayer(layer) {
      layers.push(layer)
      layer.resize?.(size())
      return () => {
        const i = layers.indexOf(layer)
        if (i >= 0) layers.splice(i, 1)
      }
    },

    /**
     * A bottle pose from one layer. Poses blend in `priority` order: the
     * lowest is the base, every next one is mixed in by its `weight`.
     * `spinAdd` is summed on top (a full extra turn, for instance).
     */
    setPose(id, pose, weight = 1, priority = 0) {
      const p = { ...pose, rotZ: wrap(pose.rotZ), spinY: wrap(pose.spinY) }
      poses.set(id, { pose: p, weight, priority })
    },
    clearPose(id) {
      poses.delete(id)
    },

    /** Brand + stage colors from the section that sets the look (the hero). */
    configure({ flavor: next, brand: nextBrand, image: nextImage = '' }) {
      if (next) {
        color.set(next.bg)
        bottle.colors.tint.set(next.liquid)
        bottle.colors.veil.set(next.bg).lerp(new THREE.Color(0xffffff), 0.6)
        bottle.colors.seal.set(next.bg).multiplyScalar(0.5)
      }
      if (nextBrand !== undefined) cfg.brand = nextBrand
      cfg.image = nextImage
      paintPrint()
      renderOnce()
    },

    /** The small line under the wordmark (a flavor name, or the default). */
    setSubtitle(subtitle) {
      if (cfg.subtitle === subtitle) return
      cfg.subtitle = subtitle
      paintPrint()
    },

    /** Runs `fn` once the bottle model is on stage. */
    onModel(fn) {
      if (model) fn()
      else modelWaiters.push(fn)
    },

    dispose() {
      disposed = true
      gsap.ticker.remove(tick)
      ro.disconnect()
      pointer.dispose?.()
      shadow.dispose()
      bottle.dispose()
      if (model) disposeObject(model)
      envMap.dispose()
      hdrEnv?.dispose()
      renderer.dispose()
      canvas.style.visibility = 'hidden'
      canvas.style.transform = ''
      canvas.style.clipPath = ''
    },
  }
}
