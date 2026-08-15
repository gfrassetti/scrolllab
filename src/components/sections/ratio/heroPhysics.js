import Matter from 'matter-js'
import { gsap } from '../../../lib/gsap'

/**
 * Rupture-only: letters become live bodies the cube can throw.
 * Glyphs stay in document flow — we only paint transform.
 * The cube stays a GSAP object; a static Matter body tracks it for hits.
 */
export function startHeroPhysics({ worldEl, cube, glyphs }) {
  const { Engine, Bodies, Body, Composite } = Matter
  const engine = Engine.create({ gravity: { x: 0, y: 1.2 } })
  engine.positionIterations = 10
  engine.velocityIterations = 8

  const box = () => worldEl.getBoundingClientRect()

  const localOf = (el) => {
    const b = box()
    const r = el.getBoundingClientRect()
    return {
      w: r.width,
      h: r.height,
      x: r.left - b.left + r.width / 2,
      y: r.top - b.top + r.height / 2,
    }
  }

  const origin = box()
  const W = origin.width
  const H = origin.height

  const floor = Bodies.rectangle(W / 2, H + 40, W * 8, 80, { isStatic: true })
  const wallL = Bodies.rectangle(-40, H / 2, 80, H * 6, { isStatic: true })
  const wallR = Bodies.rectangle(W + 40, H / 2, 80, H * 6, { isStatic: true })

  const cube0 = localOf(cube)
  const cubeBody = Bodies.rectangle(cube0.x, cube0.y, cube0.w, cube0.h, {
    isStatic: true,
    restitution: 0.15,
    friction: 0.05,
    label: 'cube',
  })

  const letters = glyphs.map((el) => {
    const m = localOf(el)
    gsap.killTweensOf(el)
    const body = Bodies.rectangle(m.x, m.y, Math.max(16, m.w), Math.max(18, m.h), {
      density: 0.0005,
      restitution: 0.55,
      friction: 0.04,
      frictionAir: 0.012,
      label: 'glyph',
    })
    return { el, body, restX: m.x, restY: m.y }
  })

  Composite.add(engine.world, [
    floor,
    wallL,
    wallR,
    cubeBody,
    ...letters.map((l) => l.body),
  ])

  let running = true
  let last = performance.now()

  const tick = (now) => {
    if (!running) return
    const dt = Math.min(32, now - last)
    last = now

    const c = localOf(cube)
    Body.setPosition(cubeBody, { x: c.x, y: c.y })
    Body.setAngle(cubeBody, ((gsap.getProperty(cube, 'rotation') || 0) * Math.PI) / 180)

    Engine.update(engine, dt)

    letters.forEach((l) => {
      const dx = l.body.position.x - l.restX
      const dy = l.body.position.y - l.restY
      l.el.style.transform = `translate(${dx}px, ${dy}px) rotate(${l.body.angle}rad)`
    })

    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)

  return () => {
    running = false
    Composite.clear(engine.world, false)
    Engine.clear(engine)
    glyphs.forEach((el) => {
      el.style.transform = ''
    })
  }
}
