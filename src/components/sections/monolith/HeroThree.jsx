import { useRef } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion, trackPointer } from '../../../lib/motion'

/** Presets curados — sin upload de GLB. */
export const HERO_THREE_SHAPES = [
  'icosahedron',
  'box',
  'octahedron',
  'torus',
  'sphere',
]

function createShapeGeometry(shape) {
  switch (shape) {
    case 'box':
      return new THREE.BoxGeometry(4.2, 4.2, 4.2)
    case 'octahedron':
      return new THREE.OctahedronGeometry(3.4, 0)
    case 'torus':
      return new THREE.TorusGeometry(2.4, 0.85, 16, 48)
    case 'sphere':
      return new THREE.SphereGeometry(3.6, 32, 24)
    case 'icosahedron':
    default:
      return new THREE.IcosahedronGeometry(3.4, 1)
  }
}

/**
 * Fit a loaded model into the same footprint as the presets so the
 * scroll/pointer animations keep working regardless of source scale.
 */
function fitObjectToScene(obj, targetSize = 5.2) {
  const box = new THREE.Box3().setFromObject(obj)
  const size = box.getSize(new THREE.Vector3())
  const maxAxis = Math.max(size.x, size.y, size.z) || 1
  obj.scale.setScalar(targetSize / maxAxis)
  box.setFromObject(obj)
  const center = box.getCenter(new THREE.Vector3())
  obj.position.sub(center)
}

function disposeObject(obj) {
  obj.traverse((node) => {
    node.geometry?.dispose?.()
    const mats = Array.isArray(node.material) ? node.material : [node.material]
    mats.forEach((m) => {
      if (!m) return
      Object.values(m).forEach((v) => v?.isTexture && v.dispose())
      m.dispose?.()
    })
  })
}

/**
 * HeroThree — brutalist hero with a Three.js wireframe object
 * spinning behind giant condensed type. Shape is a curated preset.
 *
 * `modelUrl` (optional): URL or path to a GLB/GLTF file. When set, the
 * preset shape is replaced by the custom model, re-materialized as a
 * carbon wireframe to keep the brutalist look. Buyers drop their file
 * in `public/` and point to it, e.g. modelUrl="/my-object.glb".
 */
