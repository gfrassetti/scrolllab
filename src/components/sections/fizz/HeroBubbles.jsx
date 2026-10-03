import { useRef } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP, SplitText } from '../../../lib/gsap'
import { calmReveal, prefersReducedMotion } from '../../../lib/motion'
import { FOAM, TITLE_FRAGMENT, TITLE_VERTEX, drawTitleLine } from './bottleKit'
import { acquireFizzStage } from './fizzStage'

/** Curated flavor presets — one flat stage color, its type ink and the drink tint. */
export const FIZZ_FLAVORS = {
  cobalt: { bg: '#2c4bff', ink: '#fff3e2', liquid: '#9db8ff' },
  berry: { bg: '#ff3ea5', ink: '#241352', liquid: '#ffc9e8' },
  citrus: { bg: '#ffb02e', ink: '#241352', liquid: '#fff1cc' },
  tropical: { bg: '#ff6b35', ink: '#241352', liquid: '#ffdccb' },
  mint: { bg: '#3ddc97', ink: '#241352', liquid: '#dcfff0' },
}

const TURNS = 2

const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (t) => t * t * (3 - 2 * t)
const BUBBLE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

// Soap film: clear in the middle, bright on the rim, a window highlight up-left
// and its bounce down-right, with a thin iridescent drift.
const BUBBLE_FRAGMENT = /* glsl */ `
  uniform vec3 uTint;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    float facing = max(dot(n, v), 0.0);
    float rim = pow(1.0 - facing, 2.4);
    vec3 film = 0.5 + 0.5 * cos(6.2831 * (rim * 1.3 + vec3(0.0, 0.33, 0.67)));
    float key = smoothstep(0.93, 0.985, dot(n, normalize(vec3(-0.5, 0.62, 0.6)))) * 0.85;
    float bounce = smoothstep(0.95, 0.99, dot(n, normalize(vec3(0.46, -0.58, 0.67)))) * 0.45;
    vec3 color = mix(uTint, film, rim * 0.28) + key + bounce;
    float alpha = clamp(rim * 0.9 + key * 0.95 + bounce + 0.035, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

/**
 * HeroBubbles — the glass bottle, the headline and the fizz. The headline is
 * drawn in the canvas so the glass refracts it; scroll spins the bottle across
 * the stage while it keeps floating on its own.
 *
 * The canvas and the bottle belong to the FIZZ stage (`fizzStage.js`), shared
 * with FlavorWorlds: the bottle that leaves the hero is the very same one that
 * turns through the flavors. This section adds the headline, the marquee and
 * the bubbles to that stage and drives the bottle while it is on screen.
 *
 * `modelUrl` swaps in a GLB (meshes named glass / liquid / label / stopper /
 * seal / wire get the glass, the flavor tint, the inner bubbles, the print and
 * the stopper). Without it, a lathe-built bottle stands in. `canImage`
 * replaces the drawn print.
 */
export default function HeroBubbles({
  title = 'YOUR BIG TITLE',
  tagline = 'Placeholder tagline — every text, the flavor and the 3D bottle are replaceable.',
  meta = 'Placeholder meta — ©2026',
  hint = 'Scroll',
  statement = 'Placeholder statement — two or three short lines about the drink, set big.',
  cta = 'Placeholder CTA',
  ctaHref = '#',
  marquee = 'SOOO MUCH FIZZ',
  flavor = 'cobalt',
  canLabel = 'BRAND*',
  canImage = '',
  modelUrl = '',
  envUrl = '',
  dracoPath = '/fizz/draco/',
}) {
  const root = useRef(null)
  const canvasRef = useRef(null)
  const titleRef = useRef(null)
  const statementRef = useRef(null)
  const marqueeRef = useRef(null)
  const resolvedFlavor = flavor in FIZZ_FLAVORS ? flavor : 'cobalt'
  const flavorCfg = FIZZ_FLAVORS[resolvedFlavor]

  useGSAP(
    () => {
      const reduced = prefersReducedMotion()
      const family = getComputedStyle(titleRef.current).fontFamily
      const { stage, release } = acquireFizzStage({
        canvas: canvasRef.current,
        family,
        reduced,
        flavor: flavorCfg,
        brand: canLabel,
        image: canImage,
        modelUrl,
        envUrl,
        dracoPath,
      })
      // The hero sets the look of the stage (color, drink, print).
      stage.configure({ flavor: flavorCfg, brand: canLabel, image: canImage })
      if (stage.canvas !== canvasRef.current) canvasRef.current.style.display = 'none'
      const { scene, camera, color: stageColor } = stage
      let { W, H, narrow, dpr } = stage.size()

      /* ── Headline, dentro del canvas ───────────────────────────── */
      const titleGroup = new THREE.Group()
      camera.add(titleGroup)
      const words = String(title).trim().toUpperCase().split(/\s+/).filter(Boolean)
      const heavy = { weight: 800, tracking: -0.03, width: 0.86, widthNarrow: 0.9, max: 0.36 }
      const lines =
        words.length > 1
          ? [
              {
                text: words.slice(0, -1).join(' '),
                weight: 300,
                tracking: 0.04,
                width: 0.44,
                widthNarrow: 0.6,
                max: 0.19,
              },
              { text: words.at(-1), ...heavy },
            ]
          : [{ text: words[0] || '', ...heavy }]
      const planeGeo = new THREE.PlaneGeometry(1, 1)
      const lineTextures = []
      let letters = []
      // The state outlives every re-layout (fonts arriving, resizes): t goes 0 → 1
      // as the letter flies in from its scattered start.
      const letterStates = []
      const letterState = (i) =>
        (letterStates[i] ||= {
          t: reduced ? 1 : 0,
          ox: (Math.random() - 0.5) * W * 0.6,
          oy: -(0.12 + Math.random() * 0.4) * H,
          rot: (Math.random() - 0.5) * 1.8,
          s0: 0.35 + Math.random() * 1.1,
        })

      const applyLetters = () => {
        letters.forEach(({ mesh, state, x, y, w, h }) => {
          const k = 1 - state.t
          const sc = lerp(state.s0, 1, state.t)
          mesh.position.set(x + k * state.ox, y + k * state.oy, 0)
          mesh.rotation.z = k * state.rot
          mesh.scale.set(w * sc, h * sc, 1)
          mesh.material.uniforms.uIn.value = clamp01(state.t * 2)
        })
      }

      const textMaterial = (map, uv0 = 0, uv1 = 1, inValue = 0) =>
        new THREE.ShaderMaterial({
          uniforms: {
            map: { value: map },
            uInk: { value: new THREE.Color(flavorCfg.ink) },
            uPaper: { value: stageColor },
            uUv0: { value: uv0 },
            uUv1: { value: uv1 },
            uIn: { value: inValue },
            uFade: { value: 1 },
          },
          vertexShader: TITLE_VERTEX,
          fragmentShader: TITLE_FRAGMENT,
        })

      // «SOOO MUCH FIZZ»: one huge line that crosses the screen between the
      // statement and the flavors. Same opaque shader as the headline, so the
      // glass refracts it as the bottle tumbles through.
      const marqueeMesh = new THREE.Mesh(planeGeo, textMaterial(null, 0, 1, 1))
      marqueeMesh.visible = false
      camera.add(marqueeMesh)
      let marqueeWidth = 0
      const layoutMarquee = () => {
        marqueeMesh.material.uniforms.map.value?.dispose()
        const drawn = drawTitleLine(String(marquee).toUpperCase(), {
          family,
          weight: 800,
          tracking: -0.02,
          targetWidth: 1e6,
          maxSize: H * (narrow ? 0.24 : 0.32),
          dpr,
        })
        marqueeMesh.material.uniforms.map.value = drawn.texture
        marqueeMesh.scale.set(drawn.width, drawn.height, 1)
        marqueeWidth = drawn.width
      }

      const clearTitle = () => {
        letters.forEach(({ mesh }) => {
          titleGroup.remove(mesh)
          mesh.material.dispose()
        })
        lineTextures.forEach((texture) => texture.dispose())
        letters = []
        lineTextures.length = 0
      }

      const layoutTitle = () => {
        clearTitle()
        const gap = H * 0.035
        const drawnLines = lines.map((line) =>
          drawTitleLine(line.text, {
            family,
            weight: line.weight,
            tracking: line.tracking,
            targetWidth: W * (narrow ? line.widthNarrow : line.width),
            maxSize: H * line.max,
            dpr,
          }),
        )
        const total = drawnLines.reduce((sum, d, i) => sum + d.height + (i ? gap : 0), 0)
        let top = total / 2 + H * 0.02
        let n = 0
        drawnLines.forEach((drawn) => {
          lineTextures.push(drawn.texture)
          const y = top - drawn.height / 2
          drawn.cuts.forEach((cut) => {
            const mesh = new THREE.Mesh(planeGeo, textMaterial(drawn.texture, cut.u0, cut.u1, 0))
            titleGroup.add(mesh)
            letters.push({
              mesh,
              state: letterState(n),
              x: (cut.x0 + cut.x1) / 2 - drawn.width / 2,
              y,
              w: cut.x1 - cut.x0,
              h: drawn.height,
            })
            n += 1
          })
          top -= drawn.height + gap
        })
        applyLetters()
        layoutMarquee()
      }

      /* ── Burbujas del escenario ────────────────────────────────── */
      const bubbleCount = narrow ? 14 : 30
      // Extra, bigger bubbles that only show up during the «much fizz» burst.
      const burstCount = narrow ? 26 : 56
      const bubbleMesh = new THREE.InstancedMesh(
        new THREE.SphereGeometry(1, 32, 20),
        new THREE.ShaderMaterial({
          uniforms: { uTint: { value: new THREE.Color(FOAM) } },
          vertexShader: BUBBLE_VERTEX,
          fragmentShader: BUBBLE_FRAGMENT,
          transparent: true,
          depthWrite: false,
        }),
        bubbleCount + burstCount,
      )
      bubbleMesh.frustumCulled = false
      scene.add(bubbleMesh)
      const bubbleDummy = new THREE.Object3D()
      const spawnBubble = (b, scatter) => {
        // Los costados cargan más burbujas: el centro queda para el titular.
        const lane = Math.random()
        const side =
          lane < 0.42
            ? Math.random() * 0.26
            : lane < 0.84
              ? 0.74 + Math.random() * 0.26
              : 0.26 + Math.random() * 0.48
        const big = Math.random() < 0.22
        b.r = (big ? 22 + Math.random() * 30 : 4 + Math.random() * 10) * (narrow ? 0.7 : 1)
        b.x = (side - 0.5) * W * 1.08
        b.z = -100 + Math.random() * 320
        b.speed = (0.1 + (b.r / 52) * 0.2) * (0.8 + Math.random() * 0.4)
        b.phase = Math.random() * Math.PI * 2
        b.sway = 6 + Math.random() * 16
        b.y = scatter
          ? (Math.random() - 0.5) * H * 1.1
          : -H * 0.5 - b.r * 2 - Math.random() * H * 0.25
        b.born = b.y
        return b
      }
      const bubbles = Array.from({ length: bubbleCount + burstCount }, (_, i) => {
        const b = spawnBubble({}, true)
        b.delay = Math.random() * 0.5
        if (i >= bubbleCount) {
          b.burst = true
          b.k = Math.random() * 0.6
        }
        return b
      })
      // The first thing on screen: the bubbles, popping in one by one.
      const intro = { bubbles: reduced ? 1 : 0 }
      const placeBubbles = (time, dt, boost, burst, presence) => {
        bubbles.forEach((b, i) => {
          b.y += b.speed * H * dt * boost * (b.burst ? 1.5 : 1)
          if (b.y > H * 0.5 + b.r * 3) {
            spawnBubble(b, false)
            if (b.burst) b.r *= 1.8
          }
          const grow =
            clamp01((b.y - b.born) / (H * 0.12) + (b.born > -H * 0.5 ? 1 : 0)) *
            smooth(clamp01((intro.bubbles - (b.delay || 0)) / 0.5)) *
            (b.burst ? smooth(clamp01(burst * 1.6 - b.k)) : 1) *
            presence
          const wobble = Math.sin(time * 3.1 + b.phase) * 0.05
          bubbleDummy.position.set(b.x + Math.sin(time * 0.9 + b.phase) * b.sway, b.y, b.z)
          bubbleDummy.scale.set(b.r * grow * (1 + wobble), b.r * grow * (1 - wobble), b.r * grow)
          bubbleDummy.updateMatrix()
          bubbleMesh.setMatrixAt(i, bubbleDummy.matrix)
        })
        bubbleMesh.instanceMatrix.needsUpdate = true
      }

      /* ── La botella mientras el hero está en pantalla ──────────── */
      const state = { p: 0, m: 0, enter: reduced ? 0 : 1 }
      let lastTop = null
      let boost = 1

      const heroPose = (time, look) => {
        const { p, m, enter } = state
        const s = smooth(p)
        const out = 1 - (1 - p) * (1 - p)
        const bob = reduced ? 0 : Math.sin(time * 1.05) * H * 0.016
        const sway = reduced ? 0 : Math.sin(time * 0.29) * 0.42
        const size = narrow ? Math.min(H * 0.5, W * 1.35) : Math.min(H * 0.86, W * 0.62)
        const pose = {
          x: W * (narrow ? lerp(0, 0.22, s) : lerp(-0.06, 0.29, s)),
          y: H * (narrow ? lerp(-0.04, -0.2, s) : lerp(-0.03, -0.05, s)) + bob - enter * H * 1.05,
          rotZ: narrow ? lerp(0.3, -0.34, s) : lerp(0.4, -0.2, s),
          rotX: Math.sin(Math.PI * p) * 0.3 + look.y * 0.06,
          spinY: -TURNS * Math.PI * 2 * out + sway + look.x * 0.25 - enter * 2.4,
          scale: size * lerp(1, 1.12, s),
          shadow: 0.55 * (1 - enter),
        }
        // The «much fizz» stretch: the bottle tumbles across to the center while
        // the line slides by behind it.
        if (m > 0) {
          const ms = smooth(m)
          const arc = Math.sin(Math.PI * m)
          pose.x = lerp(pose.x, W * (narrow ? 0 : -0.04), ms)
          pose.y -= arc * H * 0.05
          pose.rotZ -= Math.PI * 2 * ms
          pose.spinY += Math.PI * 2 * ms
          pose.scale *= 1 + arc * 0.14
        }
        return pose
      }

      const layer = {
        el: root.current,
        resize(next) {
          ;({ W, H, narrow, dpr } = next)
          const cameraZ = H / (2 * Math.tan((Math.PI / 180) * 15))
          titleGroup.position.z = -cameraZ
          marqueeMesh.position.z = -cameraZ
          layoutTitle()
        },
        fontsReady() {
          layoutTitle()
        },
        update({ time, dt, look }) {
          const rect = root.current.getBoundingClientRect()
          // El titular sube con la página, 1:1, como si fuera DOM.
          titleGroup.position.y = Math.min(Math.max(-rect.top, 0), rect.height - H)
          // Al irse hacia arriba el titular se apaga, sin cortarse de golpe.
          const fade = 1 - smooth(clamp01((-rect.top - H * 0.05) / (H * 0.55)))
          letters.forEach(({ mesh }) => {
            mesh.material.uniforms.uFade.value = fade
          })
          applyLetters()
          // Scrollear agita el gas.
          const speed = lastTop === null ? 0 : Math.abs(rect.top - lastTop)
          lastTop = rect.top
          boost += (1 + Math.min(speed * 0.06, 2.5) - boost) * 0.12

          stage.setPose('hero', heroPose(time, look), 1, 0)
          marqueeMesh.visible = state.m > 0.001 && state.m < 0.999
          marqueeMesh.position.x = lerp(
            W / 2 + marqueeWidth / 2,
            -(W / 2 + marqueeWidth / 2),
            state.m,
          )
          // The hero's bubbles go as the hero itself leaves the screen.
          const presence = smooth(clamp01(rect.bottom / H))
          placeBubbles(time, dt, boost, Math.sin(Math.PI * state.m), presence)
        },
      }
      const removeLayer = stage.addLayer(layer)

      let introDone = reduced
      let modelReady = false
      const startBottle = () => {
        if (reduced || !introDone || !modelReady) return
        gsap.to(state, { enter: 0, duration: 2, ease: 'power3.out' })
      }
      stage.onModel(() => {
        modelReady = true
        startBottle()
      })

      if (reduced) {
        gsap.set('[data-fizz-fade]', { opacity: 1 })
        calmReveal('[data-fizz-statement], [data-fizz-cta]')
        stage.renderOnce()
      } else {
        gsap.to(state, {
          p: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            endTrigger: statementRef.current,
            end: 'bottom bottom',
            scrub: 0.6,
          },
        })
        gsap.to(state, {
          m: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: marqueeRef.current,
            // Starts once the statement is halfway gone, so the line never runs over it.
            start: 'top 45%',
            end: 'bottom bottom',
            scrub: 0.6,
          },
        })

        // Entrada en orden, sin prisa: burbujas → titular letra por letra → textos
        // chicos → botella.
        const LETTERS_AT = 1.5
        gsap.to(intro, { bubbles: 1, duration: 1.8, ease: 'none' })
        letters.forEach(({ state: letter }, i) => {
          gsap.to(letter, {
            t: 1,
            duration: 1.25,
            ease: 'power3.out',
            delay: LETTERS_AT + i * 0.06,
          })
        })
        const lettersDone = LETTERS_AT + letters.length * 0.06 + 1.25
        gsap.to('[data-fizz-fade]', {
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          stagger: 0.1,
          delay: lettersDone - 0.7,
        })
        gsap.to('[data-fizz-arrow]', {
          y: 6,
          opacity: 0.35,
          duration: 0.85,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })
        gsap.delayedCall(lettersDone - 0.9, () => {
          introDone = true
          startBottle()
        })

        SplitText.create('[data-fizz-statement]', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1,
              ease: 'power4.out',
              stagger: 0.09,
              scrollTrigger: {
                trigger: '[data-fizz-statement]',
                start: 'top 78%',
              },
            }),
        })
        gsap.from('[data-fizz-cta]', {
          opacity: 0,
          y: 16,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: '[data-fizz-cta]', start: 'top 88%' },
        })
      }

      return () => {
        removeLayer()
        stage.clearPose('hero')
        clearTitle()
        camera.remove(titleGroup)
        camera.remove(marqueeMesh)
        marqueeMesh.material.uniforms.map.value?.dispose()
        marqueeMesh.material.dispose()
        planeGeo.dispose()
        scene.remove(bubbleMesh)
        bubbleMesh.geometry.dispose()
        bubbleMesh.material.dispose()
        canvasRef.current?.style.removeProperty('display')
        release()
      }
    },
    {
      scope: root,
      dependencies: [resolvedFlavor, modelUrl, envUrl, dracoPath, canImage, canLabel, title, marquee],
      revertOnUpdate: true,
    },
  )

  return (
    <section
      ref={root}
      className="relative"
      style={{
        backgroundColor: flavorCfg.bg,
        color: flavorCfg.ink,
        '--fizz-bg': flavorCfg.bg,
        '--fizz-ink': flavorCfg.ink,
      }}
    >
      {/* The FIZZ stage canvas (fixed, shared with FlavorWorlds). */}
      <canvas ref={canvasRef} aria-hidden="true" />

      <div className="relative z-[2]">
        <div className="pointer-events-none h-[170svh] calm:h-svh">
          <div className="flex h-svh flex-col justify-between px-5 pt-28 pb-6 md:px-10">
            <p
              data-fizz-fade
              className="max-w-[30ch] text-xs font-semibold uppercase tracking-[0.22em] opacity-0 md:text-sm"
            >
              {tagline}
            </p>

            <h1 ref={titleRef} className="sr-only font-brico">
              {title}
            </h1>

            <div className="flex items-end justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.2em] md:text-xs">
              <p data-fizz-fade className="hidden opacity-0 md:block">
                {meta}
              </p>
              <p data-fizz-fade className="ml-auto flex items-center gap-3 opacity-0 max-md:pb-2">
                {hint}
                <span aria-hidden="true" className="flex flex-col items-center gap-1">
                  <span className="h-8 w-px bg-current opacity-60 md:h-10" />
                  <span data-fizz-arrow className="block text-sm leading-none">
                    ↓
                  </span>
                </span>
              </p>
            </div>
          </div>
        </div>

        <div
          ref={statementRef}
          className="flex min-h-[90svh] items-start px-5 pt-8 pb-24 md:items-center md:px-10 md:pt-0"
        >
          <div className="md:w-[58%]">
            <p
              data-fizz-statement
              className="font-brico text-[clamp(2rem,5vw,5.25rem)] leading-[0.98] font-extrabold tracking-[-0.02em] uppercase"
            >
              {statement}
            </p>
            <a
              data-fizz-cta
              href={ctaHref}
              className="tpl-hit relative mt-10 inline-flex items-center rounded-full border border-current px-7 py-4 text-xs font-semibold uppercase tracking-[0.2em] transition-[background-color,color,transform] duration-300 ease-out hover:bg-[var(--fizz-ink)] hover:text-[var(--fizz-bg)] active:scale-[0.97] md:mt-14"
            >
              {cta}
            </a>
          </div>
        </div>

        {/* The «much fizz» stretch: the line itself is drawn in the canvas. */}
        <div ref={marqueeRef} aria-hidden="true" className="h-[220svh] calm:hidden" />
        <p className="sr-only">{marquee}</p>
      </div>
    </section>
  )
}
