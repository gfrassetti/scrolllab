import { useRef } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import ScrollFog from './ScrollFog'

/**
 * HeroMeaning — Trionn-inspired hero: blur text reveal + WebGL emblem
 * that drifts with pointer and scrubs apart on scroll.
 */
export default function HeroMeaning({
  line1 = 'Your headline',
  line2 = 'goes here.',
  hint = 'Scroll — the emblem reacts',
  meta = 'Placeholder meta — ©2026',
}) {
  const root = useRef(null)
  const canvasRef = useRef(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      const split = new SplitText('[data-atelier-hero]', {
        type: 'chars',
        mask: 'chars',
      })
      gsap.set(split.chars, { autoAlpha: 0, filter: 'blur(12px)' })
      gsap.to(split.chars, {
        autoAlpha: 1,
        filter: 'blur(0px)',
        duration: 0.85,
        stagger: { each: 0.035, from: 'random' },
        ease: 'power2.out',
        delay: 0.2,
      })

      // —— Three emblem ——
      const canvas = canvasRef.current
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50)
      camera.position.z = 6

      const group = new THREE.Group()
      const mat = new THREE.MeshStandardMaterial({
        color: 0x2a2d33,
        roughness: 0.55,
        metalness: 0.35,
      })
      const core = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), mat)
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.35, 0.08, 12, 64),
        new THREE.MeshStandardMaterial({
          color: 0xc8d0dc,
          roughness: 0.3,
          metalness: 0.7,
        }),
      )
      ring.rotation.x = Math.PI / 2.4
      group.add(core, ring)
      scene.add(group)
      scene.add(new THREE.AmbientLight(0xffffff, 0.55))
      const key = new THREE.DirectionalLight(0xffffff, 1.1)
      key.position.set(3, 4, 5)
      scene.add(key)

      const mouse = { x: 0, y: 0 }
      const onPointer = (e) => {
        const r = root.current.getBoundingClientRect()
        mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1
        mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1)
      }
      window.addEventListener('pointermove', onPointer)

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = canvas
        renderer.setSize(w, h, false)
        camera.aspect = w / Math.max(h, 1)
        camera.updateProjectionMatrix()
      }
      resize()
      window.addEventListener('resize', resize)

      let explode = 0
      const st = gsap.to(
        {},
        {
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
            onUpdate: (self) => {
              explode = self.progress
            },
          },
        },
      )

      const tick = () => {
        const spin = reduced ? 0.002 : 0.008
        group.rotation.y += spin
        group.rotation.x += (mouse.y * 0.35 - group.rotation.x) * 0.06
        group.rotation.y += (mouse.x * 0.35 - group.rotation.y) * 0.04
        core.position.z = explode * 0.8
        ring.scale.setScalar(1 + explode * 0.55)
        ring.material.opacity = 1 - explode * 0.7
        ring.material.transparent = true
        group.scale.setScalar(1 + explode * 0.35)
        renderer.render(scene, camera)
      }
      gsap.ticker.add(tick)

      gsap.from('[data-atelier-meta]', {
        opacity: 0,
        y: 16,
        duration: 0.9,
        delay: 0.9,
        stagger: 0.1,
      })

      return () => {
        window.removeEventListener('pointermove', onPointer)
        window.removeEventListener('resize', resize)
        gsap.ticker.remove(tick)
        st.scrollTrigger?.kill()
        st.kill()
        renderer.dispose()
        core.geometry.dispose()
        ring.geometry.dispose()
        mat.dispose()
        ring.material.dispose()
        split.revert()
      }
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      className="relative flex min-h-svh flex-col justify-between overflow-hidden bg-[#0b0c10] px-5 pt-24 pb-8 text-white md:px-10 md:pt-28"
    >
      <ScrollFog density={0.7} />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
      />

      <p
        data-atelier-meta
        className="relative z-10 max-w-[36ch] text-[11px] tracking-[0.22em] text-white/45 uppercase"
      >
        {meta}
      </p>

      <div className="relative z-10 mix-blend-difference">
        <h1
          data-atelier-hero
          className="max-w-[12ch] font-brico text-[clamp(2.8rem,10vw,7.5rem)] leading-[0.9] font-semibold tracking-[-0.04em]"
        >
          {line1}
          <br />
          {line2}
        </h1>
      </div>

      <div className="relative z-10 flex items-end justify-between gap-4 border-t border-white/15 pt-4">
        <p
          data-atelier-meta
          className="max-w-[40ch] text-sm text-white/55"
        >
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Websites,
          products and systems built for clarity.
        </p>
        <p
          data-atelier-meta
          className="shrink-0 text-[11px] tracking-[0.22em] text-white/50 uppercase"
        >
          {hint} ↓
        </p>
      </div>
    </section>
  )
}
