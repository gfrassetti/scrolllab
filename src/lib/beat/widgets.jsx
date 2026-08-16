import { createContext, useContext, useMemo, useRef } from 'react'
import { MAG_SCROLL } from './engine.js'
import { useBeatStage } from './useBeatStage.js'

const BeatBag = createContext(null)

/**
 * Our widget canvas. Readymag had a page of widgets + seek(scrollTop).
 * This is the same idea: one pin, one clock, many Beats on a mag 1024 rail.
 *
 * GSAP only pins. Each <Beat> owns offset-path + its recipe.
 */
export function BeatStage({
  children,
  pin = true,
  magScroll = MAG_SCROLL,
  recipes: extraRecipes = {},
  dependencies = [],
  className,
  style,
}) {
  const root = useRef(null)
  const bag = useRef({ recipes: {} })
  const api = useMemo(
    () => ({
      register(id, recipe) {
        if (!id || !recipe) return
        bag.current.recipes[id] = recipe
      },
    }),
    [],
  )

  useBeatStage(root, {
    getRecipes: () => ({ ...extraRecipes, ...bag.current.recipes }),
    pin,
    magScroll,
    dependencies,
  })

  return (
    <BeatBag.Provider value={api}>
      <div
        ref={root}
        data-beat-stage
        className={className}
        style={style}
      >
        {children}
      </div>
    </BeatBag.Provider>
  )
}

/**
 * One widget on the stage. mag is rest pose on the 1024 canvas
 * (same units as Readymag dx/dy). recipe.scroll is the rail.
 */
export function Beat({
  id,
  mag,
  recipe,
  load,
  scroll,
  className,
  children,
  as: Tag = 'div',
}) {
  const bag = useContext(BeatBag)
  const resolved = recipe
    ? { mag: recipe.mag ?? mag, load: recipe.load ?? load, scroll: recipe.scroll ?? scroll }
    : { mag, load, scroll }

  if (bag && id) bag.register(id, resolved)

  return (
    <Tag data-beat={id} className={['beat-ac', className].filter(Boolean).join(' ')}>
      <div data-beat-load className="beat-ac">
        {children}
      </div>
    </Tag>
  )
}
