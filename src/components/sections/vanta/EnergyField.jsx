import { useRef } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP } from '../../../lib/gsap'

/**
 * EnergyField — sparse cyan/violet particle cloud behind the hero type.
 * Desktop only; reduced motion skips the canvas.
 */
export default function EnergyField() {
  const canvasRef = useRef(null)

  useGSAP(
    () => {
      const canvas = canvasRef.current
      if (!canvas) return undefined
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return undefined
      }
      if (window.matchMedia('(max-width: 767px)').matches) return undefined

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: true,
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40)
      camera.position.z = 8

      const count = 520
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const cA = new THREE.Color('#5b4cff')
      const cB = new THREE.Color('#3dffc5')
      for (let i = 0; i < count; i += 1) {
        positions[i * 3] = (Math.random() - 0.5) * 14
        positions[i * 3 + 1] = (Math.random() - 0.5) * 8
        positions[i * 3 + 2] = (Math.random() - 0.5) * 6
        const c = cA.clone().lerp(cB, Math.random())
        colors[i * 3] = c.r
        colors[i * 3 + 1] = c.g
        colors[i * 3 + 2] = c.b
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      const mat = new THREE.PointsMaterial({
        size: 0.045,
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
      const points = new THREE.Points(geo, mat)
      scene.add(points)

      const fit = () => {
        const { clientWidth: w, clientHeight: h } = canvas
        if (!w || !h) return
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      fit()
      const ro = new ResizeObserver(fit)
      ro.observe(canvas)

      const state = { spin: 0 }
      gsap.to(state, {
        spin: 1,
        repeat: -1,
        duration: 28,
        ease: 'none',
        onUpdate: () => {
          points.rotation.y = state.spin * Math.PI * 2
          points.rotation.x = Math.sin(state.spin * Math.PI * 2) * 0.08
          renderer.render(scene, camera)
        },
      })

      return () => {
        ro.disconnect()
        geo.dispose()
        mat.dispose()
        renderer.dispose()
      }
    },
    { dependencies: [] },
  )

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}
