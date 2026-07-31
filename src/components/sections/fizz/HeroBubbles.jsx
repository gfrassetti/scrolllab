import { useRef } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'

/** Curated flavor presets — label color + bubble tint. */
export const FIZZ_FLAVORS = {
  berry: { base: '#ff3ea5', dark: '#b81f74', bubbles: 0xffd1ec },
  citrus: { base: '#ffb02e', dark: '#e08a00', bubbles: 0xffe9c0 },
  tropical: { base: '#ff6b35', dark: '#d14a17', bubbles: 0xffd6c4 },
  mint: { base: '#3ddc97', dark: '#1fa96d', bubbles: 0xd2ffe9 },
}

const CHAR_COLORS = ['#ffb02e', '#ff3ea5', '#3ddc97', '#ff6b35']

/** Flat, illustrated can label drawn to a canvas (no external assets). */
function buildLabelTexture(flavorKey, label) {
  const flavor = FIZZ_FLAVORS[flavorKey] || FIZZ_FLAVORS.berry
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = flavor.base
  ctx.fillRect(0, 0, size, size)

  // Wavy stripe across the middle
  ctx.fillStyle = '#fff3e2'
  ctx.beginPath()
  ctx.moveTo(0, size * 0.62)
  for (let x = 0; x <= size; x += 16) {
    ctx.lineTo(x, size * 0.62 + Math.sin((x / size) * Math.PI * 4) * 14)
  }
  ctx.lineTo(size, size)
  ctx.lineTo(0, size)
  ctx.closePath()
  ctx.fill()

  // Brand mark repeated around the can
  ctx.fillStyle = '#241352'
  ctx.font = '800 96px "Bricolage Grotesque", sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, size * 0.06, size * 0.3)
  ctx.fillText(label, size * 0.56, size * 0.3)

  ctx.fillStyle = flavor.dark || '#241352'
  ctx.font = '700 44px "Bricolage Grotesque", sans-serif'
  ctx.fillText('placeholder flavor', size * 0.06, size * 0.82)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  return texture
}

/**
 * Fit any loaded model into the same visual footprint as the can,
 * so scroll/pointer animations keep working regardless of source scale.
 */
