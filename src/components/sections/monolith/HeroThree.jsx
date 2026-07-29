import { useRef } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

/**
 * HeroThree — brutalist hero with a Three.js wireframe monolith
 * (icosahedron + klein-blue point cloud) spinning behind giant
 * condensed type. The object tilts toward the pointer and keeps
 * rotating with scroll. Renders a single static frame under
 * reduced motion.
 */
export default function HeroThree({
  title = 'MONOLITH',
  subtitle = 'A brutalist storytelling template — placeholder object, real motion',
  meta = 'System v1.0 — ©2026',
  hint = 'Scroll',
}) {
  const root = useRef(null)
  const canvasRef = useRef(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      // —— Three.js scene ——
      const canvas = canvasRef.current
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
      camera.position.z = 9

      const geometry = new THREE.IcosahedronGeometry(3.4, 1)
      const wireframe = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ wireframe: true, color: 0x101010 }),
      )
      const points = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({ size: 0.09, color: 0x2b3cff }),
      )
      const group = new THREE.Group()
      group.add(wireframe, points)
      group.rotation.set(0.4, 0.6, 0)
      scene.add(group)

      const pointer = { x: 0, y: 0 }

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = root.current
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      resize()

      const render = () => renderer.render(scene, camera)

      const onPointerMove = (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1
        pointer.y = (e.clientY / window.innerHeight) * 2 - 1
      }

      const tick = () => {
        group.rotation.y += 0.0022
        group.rotation.x += (pointer.y * 0.35 + 0.4 - group.rotation.x) * 0.04
        group.rotation.z += (pointer.x * 0.25 - group.rotation.z) * 0.04
        render()
      }

      window.addEventListener('resize', resize)

      if (reduced) {
        render()
      } else {
        window.addEventListener('pointermove', onPointerMove)
        gsap.ticker.add(tick)

        gsap.to(group.scale, {
          x: 1.5,
          y: 1.5,
          z: 1.5,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        })

        // —— Type ——
        const split = new SplitText('[data-mono-title]', {
          type: 'chars',
          mask: 'chars',
        })
        gsap.from(split.chars, {
          yPercent: 110,
          duration: 1.1,
          ease: 'power4.out',
          stagger: 0.045,
          delay: 0.2,
        })
        gsap.from('[data-mono-fade]', {
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          delay: 0.9,
        })
      }

      return () => {
        window.removeEventListener('resize', resize)
        window.removeEventListener('pointermove', onPointerMove)
        gsap.ticker.remove(tick)
        geometry.dispose()
        wireframe.material.dispose()
        points.material.dispose()
        renderer.dispose()
      }
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="relative flex h-svh flex-col justify-between overflow-hidden border-b-2 border-carbon px-5 pt-24 pb-5 md:px-8"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />

      <div className="pointer-events-none relative flex h-full flex-col justify-between">
        <p
          data-mono-fade
          className="max-w-70 font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs"
        >
          {subtitle}
        </p>

        <h1
          data-mono-title
          className="font-anton text-[19vw] leading-[0.85] tracking-[0.01em] uppercase select-none"
        >
          {title}
        </h1>

        <div className="flex items-end justify-between border-t-2 border-carbon pt-3 font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
          <p data-mono-fade>{meta}</p>
          <p data-mono-fade className="bg-carbon px-2 py-1 text-concrete">
            {hint} <span aria-hidden="true">↓</span>
          </p>
        </div>
      </div>
    </section>
  )
}
