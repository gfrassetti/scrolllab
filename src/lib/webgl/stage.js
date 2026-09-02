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
  // Un GSAP scrub anima width/height del contenedor por cada píxel de scroll
  // (p.ej. la card del hero achicándose): el tamaño real cambia en fracciones
  // de píxel todo el tiempo. Cada resize real reasigna el framebuffer de la
  // GPU — no es gratis. Este umbral evita reaplicar por diferencias de 1-2px
  // que nadie nota, sin tocar el cover-fit (que sigue recalculando fino cada
  // vez que sí se aplica).
  const RESIZE_THRESHOLD = 4

  const resize = () => {
    const w = Math.round(mount?.clientWidth || canvas.clientWidth)
    const h = Math.round(mount?.clientHeight || canvas.clientHeight)
    if (!w || !h) return
    if (Math.abs(w - lastW) < RESIZE_THRESHOLD && Math.abs(h - lastH) < RESIZE_THRESHOLD) return
    lastW = w
    lastH = h
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    // `setSize` reasigna el framebuffer de la GPU — eso LIMPIA el buffer a
    // negro en el acto. Normalmente no se nota: el próximo tick de rAF
    // repinta unos ms después. Pero si el hilo principal está ocupado (un
    // salto grande de scroll, ScrollTrigger recalculando el pin) ese "próximo
    // tick" puede tardar cientos de ms, y ahí se ve el negro — no es
    // aleatorio, es la ventana entre "buffer limpio" y "próximo repintado".
    // Forzar un render acá mismo cierra esa ventana a cero: puede quedar un
    // frame estirado (el mesh todavía sin refit para el aspect nuevo), pero
    // nunca un frame vacío.
    renderer.render(scene, camera)
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