function fitObjectToScene(obj, targetSize = 4.6) {
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
 * HeroBubbles — a flat-shaded 3D soda can spinning over a field of
 * rising bubbles, behind candy-colored kinetic type. Flavor is a preset.
 *
 * `modelUrl` (optional): URL or path to a GLB/GLTF file. When set, the
 * placeholder can is replaced by the custom model (auto-centered and
 * auto-scaled). Buyers drop their file in `public/` and point to it,
 * e.g. modelUrl="/my-can.glb".
 */
export default function HeroBubbles({
  title = 'YOUR BIG TITLE',
  tagline = 'Placeholder tagline — every text, the flavor and the 3D can are replaceable.',
  meta = 'Placeholder meta — ©2026',
  hint = 'Scroll',
  flavor = 'berry',
  canLabel = 'BRAND*',
  modelUrl = '',
}) {
  const root = useRef(null)
  const canvasRef = useRef(null)
  const resolvedFlavor = flavor in FIZZ_FLAVORS ? flavor : 'berry'

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      // —— Three.js: can + bubbles ——
      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
      camera.position.z = 10

      const labelTexture = buildLabelTexture(resolvedFlavor, canLabel)
      const bodyGeo = new THREE.CylinderGeometry(1.45, 1.45, 3.9, 48, 1, false)
      const body = new THREE.Mesh(
        bodyGeo,
        new THREE.MeshBasicMaterial({ map: labelTexture }),
      )
      const lidGeo = new THREE.CylinderGeometry(1.34, 1.45, 0.22, 48)
      const lidMat = new THREE.MeshBasicMaterial({ color: 0xd9d4cf })
      const lidTop = new THREE.Mesh(lidGeo, lidMat)
      lidTop.position.y = 2.05
      const lidBottom = new THREE.Mesh(lidGeo, lidMat)
      lidBottom.rotation.x = Math.PI
      lidBottom.position.y = -2.05

      const can = new THREE.Group()
      can.add(body, lidTop, lidBottom)
      can.rotation.set(0.18, -0.6, -0.12)
      scene.add(can)

      // —— Optional custom model (GLB/GLTF) replacing the placeholder can ——
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
                fitObjectToScene(customModel)
                // GLB materials are usually lit — the placeholder can is not.
                const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
                keyLight.position.set(3, 5, 6)
                scene.add(new THREE.AmbientLight(0xffffff, 1.4), keyLight)
                can.remove(body, lidTop, lidBottom)
                can.add(customModel)
                render()
              },
              undefined,
              () => {
                // Bad URL / expired blob — keep the placeholder can.
                console.warn(`HeroBubbles: could not load model "${modelUrl}"`)
              },
            )
          })
          .catch(() => {})
      }

      const bubbleCount = 110
      const positions = new Float32Array(bubbleCount * 3)
      for (let i = 0; i < bubbleCount; i += 1) {
        positions[i * 3] = (Math.random() - 0.5) * 16
        positions[i * 3 + 1] = (Math.random() - 0.5) * 12
        positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2
      }
      const bubbleGeo = new THREE.BufferGeometry()
      bubbleGeo.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3),
      )
      const bubbleMat = new THREE.PointsMaterial({
        size: 0.12,
        color: (FIZZ_FLAVORS[resolvedFlavor] || FIZZ_FLAVORS.berry).bubbles,
        transparent: true,
        opacity: 0.85,
      })
      const bubbles = new THREE.Points(bubbleGeo, bubbleMat)
      scene.add(bubbles)

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
        can.rotation.y += 0.006
        can.position.y = Math.sin(gsap.ticker.time * 1.1) * 0.18
        can.rotation.z += (pointer.x * 0.12 - 0.12 - can.rotation.z) * 0.05
        can.rotation.x += (pointer.y * 0.15 + 0.18 - can.rotation.x) * 0.05

        const pos = bubbleGeo.attributes.position
        for (let i = 0; i < bubbleCount; i += 1) {
          let y = pos.getY(i) + 0.012 + (i % 5) * 0.0035
          if (y > 6) y = -6
          pos.setY(i, y)
        }
        pos.needsUpdate = true
        render()
      }

      window.addEventListener('resize', resize)

      if (reduced) {
        render()
      } else {
        window.addEventListener('pointermove', onPointerMove)
        gsap.ticker.add(tick)

        gsap.to(can.rotation, {
          y: '+=2.4',
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        })
        gsap.to(can.scale, {
          x: 1.35,
          y: 1.35,
          z: 1.35,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        })

        // —— Candy type: each glyph pops in with its own color ——
        const split = new SplitText('[data-fizz-title]', {
          type: 'chars',
          mask: 'chars',
        })
        split.chars.forEach((char, i) => {
          char.style.color = CHAR_COLORS[i % CHAR_COLORS.length]
        })
        gsap.from(split.chars, {
          yPercent: 120,
          rotate: 8,
          duration: 0.9,
          ease: 'back.out(1.6)',
          stagger: 0.035,
          delay: 0.25,
        })
        gsap.from('[data-fizz-fade]', {
          opacity: 0,
          y: 14,
          duration: 0.7,
          stagger: 0.12,
          delay: 0.9,
        })
      }

      return () => {
        cancelled = true
        window.removeEventListener('resize', resize)
        window.removeEventListener('pointermove', onPointerMove)
        gsap.ticker.remove(tick)
        bodyGeo.dispose()
        lidGeo.dispose()
        bubbleGeo.dispose()
        labelTexture.dispose()
        body.material.dispose()
        lidMat.dispose()
        bubbleMat.dispose()
        if (customModel) disposeObject(customModel)
        renderer.dispose()
      }
    },
    {
      scope: root,
      dependencies: [resolvedFlavor, modelUrl, canLabel],
      revertOnUpdate: true,
    },
  )

  return (
    <section
      ref={root}
      className="relative flex h-svh flex-col justify-between overflow-hidden px-5 pt-28 pb-6 md:px-10"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />

      <div className="pointer-events-none relative flex h-full flex-col justify-between">
        <p
          data-fizz-fade
          className="max-w-[34ch] text-xs font-semibold uppercase tracking-[0.22em] text-foam/70 md:text-sm"
        >
          {tagline}
        </p>

        <h1
          data-fizz-title
          className="font-brico text-[clamp(3rem,15vw,12rem)] leading-[0.92] font-extrabold tracking-[-0.03em] uppercase select-none"
        >
          {title}
        </h1>

        <div className="flex items-end justify-between gap-4 border-t border-foam/20 pt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-foam/60 md:text-xs">
          <p data-fizz-fade>{meta}</p>
          <p
            data-fizz-fade
            className="rounded-full bg-foam px-3 py-1.5 text-grape"
          >
            {hint} <span aria-hidden="true">↓</span>
          </p>
        </div>
      </div>
    </section>
  )
}
