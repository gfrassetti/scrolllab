import { useRef } from 'react'
import * as THREE from 'three'
import { gsap, useGSAP, ScrollTrigger, SplitText } from '../../../lib/gsap'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { trackPointer } from '../../../lib/motion'
import {
  TITLE_FRAGMENT,
  TITLE_VERTEX,
  buildStandInBottle,
  buildStudioEnv,
  createBottle,
  createStageShadow,
  disposeObject,
  drawTitleLine,
  heroEndPose,
  loadBottleModel,
  loadHdrEnv,
} from './bottleKit'

const defaultWorlds = [
  {
    name: 'FLAVOR 01',
    tagline: 'Placeholder tagline one',
    body: 'Placeholder flavor copy. The bottle turns, the drink takes this color and the whole stage follows it.',
    bg: '#ffb02e',
    ink: '#241352',
    liquid: '#ff9a1f',
  },
  {
    name: 'FLAVOR 02',
    tagline: 'Placeholder tagline two',
    body: 'Swap this text for your own flavor story — the color change is the show, the words are yours.',
    bg: '#ff3ea5',
    ink: '#241352',
    liquid: '#ff2d8a',
  },
  {
    name: 'FLAVOR 03',
    tagline: 'Placeholder tagline three',
    body: 'One bottle, every flavor: the print on the glass changes while its back is turned.',
    bg: '#3ddc97',
    ink: '#241352',
    liquid: '#1fbf78',
  },
  {
    name: 'FLAVOR 04',
    tagline: 'Placeholder tagline four',
    body: 'A darker flavor to close the ride. Hold the beat, then release into the benefits below.',
    bg: '#241352',
    ink: '#fff3e2',
    liquid: '#7a5cff',
  },
]

const lerp = (a, b, t) => a + (b - a) * t

