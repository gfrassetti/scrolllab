import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import heroFace from './assets/hero-face.jpg'

/**
 * HeroCanvas — KPR camera recipe on a WebGL plane (no their GLTF).
 * PerspectiveCamera FOV 28, spherical orbit, MathUtils.damp lambda 3.
 * ScrollSmoother is GSAP Club; Lenis already drives ScrollTrigger here.
 */
export default function HeroCanvas({ img = heroFace }) {
  const wrap = useRef(null)

  useEffect(() => {
    const root = wrap.current
    const canvas = root?.querySelector('canvas')
    if (!root || !canvas) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    renderer.setClearColor(0x0a0810, 1)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 40)
    camera.position.set(0, 0, 2)
    const lookAt = new THREE.Vector3(0, 0, 0)

    const tex = new THREE.TextureLoader().load(img, () => cover())
    tex.colorSpace = THREE.SRGBColorSpace
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: tex }),
    )
    scene.add(mesh)

    const cover = () => {
      const { clientWidth: w, clientHeight: h } = root
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      const dist = camera.position.length()
      const vFov = (camera.fov * Math.PI) / 180
      const viewH = 2 * Math.tan(vFov / 2) * dist
      const viewW = viewH * camera.aspect
      const imgW = tex.image?.width || 1600
      const imgH = tex.image?.height || 2000
      const planeAspect = imgW / imgH
      if (viewW / viewH > planeAspect) {
        mesh.scale.set(viewW, viewW / planeAspect, 1)
      } else {
        mesh.scale.set(viewH * planeAspect, viewH, 1)
      }
    }

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    let theta = 0
    let phi = 0
    const max = THREE.MathUtils.degToRad(10)
    const onMove = (event) => {
      if (window.matchMedia('(pointer: coarse)').matches) return
      pointer.x = event.clientX
      pointer.y = event.clientY
    }
    window.addEventListener('pointermove', onMove)

    let last = performance.now()
    let raf = 0
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const vw = window.innerWidth
      const vh = window.innerHeight
      const tTheta = THREE.MathUtils.mapLinear(pointer.x, 0, vw, max, -max)
      const tPhi = THREE.MathUtils.mapLinear(pointer.y, 0, vh, max, -max)
      theta = THREE.MathUtils.damp(theta, tTheta, 3, dt)
      phi = THREE.MathUtils.damp(phi, tPhi, 3, dt)
      camera.position.setFromSphericalCoords(2, phi + Math.PI / 2, theta)
      camera.lookAt(lookAt)
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    cover()
    raf = requestAnimationFrame(tick)
    const ro = new ResizeObserver(cover)
    ro.observe(root)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      tex.dispose()
      mesh.geometry.dispose()
      mesh.material.dispose()
      renderer.dispose()
    }
  }, [img])

  return (
    <div data-hero-gl className="absolute inset-0 z-[8]" ref={wrap}>
      <canvas className="block h-full w-full" />
    </div>
  )
}
