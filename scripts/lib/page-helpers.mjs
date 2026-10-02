/**
 * Secciones de nivel superior del template, en orden, con el nombre del
 * componente de React (sirve en dev; en build se minifica). Lo comparten
 * check-mobile y check-motion: las dos recorren las mismas secciones.
 * Inyectar con `context.addInitScript(installBlockHelpers)`.
 */
export function installBlockHelpers() {
  window.__mc = window.__mc || {}
  const mc = window.__mc

  // componentOf queda en mc: installPageHelpers (check-mobile) también la usa.
  const fiberKey = (el) => Object.keys(el).find((k) => k.startsWith('__reactFiber$'))
  /** Nombre del componente de React más cercano (sirve en dev; en build se minifica). */
  mc.componentOf = (el) => {
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      const key = fiberKey(node)
      if (!key) continue
      for (let f = node[key]; f; f = f.return) {
        const t = f.type
        const raw = typeof t === 'function' ? t.displayName || t.name : t?.displayName
        const name = raw?.replace(/\$\d+$/, '')
        if (name && /^[A-Z][A-Za-z0-9]{2,}$/.test(name) && !/^(SmoothScrollProvider|StrictMode|Suspense)$/.test(name))
          return name
      }
    }
    return null
  }

  const isSectionish = (el) =>
    el.matches('section, footer, .pin-spacer') || el.querySelector(':scope > section, :scope > .pin-spacer')

  /** Secciones del template en orden: hijos de #top y de <main>, sin pin-spacers ni wrappers. */
  mc.blocks = () => {
    const root = document.getElementById('top') || document.body
    const out = []
    const push = (el) => {
      if (el.classList.contains('pin-spacer') && el.firstElementChild) el = el.firstElementChild
      const kids = [...el.children]
      if (el.tagName === 'DIV' && !el.id && kids.length > 1 && kids.every((c) => isSectionish(c))) {
        kids.forEach(push)
        return
      }
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      if (cs.display === 'none') return
      if (r.width <= 1 && r.height <= 1) return // skip links sr-only
      out.push(el)
    }
    for (const child of root.children) {
      if (child.tagName === 'MAIN') [...child.children].forEach(push)
      else push(child)
    }
    const seen = {}
    return out.map((el) => {
      const outer = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el
      const cs = getComputedStyle(el)
      let name = mc.componentOf(el) || el.tagName.toLowerCase()
      seen[name] = (seen[name] || 0) + 1
      if (seen[name] > 1) name = `${name} (${seen[name]})`
      const r = outer.getBoundingClientRect()
      return {
        el,
        name,
        fixed: cs.position === 'fixed',
        top: r.top + window.scrollY,
        height: r.height,
        pinned: outer !== el,
      }
    })
  }

  mc.blockMeta = () =>
    mc.blocks().map(({ name, fixed, top, height, pinned }) => ({ name, fixed, top, height, pinned }))

}
