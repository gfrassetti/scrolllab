import { useState } from 'react'
import Collapse from './Collapse'

/**
 * El panel de una sección con muchos campos (la grilla del kit de tienda), en
 * grupos plegables. Un grupo con `switch` se enciende y apaga desde su título
 * (ej: «Cobrar con Shopify»); encendido muestra sus campos. Los campos con
 * `shopify: 'hide'` se ocultan con Shopify encendido y los `'only'` solo se ven
 * ahí. Todo abre y cierra con <Collapse>: nada aparece de golpe.
 */
function shopifyIsOn(props) {
  const value = props?.shopifyEnabled ?? (props?.shopifyDomain ? 'on' : 'off')
  return value === 'on'
}

function Chevron({ open }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block text-ink/50 transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
    >
      ›
    </span>
  )
}

function Switch({ on, label, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className="ui-press inline-flex min-h-11 shrink-0 items-center"
    >
      <span
        aria-hidden="true"
        className={`relative inline-block h-6 w-11 rounded-full border transition-colors duration-200 ease-out ${
          on ? 'border-ink bg-ink' : 'border-ink/30 bg-transparent'
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] size-[18px] rounded-full transition-transform duration-200 ease-out motion-reduce:transition-none ${
            on ? 'translate-x-5 bg-bone' : 'translate-x-0 bg-ink/45'
          }`}
        />
      </span>
    </button>
  )
}

function Group({ group, count, open, onOpen, switchOn, onSwitch, children }) {
  const switchable = Boolean(group.switch)
  const expanded = switchable ? switchOn : open
  return (
    <section className="border-b border-ink/15 last:border-b-0" data-field-group={group.id}>
      <div className="flex items-center justify-between gap-3">
        {switchable ? (
          <div className="min-w-0 py-3">
            <p className="text-sm font-medium">{group.title}</p>
          </div>
        ) : (
          <button
            type="button"
            aria-expanded={open}
            onClick={onOpen}
            className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 py-3 text-left text-sm font-medium"
          >
            <Chevron open={open} />
            <span className="truncate">{group.title}</span>
            <span className="text-xs font-normal text-ink/45 tabular-nums">{count}</span>
          </button>
        )}
        {switchable ? <Switch on={switchOn} label={group.title} onToggle={onSwitch} /> : null}
      </div>
      {switchable && group.note ? (
        <p className="-mt-1 mb-3 max-w-[44ch] text-xs leading-relaxed text-ink/55">{group.note}</p>
      ) : null}
      <Collapse open={expanded}>
        <div className="space-y-4 pb-5">{children}</div>
      </Collapse>
    </section>
  )
}

export default function FieldGroups({ groups, fields, props, renderField, onSwitch }) {
  const [openIds, setOpenIds] = useState(() => new Set(groups.filter((g) => g.open).map((g) => g.id)))
  const shopify = shopifyIsOn(props)
  const switchKeys = new Set(groups.map((g) => g.switch).filter(Boolean))
  const visible = (field) => {
    if (switchKeys.has(field.key)) return false
    if (field.shopify === 'hide') return !shopify
    if (field.shopify === 'only') return shopify
    return true
  }
  const toggleOpen = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div>
      {groups.map((group) => {
        const own = fields.filter((f) => (f.group || groups[0].id) === group.id && visible(f))
        if (!own.length && !group.switch) return null
        const switchOn = group.switch ? (group.switch === 'shopifyEnabled' ? shopify : props?.[group.switch] === 'on') : false
        return (
          <Group
            key={group.id}
            group={group}
            count={own.length}
            open={openIds.has(group.id)}
            onOpen={() => toggleOpen(group.id)}
            switchOn={switchOn}
            onSwitch={() => onSwitch(group.switch, switchOn ? 'off' : 'on')}
          >
            {own.map(renderField)}
          </Group>
        )
      })}
    </div>
  )
}