export default function HeroThree({
  title = 'MONOLITH',
  subtitle = 'A brutalist storytelling template — placeholder object, real motion',
  meta = 'System v1.0 — ©2026',
  hint = 'Scroll',
  shape = 'icosahedron',
  modelUrl = '',
}) {
  const root = useRef(null)
  const canvasRef = useRef(null)
  const resolvedShape = HERO_THREE_SHAPES.includes(shape) ? shape : 'icosahedron'

  useGSAP(
    () => {
      const reduced = prefersReducedMotion()

      // —— Three.js scene ——
      const canvas = canvasRef.current
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      })
      // En un teléfono (DPR 3) 1.5 se ve igual de nítido y cuesta la mitad de GPU.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2))

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
      // Ligero offset Y: el título vive bajo el nav, no en el centro geométrico.
      camera.position.set(0, -0.15, 9.2)
      camera.lookAt(0, -0.35, 0)

      const geometry = createShapeGeometry(resolvedShape)
      const wireframe = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          wireframe: true,
          color: 0x101010,
          transparent: true,
          opacity: 0.95,
        }),
      )
      const points = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          size: 0.14,
          color: 0x2b3cff,
          transparent: true,
          opacity: 0.98,
          depthWrite: false,
        }),
      )
      const group = new THREE.Group()
      group.add(wireframe, points)
      // En calma ya nace en la pose de reposo: el objeto no se acomoda solo.
      group.rotation.set(reduced ? 0.4 : 0.28, 0.4, 0)
      group.position.set(0, -0.35, 0)
      group.scale.setScalar(1.05)
      scene.add(group)

      // —— Optional custom model (GLB/GLTF), re-skinned as wireframe ——
      let customModel = null
      let cancelled = false
      if (modelUrl && typeof modelUrl === 'string') {
        import('three/examples/jsm/loaders/GLTFLoader.js')
          .then(({ GLTFLoader }) => {
            if (cancelled) return
            new GLTFLoader().load(
              modelUrl,
              (gltf) => {
                if (cancelled) {
                  disposeObject(gltf.scene)
                  return
                }
                customModel = gltf.scene
                customModel.traverse((node) => {
                  if (node.isMesh) {
                    node.material = new THREE.MeshBasicMaterial({
                      wireframe: true,
                      color: 0x101010,
                    })
                  }
                })
                fitObjectToScene(customModel)
                group.remove(wireframe, points)
                group.add(customModel)
                render()
              },
              undefined,
              () => {
                console.warn(`HeroThree: could not load model "${modelUrl}"`)
              },
            )
          })
          .catch(() => {})
      }

      // El mouse en PC, el dedo en el teléfono: un dedo que scrollea cancela
      // pointermove y el objeto quedaba sin reaccionar a nada.
      const pointer = trackPointer()
      let calmStop = null

      const resize = () => {
        const host = canvasRef.current?.parentElement || root.current
        if (!host) return
        const { clientWidth: w, clientHeight: h } = host
        renderer.setSize(w, h, false)
        camera.aspect = w / Math.max(h, 1)
        camera.updateProjectionMatrix()
      }
      resize()

      const render = () => renderer.render(scene, camera)

      // Fuera de pantalla no se dibuja: en un teléfono la GPU seguía renderizando
      // el 3D mientras se leía el resto de la página.
      let onScreen = true
      const io = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting
      })
      io.observe(root.current)

      const tick = () => {
        if (!onScreen) return
        group.rotation.y += 0.0022
        group.rotation.x += (pointer.y * 0.35 + 0.4 - group.rotation.x) * 0.04
        group.rotation.z += (pointer.x * 0.25 - group.rotation.z) * 0.04
        render()
      }

      // Calma: sin giro automático ni zoom con el scroll. El objeto queda quieto y
      // solo responde al mouse o al dedo; se dibuja mientras se mueve.
      const calmTick = () => {
        if (!onScreen) return
        const dx = pointer.y * 0.35 + 0.4 - group.rotation.x
        const dz = pointer.x * 0.25 - group.rotation.z
        if (Math.abs(dx) + Math.abs(dz) < 0.0005) return
        group.rotation.x += dx * 0.08
        group.rotation.z += dz * 0.08
        render()
      }

      window.addEventListener('resize', resize)

      if (reduced) {
        render()
        gsap.ticker.add(calmTick)
        calmStop = calmReveal('[data-mono-title], [data-mono-fade]', { y: 10 })
      } else {
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
        cancelled = true
        window.removeEventListener('resize', resize)
        pointer.dispose()
        calmStop?.()
        gsap.ticker.remove(tick)
        gsap.ticker.remove(calmTick)
        io.disconnect()
        geometry.dispose()
        wireframe.material.dispose()
        points.material.dispose()
        if (customModel) disposeObject(customModel)
        renderer.dispose()
      }
    },
    { scope: root, dependencies: [resolvedShape, modelUrl], revertOnUpdate: true },
  )

  return (
    <section
      ref={root}
      className="relative flex h-svh flex-col justify-between overflow-hidden border-b-2 border-carbon px-5 pt-24 pb-5 md:px-8"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      />

      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-between">
        {/* Chip de concreto: sin él, la malla del objeto cruza el texto chico. */}
        <p
          data-mono-fade
          className="-mx-2 w-fit max-w-72 bg-concrete px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs"
        >
          {subtitle}
        </p>

        <h1
          data-mono-title
          className="relative z-10 mx-auto w-full text-center font-anton text-[clamp(4.5rem,16vw,12rem)] leading-[0.85] tracking-[0.01em] uppercase select-none mix-blend-multiply"
        >
          {title}
        </h1>

        <div className="relative z-10 flex items-end justify-between border-t-2 border-carbon pt-3 font-mono text-[11px] uppercase tracking-[0.1em] md:text-xs">
          <p data-mono-fade className="-ml-2 bg-concrete px-2 py-1">
            {meta}
          </p>
          <p data-mono-fade className="bg-carbon px-2 py-1 text-concrete">
            {hint} <span aria-hidden="true">↓</span>
          </p>
        </div>
      </div>
    </section>
  )
}