/** '#rrggbb' → { h, s, l } (h in degrees, s/l in percent). */
function hexToHsl(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let sat = 0
  if (d) {
    sat = d / (1 - Math.abs(2 * l - 1))
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return { h: (h + 360) % 360, s: sat * 100, l: l * 100 }
}

/**
 * FlavorWorlds — the flavor line-up, after La Revoltosa's products page. The
 * stage pins; the same glass bottle as the hero sits in the middle, a giant
 * index number behind it (in the canvas, so the glass refracts it) and the
 * flavor copy on the left. Each flavor that scrolls in triggers one change:
 * the bottle turns once and swaps its print while its back is turned, the
 * stage travels around the color wheel to the new color, the drink and the
 * seal take the flavor tint, and the copy leaves and lands letter by letter.
 *
 * It opens on `startBg`, the color the hero ends on, so the page never cuts.
 */
export default function FlavorWorlds({
  eyebrow = '',
  startBg = '#2c4bff',
  startInk = '#fff3e2',
  startLiquid = '#9db8ff',
  brand = 'BRAND*',
  cta = 'Placeholder CTA',
  ctaHref = '#',
  modelUrl = '',
  envUrl = '',
  dracoPath = '/fizz/draco/',
  worlds = defaultWorlds,
}) {
  const root = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const reducedMotion = useReducedMotion()

  useGSAP(
    () => {
      if (reducedMotion || !worlds.length) return undefined
      const stage = stageRef.current
      let W = stage.clientWidth
      let H = stage.clientHeight
      let narrow = W < 768
      let disposed = false

      const panels = gsap.utils.toArray('[data-world]', root.current)
      const steps = gsap.utils.toArray('[data-world-step]', root.current)
      const family = getComputedStyle(panels[0].querySelector('[data-world-name]')).fontFamily

      /* ── Canvas ─────────────────────────────────────────────── */
      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })
      const dpr = Math.min(window.devicePixelRatio * (narrow ? 1 : 1.25), narrow ? 1.5 : 2)
      renderer.setPixelRatio(dpr)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.NoToneMapping

      const scene = new THREE.Scene()
      const stageColor = new THREE.Color(startBg)
      scene.background = stageColor
      const envMap = buildStudioEnv(renderer, startBg)
      scene.environment = envMap
      let hdrEnv = null
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
      keyLight.position.set(-3, 4, 6)
      scene.add(keyLight)

      // 1 unidad = 1 px CSS en el plano z = 0, como en el hero.
      const camera = new THREE.PerspectiveCamera(30, 1, 10, 10000)
      scene.add(camera)

      /* ── El número gigante detrás de la botella ─────────────── */
      const planeGeo = new THREE.PlaneGeometry(1, 1)
      const numerals = worlds.map((world, i) => {
        const mesh = new THREE.Mesh(
          planeGeo,
          new THREE.ShaderMaterial({
            uniforms: {
              map: { value: null },
              uInk: { value: new THREE.Color(world.ink) },
              uPaper: { value: stageColor },
              uUv0: { value: 0 },
              uUv1: { value: 1 },
              uIn: { value: 1 },
              uFade: { value: 0 },
            },
            vertexShader: TITLE_VERTEX,
            fragmentShader: TITLE_FRAGMENT,
          }),
        )
        camera.add(mesh)
        return { mesh, label: String(i + 1).padStart(2, '0'), w: 1, h: 1, s: 0, r: 0.8, o: 0 }
      })
      const layoutNumerals = () => {
        numerals.forEach((n) => {
          n.mesh.material.uniforms.map.value?.dispose()
          const drawn = drawTitleLine(n.label, {
            family,
            weight: 800,
            tracking: -0.04,
            targetWidth: 1e6,
            maxSize: H * (narrow ? 0.42 : 0.82),
            dpr,
          })
          n.mesh.material.uniforms.map.value = drawn.texture
          n.w = drawn.width
          n.h = drawn.height
        })
      }

      /* ── Botella ───────────────────────────────────────────── */
      const rig = new THREE.Group()
      const spin = new THREE.Group()
      rig.add(spin)
      rig.visible = false
      scene.add(rig)
      const shadow = createStageShadow(stageColor, { W, H })
      scene.add(shadow.mesh)
      const bottle = createBottle({ narrow, liquid: startLiquid, stage: startBg })
      let model = null
      let printFor = -1
      const paintPrint = (i) => {
        if (!model) return
        printFor = i
        bottle.paintPrint({ family, brand, subtitle: i < 0 ? undefined : worlds[i].name })
      }
      const mountModel = (object) => {
        model = object
        bottle.dress(model, { isDisposed: () => disposed })
        paintPrint(state.index)
        spin.add(model)
        rig.visible = true
      }

      /* ── Estado y medidas ──────────────────────────────────── */
      // hand: 1 = la botella está donde la dejó el hero; 0 = en su lugar de los sabores.
      const state = { index: -1, hand: 1, turn: 0, spin: 0, dip: 0, top: 0 }
      const pointer = trackPointer()
      const look = { x: 0, y: 0 }
      const hsl = hexToHsl(startBg)
      let hue = hsl.h
      const paintStage = () => {
        stageColor.setHSL(hsl.h / 360, hsl.s / 100, hsl.l / 100, THREE.SRGBColorSpace)
        root.current.style.backgroundColor = `hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)`
      }

      let cameraZ = 1
      const layout = () => {
        W = stage.clientWidth
        H = stage.clientHeight
        narrow = W < 768
        renderer.setSize(W, H, false)
        cameraZ = H / (2 * Math.tan((Math.PI / 180) * 15))
        camera.aspect = W / Math.max(H, 1)
        camera.near = cameraZ / 10
        camera.far = cameraZ * 10
        camera.position.z = cameraZ
        camera.updateProjectionMatrix()
        numerals.forEach((n) => {
          n.mesh.position.z = -cameraZ
        })
        layoutNumerals()
      }

      const pose = (time) => {
        // La posición de la botella cuando termina el hero, en pantalla.
        const end = heroEndPose({ W, H, narrow, time, look })
        const size = narrow ? Math.min(H * 0.46, W * 1.2) : Math.min(H * 0.8, W * 0.5)
        const bob = Math.sin(time * 1.05) * H * 0.016
        const sway = Math.sin(time * 0.31) * 0.35
        const own = {
          x: narrow ? 0 : W * 0.06,
          y: (narrow ? H * 0.16 : -H * 0.02) + bob,
          scale: size * (1 - state.dip * 0.08),
          rotZ: -0.12 + state.dip * 0.18,
          rotX: 0.08 + look.y * 0.06,
          spinY: state.spin + sway + look.x * 0.25,
        }
        // Mientras este escenario sube a su lugar, la botella sigue clavada en el
        // mismo punto de la pantalla que en el hero (`state.top` es lo que falta).
        const hand = state.hand
        rig.position.set(
          lerp(own.x, end.x, hand),
          lerp(own.y, end.y + Math.max(state.top, 0), hand),
          0,
        )
        rig.rotation.z = lerp(own.rotZ, end.rotZ, hand)
        rig.rotation.x = lerp(own.rotX, end.rotX, hand)
        spin.rotation.y = lerp(own.spinY, end.spinY, hand) + state.turn
        rig.scale.setScalar(lerp(own.scale, end.scale, hand))
        shadow.place({
          x: rig.position.x,
          y: rig.position.y,
          scale: rig.scale.x,
          rotZ: rig.rotation.z,
          strength: 0.55,
        })
        numerals.forEach((n) => {
          n.mesh.position.x = narrow ? 0 : W * 0.24
          n.mesh.position.y = narrow ? H * 0.16 : -H * 0.01
          n.mesh.scale.set(n.w * n.s, n.h * n.s, 1)
          n.mesh.rotation.z = n.r
          n.mesh.visible = n.o > 0.002
          n.mesh.material.uniforms.uFade.value = n.o * 0.24
        })
      }

      let onScreen = false
      const io = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting
      })
      io.observe(root.current)

      const tick = (time, deltaMs) => {
        if (!onScreen) return
        const dt = Math.min(deltaMs / 1000, 0.05)
        state.top = stage.getBoundingClientRect().top
        // Mismo parallax del puntero que el hero: en el empalme no se nota el corte.
        camera.position.x += (pointer.x * W * 0.04 - camera.position.x) * 0.03
        camera.position.y += (-pointer.y * H * 0.04 - camera.position.y) * 0.03
        const follow = 1 - Math.exp(-dt * 12)
        look.x += (pointer.x - look.x) * follow
        look.y += (pointer.y - look.y) * follow
        pose(time)
        bottle.update(time)
        renderer.render(scene, camera)
      }

      /* ── Copy ──────────────────────────────────────────────── */
      const splits = panels.map((panel) =>
        SplitText.create(panel.querySelector('[data-world-name]'), { type: 'chars' }),
      )
      const lines = panels.map((panel) => panel.querySelectorAll('[data-world-line]'))
      gsap.set(panels, { autoAlpha: 0 })

      const copyOut = (i) => {
        if (i < 0) return
        gsap.to(gsap.utils.shuffle([...splits[i].chars]), {
          yPercent: 100,
          scale: 0.8,
          opacity: 0,
          duration: 0.45,
          stagger: 0.012,
          ease: 'power4.in',
          overwrite: true,
        })
        gsap.to(lines[i], { y: 40, opacity: 0, duration: 0.4, ease: 'power3.in', overwrite: true })
        gsap.to(panels[i], { autoAlpha: 0, duration: 0.01, delay: 0.55, overwrite: true })
      }
      const copyIn = (i, delay) => {
        if (i < 0) return
        gsap.set(panels[i], { autoAlpha: 1, overwrite: true })
        gsap.fromTo(
          gsap.utils.shuffle([...splits[i].chars]),
          { yPercent: 100, scale: 0.8, opacity: 0 },
          {
            yPercent: 0,
            scale: 1,
            opacity: 1,
            duration: 1,
            stagger: 0.02,
            ease: 'power4.out',
            delay,
            overwrite: true,
          },
        )
        gsap.fromTo(
          lines[i],
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: 'power4.out', delay: delay + 0.2, overwrite: true },
        )
      }

      /* ── Cambio de sabor ───────────────────────────────────── */
      const goTo = (next) => {
        const prev = state.index
        if (next === prev) return
        state.index = next
        const world = next < 0 ? null : worlds[next]
        const bg = world ? world.bg : startBg
        const ink = world ? world.ink : startInk

        // Fondo: por la rueda de color, nunca por el gris de una mezcla.
        const target = hexToHsl(bg)
        let h = target.h
        while (h - hue > 180) h -= 360
        while (h - hue < -180) h += 360
        hue = h
        gsap.to(hsl, { h, s: target.s, l: target.l, duration: 1, ease: 'sine.inOut', onUpdate: paintStage, overwrite: true })
        gsap.to(root.current, { color: ink, duration: 0.8, ease: 'sine.inOut', overwrite: true })

        // El líquido y el sello toman el color del sabor; el velo, el del escenario.
        const liquid = new THREE.Color(world ? world.liquid || world.bg : startLiquid)
        const veil = new THREE.Color(bg).lerp(new THREE.Color(0xffffff), 0.6)
        const seal = new THREE.Color(bg).multiplyScalar(0.5)
        ;[
          [bottle.colors.tint, liquid],
          [bottle.colors.veil, veil],
          [bottle.colors.seal, seal],
        ].forEach(([from, to]) =>
          gsap.to(from, { r: to.r, g: to.g, b: to.b, duration: 0.9, ease: 'sine.inOut', overwrite: true }),
        )

        // La botella es la del hero: no entra ni se va, solo se acomoda. La primera
        // vez pasa de su lugar del empalme al de los sabores con una vuelta, y la
        // serigrafía cambia cuando queda de espaldas.
        if (prev < 0 && next >= 0) {
          gsap.to(state, { hand: 0, duration: 1.5, ease: 'power3.inOut', overwrite: 'auto' })
          gsap.fromTo(state, { turn: -Math.PI * 2 }, { turn: 0, duration: 1.5, ease: 'power3.out', overwrite: 'auto' })
          gsap.delayedCall(0.55, () => {
            if (state.index >= 0 && printFor !== state.index) paintPrint(state.index)
          })
        } else if (next < 0) {
          gsap.to(state, { hand: 1, duration: 1, ease: 'power3.inOut', overwrite: 'auto' })
          gsap.delayedCall(0.5, () => {
            if (state.index < 0 && printFor !== -1) paintPrint(-1)
          })
        } else {
          const turn = next > prev ? Math.PI * 2 : -Math.PI * 2
          gsap.to(state, { spin: state.spin + turn, duration: 1.1, ease: 'power3.inOut', overwrite: 'auto' })
          gsap.fromTo(state, { dip: 0 }, { dip: 1, duration: 0.55, ease: 'sine.inOut', yoyo: true, repeat: 1, overwrite: 'auto' })
          gsap.delayedCall(0.5, () => {
            if (state.index === next && printFor !== next) paintPrint(next)
          })
        }

        // El número: el que se va gira y se achica; el que llega hace lo contrario.
        if (prev >= 0) {
          gsap.to(numerals[prev], { s: 0.4, r: -0.8, o: 0, duration: 0.7, ease: 'power2.in', overwrite: true })
        }
        if (next >= 0) {
          gsap.fromTo(
            numerals[next],
            { s: 0.4, r: 0.8, o: 0 },
            { s: 1, r: 0, o: 1, duration: 1.2, ease: 'power4.out', delay: 0.25, overwrite: true },
          )
        }

        copyOut(prev)
        copyIn(next, prev < 0 ? 0.5 : 0.45)
      }

      /* ── Arranque ──────────────────────────────────────────── */
      layout()
      paintStage()
      const ro = new ResizeObserver(() => {
        if (stage.clientWidth === W && stage.clientHeight === H) return
        layout()
      })
      ro.observe(stage)
      document.fonts?.ready.then(() => {
        if (disposed) return
        layoutNumerals()
        if (model) paintPrint(state.index)
      })
      if (envUrl) {
        loadHdrEnv(renderer, envUrl)
          .then((env) => {
            if (disposed) return env.dispose()
            hdrEnv = env
            scene.environment = env
            scene.environmentRotation.set(0, Math.PI * 0.55, 0)
          })
          .catch(() => {})
      }
      if (modelUrl) {
        loadBottleModel(modelUrl, dracoPath)
          .then((object) => {
            if (disposed) return disposeObject(object)
            mountModel(object)
          })
          .catch(() => {
            if (!disposed) mountModel(buildStandInBottle())
          })
      } else {
        mountModel(buildStandInBottle())
      }
      gsap.ticker.add(tick)

      // Un paso de scroll por sabor. El primero arranca cuando el escenario ya
      // quedó solo en pantalla; los demás, al pasar el 55 % de la pantalla.
      const triggers = steps.map((step, i) =>
        ScrollTrigger.create({
          trigger: step,
          start: i === 0 ? 'top top' : 'top 55%',
          onEnter: () => goTo(i),
          onLeaveBack: () => goTo(i - 1),
        }),
      )

      return () => {
        disposed = true
        triggers.forEach((t) => t.kill())
        ro.disconnect()
        io.disconnect()
        gsap.ticker.remove(tick)
        splits.forEach((split) => split.revert())
        numerals.forEach((n) => {
          n.mesh.material.uniforms.map.value?.dispose()
          n.mesh.material.dispose()
        })
        planeGeo.dispose()
        shadow.dispose()
        pointer.dispose?.()
        bottle.dispose()
        if (model) disposeObject(model)
        envMap.dispose()
        hdrEnv?.dispose()
        renderer.dispose()
      }
    },
    {
      scope: root,
      dependencies: [worlds, startBg, startInk, startLiquid, brand, modelUrl, envUrl, dracoPath, reducedMotion],
      revertOnUpdate: true,
    },
  )

  // Sin motion no hay escenario fijo: los sabores van uno debajo del otro,
  // cada uno con su color.
  if (reducedMotion) {
    return (
      <section ref={root} className="relative">
        {worlds.map((world, i) => (
          <div
            key={world.name}
            className="flex min-h-[80svh] flex-col px-5 py-16 md:px-10 md:py-20"
            style={{ backgroundColor: world.bg, color: world.ink }}
          >
            {i === 0 && eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] opacity-60 md:text-xs">
                {eyebrow}
              </p>
            ) : null}
            <article className="flex flex-1 flex-col justify-center">
              <WorldCopy world={world} index={i} total={worlds.length} cta={cta} ctaHref={ctaHref} />
            </article>
          </div>
        ))}
      </section>
    )
  }

  return (
    <section
      ref={root}
      className="relative"
      style={{ backgroundColor: startBg, color: startInk }}
    >
      <div ref={stageRef} className="sticky top-0 h-svh w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 block h-full w-full"
        />

        <div className="relative z-10 flex h-full flex-col px-5 py-16 md:px-10 md:py-20">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] opacity-60 md:text-xs">
              {eyebrow}
            </p>
          ) : null}

          <div className="relative flex-1">
            {worlds.map((world, i) => (
              <article
                key={world.name}
                data-world
                className="invisible absolute inset-x-0 bottom-6 flex flex-col md:top-1/2 md:bottom-auto md:w-[44%] md:-translate-y-1/2"
              >
                <WorldCopy world={world} index={i} total={worlds.length} cta={cta} ctaHref={ctaHref} />
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="-mt-[100svh]" aria-hidden="true">
        {worlds.map((world) => (
          <div key={`step-${world.name}`} data-world-step className="h-svh" />
        ))}
        <div className="h-[60svh]" />
      </div>
    </section>
  )
}

function WorldCopy({ world, index, total, cta, ctaHref }) {
  return (
    <>
      <p data-world-line className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-70 md:text-xs">
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </p>

      <h2
        data-world-name
        className="mt-3 font-brico text-[clamp(2.75rem,8vw,7.5rem)] leading-[0.9] font-extrabold tracking-[-0.03em] uppercase md:mt-4"
      >
        {world.name}
      </h2>

      <p data-world-line className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] md:mt-5 md:text-base">
        {world.tagline}
      </p>

      <p data-world-line className="mt-3 max-w-[40ch] text-sm leading-relaxed opacity-80 md:mt-5 md:text-base">
        {world.body}
      </p>

      <span data-world-line className="mt-6 block md:mt-8">
        <a
          href={ctaHref}
          className="tpl-hit relative inline-flex items-center rounded-full border border-current px-7 py-4 text-xs font-semibold uppercase tracking-[0.2em] transition-[background-color,color,transform] duration-300 ease-out hover:bg-[var(--world-ink)] hover:text-[var(--world-bg)] active:scale-[0.97]"
          style={{ '--world-ink': world.ink, '--world-bg': world.bg }}
        >
          {cta}
        </a>
      </span>
    </>
  )
}
