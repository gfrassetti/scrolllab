import { gsap, useGSAP } from '../gsap.js'
import {
  MAG_SCROLL,
  magScale,
  attachScroll,
  playLoadPath,
  placeMag,
  nestInner,
  openPinOverflow,
} from './engine.js'

function collectBeatNodes(stage, recipes) {
  const bound = new Set()
  const nodes = []

  const add = (el, id) => {
    if (!el || !id || bound.has(el)) return
    bound.add(el)
    nodes.push({ el, id })
  }

  stage.querySelectorAll('[data-beat]').forEach((el) => {
    add(el, el.getAttribute('data-beat'))
  })

  Object.keys(recipes).forEach((id) => {
    const safe = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id
    add(stage.querySelector(`#${safe}`), id)
    stage.querySelectorAll(`.beat-${safe}`).forEach((el) => add(el, id))
  })

  return nodes
}

/**
 * Bind every Beat node inside the scope to a recipe.
 *
 * Markup (any of these, inside [data-beat-stage]):
 *   data-beat="<id>"     — canonical
 *   id="<id>"            — same key as recipes
 *   class="beat-<id>"    — same key as recipes
 *
 * recipes[id] = { mag?, scroll?: Step[], load?: Step }
 *            or a function (el, scale) => that object
 * getRecipes() — read the map after children register (Beat widgets).
 */
export function useBeatStage(
  scope,
  {
    recipes = {},
    getRecipes,
    pin = true,
    magScroll = MAG_SCROLL,
    dependencies = [],
  } = {},
) {
  useGSAP(
    () => {
      const root = scope.current
      if (!root) return undefined
      const stage = root.matches?.('[data-beat-stage]')
        ? root
        : root.querySelector('[data-beat-stage]') || root
      const s = magScale(stage.offsetWidth || root.offsetWidth || 1024)
      const map = getRecipes ? getRecipes() : recipes
      const players = []
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      collectBeatNodes(stage, map).forEach(({ el, id }) => {
        const raw = map[id]
        const recipe = typeof raw === 'function' ? raw(el, s) : raw
        if (!recipe) return
        if (recipe.mag) {
          placeMag(el, recipe.mag, s)
          const inner = el.querySelector('[data-beat-load]')
          if (inner) nestInner(inner)
        }
        if (reduced) return
        const loadEl = el.querySelector('[data-beat-load]') || el
        if (recipe.load) playLoadPath(loadEl, recipe.load, s)
        if (recipe.scroll?.length) players.push(attachScroll(el, recipe.scroll, s))
      })

      if (reduced) return undefined
      if (!players.length && !pin) return undefined

      const range = magScroll * s
      const trigger = pin ? stage : root
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger,
          start: 'top top',
          end: `+=${range}px`,
          pin: pin ? true : false,
          scrub: true,
          anticipatePin: pin ? 1 : 0,
          invalidateOnRefresh: true,
          onRefresh: pin ? openPinOverflow : undefined,
          onEnter: pin ? openPinOverflow : undefined,
          onEnterBack: pin ? openPinOverflow : undefined,
          onUpdate(self) {
            const px = self.progress * range
            players.forEach((p) => p.seek(px))
          },
        },
      })
    },
    { scope, dependencies },
  )
}
