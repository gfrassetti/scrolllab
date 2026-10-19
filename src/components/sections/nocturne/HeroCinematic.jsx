import { useRef } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal, createFrameBudget, prefersReducedMotion, trackPointer } from '../../../lib/motion'
import { imgAttrs } from '../../../lib/responsiveImage'
import { heroNight, heroDepth, variants } from './assets/images'

// Punto de fuga de la foto de la demo (en uv, 0–1): hacia ahí entra la cámara.
const VANISH = [0.5, 0.42]

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform vec2 uCover;     // escala del uv para cubrir la pantalla como object-cover
uniform vec2 uPointer;   // -1..1
uniform float uPush;     // 0..1, la cámara entra al scrollear
uniform vec2 uVanish;
uniform vec3 uFog;
varying vec2 vUv;

vec2 cover(vec2 uv) { return (uv - 0.5) * uCover + 0.5; }

void main() {
  vec2 uv = cover(vUv);
  // la profundidad de este punto (blanco = cerca) decide cuánto se mueve
  float d = texture2D(uDepth, uv).r;
  // la cámara entra: lo cercano se agranda más que lo lejano (dolly)
  float zoom = 1.0 + uPush * (0.08 + d * 0.32);
  uv = uVanish + (uv - uVanish) / zoom;
  // el puntero: lo cercano se corre más que el fondo (paralaje real, sin capas)
  uv += uPointer * vec2(0.018, 0.012) * (d - 0.35);
  d = texture2D(uDepth, uv).r;
  vec3 col = texture2D(uImage, uv).rgb;
  // al entrar, la niebla se come lo lejano
  col = mix(col, uFog, (1.0 - d) * uPush * 0.75);
  // viñeta de cine
  vec2 q = vUv - 0.5;
  col *= 1.0 - dot(q, q) * 0.9;
  gl_FragColor = vec4(col, 1.0);
}
`

/**
 * HeroCinematic — the opening shot in 2.5D: one night photograph and its depth
 * map, drawn in WebGL. The pointer (or the finger) moves what is near more than
 * what is far — real parallax from a single image, no cut-out layers — and on
 * scroll the shot is pinned and the camera pushes down the street: the near
 * cobblestones grow faster than the towers, the fog closes in, the title goes
 * up like an opening credit. Rain falls on a canvas of its own.
 *
 * The photo and its depth map (white = near) are fields; with another photo,
 * give it its own depth map (any depth-estimation tool exports one).
 *
 * Calma (reducir movimiento): la foto quieta, sin pin ni lluvia que cae; el
 * título y las notas entran con un fundido.
 */
export default function HeroCinematic({
  titleTop = 'NIGHT',
  titleBottom = 'SHIFT',
  kicker = 'A production company that only shoots after dark',
  meta = 'Nocturne Pictures — Rotterdam',
  hint = 'Scroll',
  img = heroNight,
  depthImg = heroDepth,
  bg,
  fg,
  accent,
  /** La foto se mueve con el puntero (o el dedo), cada cosa según su profundidad. */
  showHover = 'on',
  /** La lluvia que cae sobre la toma. */
  showRain = 'on',
}) {
  const root = useRef(null)
  const canvasRef = useRef(null)
  const rainRef = useRef(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        return calmReveal('[data-hero-title], [data-hero-fade]', { y: 18, stagger: 0.12, duration: 0.9 })
      }
      const q = (s) => root.current.querySelector(s)

      // —— la foto en WebGL ——
      const canvas = canvasRef.current
      let renderer = null
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false })
      } catch {
        renderer = null
      }
      const dpr = Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2)
      const uniforms = {
        uImage: { value: null },
        uDepth: { value: null },
        uCover: { value: new THREE.Vector2(1, 1) },
        uPointer: { value: new THREE.Vector2() },
        uPush: { value: 0 },
        uVanish: { value: new THREE.Vector2(...VANISH) },
        uFog: { value: new THREE.Color(bg || '#0b0c10') },
      }
      let imgAspect = 16 / 9
      const scene = new THREE.Scene()
      const camera = new THREE.Camera()
      const quad = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG }),
      )
      scene.add(quad)
      const loader = new THREE.TextureLoader()
      let ready = false
      if (renderer) {
        renderer.setPixelRatio(dpr)
        renderer.outputColorSpace = THREE.LinearSRGBColorSpace
        Promise.all([loader.loadAsync(img), loader.loadAsync(depthImg)])
          .then(([image, depth]) => {
            ;[image, depth].forEach((t) => {
              t.minFilter = THREE.LinearFilter
              t.generateMipmaps = false
              t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
            })
            image.colorSpace = THREE.NoColorSpace
            uniforms.uImage.value = image
            uniforms.uDepth.value = depth
            imgAspect = image.image.width / image.image.height
            resize()
            ready = true
            gsap.fromTo(canvas, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 2.2, ease: 'power2.out' })
          })
          .catch(() => {
            // sin WebGL o sin mapa: queda la foto como <img>
            canvas.style.display = 'none'
          })
      }

      const resize = () => {
        const w = canvas.clientWidth
        const h = canvas.clientHeight
        renderer?.setSize(w, h, false)
        const view = w / Math.max(h, 1)
        // object-cover: se recorta el lado que sobra
        uniforms.uCover.value.set(view > imgAspect ? 1 : view / imgAspect, view > imgAspect ? imgAspect / view : 1)
        rainResize()
      }

      // —— entrada del título ——
      const split = new SplitText('[data-hero-title]', { type: 'chars', mask: 'chars' })
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from(split.chars, { yPercent: 115, duration: 1.2, ease: 'power4.out', stagger: 0.04 }, 0.5)
        .from('[data-hero-fade]', { opacity: 0, y: 12, duration: 1, stagger: 0.12 }, 1.2)

      // —— scroll: la cámara baja por la calle ——
      const push = { v: 0 }
      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: '+=110%',
            pin: q('[data-hero-pin]'),
            scrub: 0.8,
            anticipatePin: 1,
          },
        })
        .to(push, { v: 1 }, 0)
        .to('[data-hero-titlewrap]', { yPercent: -45, autoAlpha: 0 }, 0)
        .to('[data-hero-fade]', { autoAlpha: 0 }, 0)

      const pointer = showHover === 'off' ? null : trackPointer()
      const smooth = { x: 0, y: 0 }

      // —— la lluvia ——
      const rain = rainRef.current
      const ctx = rain?.getContext('2d')
      let drops = []
      let rw = 0
      let rh = 0
      function rainResize() {
        if (!rain || !ctx) return
        const r = Math.min(window.devicePixelRatio, 1.5)
        rw = rain.clientWidth
        rh = rain.clientHeight
        rain.width = rw * r
        rain.height = rh * r
        ctx.setTransform(r, 0, 0, r, 0, 0)
        drops = Array.from({ length: Math.round((rw * rh) / 9000) }, () => ({
          x: Math.random() * rw,
          y: Math.random() * rh,
          z: 0.3 + Math.random() * 0.7,
        }))
      }
      resize()
      window.addEventListener('resize', resize)

      let onScreen = true
      const io = new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting
      })
      io.observe(root.current)
      const budget = renderer
        ? createFrameBudget({ dpr, apply: (v) => { renderer.setPixelRatio(v); resize() } })
        : null

      const tick = (time, delta) => {
        if (!onScreen) return
        if (pointer) {
          smooth.x += (pointer.x - smooth.x) * 0.06
          smooth.y += (pointer.y - smooth.y) * 0.06
          uniforms.uPointer.value.set(smooth.x, -smooth.y)
        }
        uniforms.uPush.value = push.v
        if (renderer && ready) {
          renderer.render(scene, camera)
          budget?.tick(delta)
        }
        if (!ctx) return
        const dt = Math.min(delta, 50) / 16.7
        ctx.clearRect(0, 0, rw, rh)
        ctx.lineCap = 'round'
        for (const d of drops) {
          const len = 10 + d.z * 22
          d.y += (9 + d.z * 14) * dt
          d.x += (1.6 + d.z * 2.4) * dt
          if (d.y > rh + len) {
            d.y = -len
            d.x = Math.random() * rw
          }
          if (d.x > rw) d.x -= rw
          ctx.strokeStyle = `rgba(214,226,255,${0.05 + d.z * 0.16})`
          ctx.lineWidth = 0.6 + d.z * 0.8
          ctx.beginPath()
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x - len * 0.16, d.y - len)
          ctx.stroke()
        }
      }
      gsap.ticker.add(tick)

      return () => {
        gsap.ticker.remove(tick)
        window.removeEventListener('resize', resize)
        io.disconnect()
        pointer?.dispose()
        split.revert()
        uniforms.uImage.value?.dispose()
        uniforms.uDepth.value?.dispose()
        quad.geometry.dispose()
        quad.material.dispose()
        renderer?.dispose()
      }
    },
    { scope: root, dependencies: [img, depthImg, showHover, showRain, bg], revertOnUpdate: true },
  )

  return (
    <section
      ref={root}
      style={{
        background: bg || undefined,
        color: fg || undefined,
        '--color-noir': bg || undefined,
        '--color-salt': fg || undefined,
        '--color-acid': accent || undefined,
      }}
    >
      <div data-hero-pin className="relative h-svh overflow-hidden bg-noir">
        {/* la foto como <img> (calma, sin WebGL o mientras carga) y el canvas encima */}
        <img
          {...imgAttrs(img, variants)}
          sizes="(max-aspect-ratio: 16/9) 180vh, 100vw"
          fetchPriority="high"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full opacity-0 calm:hidden" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(to top, var(--color-noir), transparent 30%), linear-gradient(to bottom, color-mix(in srgb, var(--color-noir) 60%, transparent), transparent 22%)' }}
        />
        {showRain !== 'off' && (
          <canvas ref={rainRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full calm:hidden" />
        )}

        <div data-hero-titlewrap className="pointer-events-none absolute inset-0 flex items-center">
          <h1 className="w-full px-5 font-brico leading-[0.8] font-extrabold tracking-[-0.02em] text-salt select-none md:px-10">
            <span data-hero-title className="block text-[18vw]">
              {titleTop}
            </span>
            <span data-hero-title className="block pl-[10vw] text-[18vw]">
              {titleBottom}
              <span aria-hidden="true" className="text-acid">
                .
              </span>
            </span>
          </h1>
        </div>

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-5 pt-24 pb-6 md:px-10 md:pb-10">
          <p data-hero-fade className="max-w-60 text-[11px] uppercase tracking-[0.3em] text-salt/70 md:text-xs">
            {kicker}
          </p>
          <div className="flex items-end justify-between border-t border-salt/20 pt-4">
            <p data-hero-fade className="text-[11px] uppercase tracking-[0.3em] text-salt/70 md:text-xs">
              {meta}
            </p>
            <p data-hero-fade className="text-[11px] uppercase tracking-[0.3em] text-acid md:text-xs">
              {hint} <span aria-hidden="true">↓</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
