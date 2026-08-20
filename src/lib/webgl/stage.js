import * as THREE from 'three'

/**
 * Minimal WebGL stage: renderer + scene + camera + resize + rAF loop.
 * Sections own the scene content; the stage owns lifecycle.
 */
export function createWebGLStage({
  canvas,
  mount,
  fov = 28,
  near = 0.01,
  far = 40,
  cameraZ = 2,
  clearColor = 0x000000,
  alpha = false,
  maxDpr = 2,
  observeMount = true,
}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  if (!alpha) renderer.setClearColor(clearColor, 1)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(fov, 1, near, far)
  camera.position.set(0, 0, cameraZ)

  let lastW = 0
  let lastH = 0

  const resize = () => {
    const w = Math.round(mount?.clientWidth || canvas.clientWidth)
    const h = Math.round(mount?.clientHeight || canvas.clientHeight)
    if (!w || !h) return
    if (w === lastW && h === lastH) return
    lastW = w
    lastH = h
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  let raf = 0
  let last = performance.now()
  let onFrame = null

  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    onFrame?.(dt)
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }

  const ro = observeMount && mount ? new ResizeObserver(resize) : null
  ro?.observe(mount)
  if (!observeMount) window.addEventListener('resize', resize)
  resize()

  return {
    scene,
    camera,
    renderer,
    resize,
    start(frameFn) {
      onFrame = frameFn
      last = performance.now()
      if (!raf) raf = requestAnimationFrame(tick)
    },
    stop() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      onFrame = null
    },
    dispose() {
      this.stop()
      ro?.disconnect()
      window.removeEventListener('resize', resize)
      renderer.dispose()
    },
  }
}
