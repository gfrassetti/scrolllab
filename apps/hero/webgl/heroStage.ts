import * as THREE from 'three'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const smoothstep = (t: number) => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const damp = (cur: number, tgt: number, l: number, dt: number) =>
  cur + (tgt - cur) * (1 - Math.exp(-l * dt))

/**
 * Hero stage — one Three.js plane holding the Kai portrait. It IS the hero and
 * it IS the card: `setDock(0→1)` shrinks the plane, slides it to the lower-left,
 * tilts it, and crops the texture (repeat/offset) from the full 4:3 art down to
 * a 3:4 face+bust window. No DOM swap — the same mesh transforms through 3D.
 *
 * `cardScreenRect()` returns where that plane lands on screen (fractions), so
 * the DOM overlay (label) can pin to it.
 */

// texture crop for the docked "face + bust" window, in art UV (0-1, y from top)
const FACE_CROP = { x: 0.27, y: 0.02, w: 0.46, h: 0.62 } // ~3:4

export function createHeroStage(canvas: HTMLCanvasElement, artUrl: string) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(0x08080c, 1)

  const scene = new THREE.Scene()
  const DIST = 2.6
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 40)
  camera.position.set(0, 0, DIST)

  const tex = new THREE.TextureLoader().load(artUrl, () => {
    fit()
    render()
  })
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
  )
  scene.add(mesh)

  // full-bleed cover-fit state (recomputed on resize)
  const fullScale = new THREE.Vector3(1, 1, 1)
  let fullY = 0
  let artAspect = 4 / 3
  let viewW = 3
  let viewH = 1.4

  function fit() {
    const w = window.innerWidth
    const h = window.innerHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    const iw = (tex.image as HTMLImageElement)?.width || 1600
    const ih = (tex.image as HTMLImageElement)?.height || 1200
    artAspect = iw / ih
    const vFov = (camera.fov * Math.PI) / 180
    viewH = 2 * Math.tan(vFov / 2) * DIST
    viewW = viewH * camera.aspect
    let planeH: number
    if (viewW / viewH > artAspect) {
      planeH = viewW / artAspect
      fullScale.set(viewW, planeH, 1)
    } else {
      planeH = viewH
      fullScale.set(viewH * artAspect, planeH, 1)
    }
    const over = 1.14
    fullScale.multiplyScalar(over)
    planeH *= over
    const slackY = Math.max(0, (planeH - viewH) / 2)
    fullY = Math.min(Math.max(-(0.5 - 0.6) * planeH, -slackY), slackY)
  }

  const ptr = { x: 0.5, y: 0.5 }
  let th = 0
  let ph = 0
  const MAX = THREE.MathUtils.degToRad(7)
  const onMove = (e: PointerEvent) => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    ptr.x = e.clientX / window.innerWidth
    ptr.y = e.clientY / window.innerHeight
  }
  window.addEventListener('pointermove', onMove)
  const onResize = () => {
    fit()
    render()
  }
  window.addEventListener('resize', onResize)

  let dockAmt = 0
  let raf = 0
  let lastT = performance.now()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function render() {
    renderer.render(scene, camera)
  }

  // the docked card, in world units
  function cardWorld() {
    const cardH = viewH * 0.82 // ~82% of the frustum height
    const cardW = cardH * (FACE_CROP.w / FACE_CROP.h) // 3:4
    const marginX = viewW * 0.05
    const marginY = viewH * 0.09
    const x = -viewW / 2 + marginX + cardW / 2
    const y = -viewH / 2 + marginY + cardH / 2
    return { x, y, w: cardW, h: cardH }
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - lastT) / 1000)
    lastT = now
    const d = smoothstep(dockAmt)
    const flip = smoothstep(clamp01((dockAmt - 0.82) / 0.18))

    const amp = 1 - d * 0.94
    if (!reduced) {
      const tTh = THREE.MathUtils.mapLinear(ptr.x, 0, 1, MAX, -MAX) * amp
      const tPh = THREE.MathUtils.mapLinear(ptr.y, 0, 1, MAX, -MAX) * amp
      th = damp(th, tTh, 3, dt)
      ph = damp(ph, tPh, 3, dt)
      camera.position.setFromSphericalCoords(DIST, ph + Math.PI / 2, th)
      camera.lookAt(0, 0, 0)
    }

    const card = cardWorld()
    mesh.scale.set(lerp(fullScale.x, card.w, d), lerp(fullScale.y, card.h, d), 1)
    mesh.position.set(lerp(0, card.x, d), lerp(fullY, card.y, d), lerp(0, 0.15, d))
    mesh.rotation.y = -flip * 0.16

    // crop the texture from the full art → the face window
    tex.repeat.set(lerp(1, FACE_CROP.w, d), lerp(1, FACE_CROP.h, d))
    tex.offset.set(lerp(0, FACE_CROP.x, d), lerp(0, 1 - FACE_CROP.y - FACE_CROP.h, d))

    render()
    raf = requestAnimationFrame(frame)
  }

  fit()
  render()
  raf = requestAnimationFrame(frame)

  return {
    setDock(v: number) {
      dockAmt = clamp01(v)
    },
    /** where the docked card sits on screen, as fractions {x,y,w,h} of the viewport */
    cardScreenRect() {
      const card = cardWorld()
      return {
        x: (card.x - card.w / 2 + viewW / 2) / viewW,
        y: (viewH / 2 - (card.y + card.h / 2)) / viewH,
        w: card.w / viewW,
        h: card.h / viewH,
      }
    },
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', onResize)
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
      tex.dispose()
      renderer.dispose()
    },
  }
}
