import { useState } from 'react'
import { useI18n } from '../i18n'
import ColorField from './ColorField'

/**
 * Un campo editable de sección. Tipos: text · textarea · select · color · href
 * · image / url (URL o ruta) · price · list (sub-campos text/textarea/href/
 * color/image/price). Compartido por LabEditorPage y BuilderPreview.
 *
 *   <SectionFieldRow field={field} value={props[field.key]} onChange={next => …} hint="…" />
 *
 * `onChange` recibe un string, o un array de items para `list`. `hint` es una
 * ayuda opcional debajo del campo (cada editor pone la suya). `absoluteUrls`:
 * imágenes solo con URL completa (LAB: la sección corre en otro dominio y una
 * /ruta no llega al sitio del cliente).
 */

const inputCls =
  'mt-2 w-full border border-ink/20 bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-ink'
const selectCls =
  'mt-2 w-full border border-ink/20 bg-[#f2efe9] px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-ink'

/** Tipos que el editor valida: lo tipeado puede no guardarse todavía. */
const VALIDATED = new Set(['color', 'href', 'url', 'image', 'price'])

/**
 * Lo tipeado se ve tal cual aunque todavía no sea válido ("h", "#1"); el valor
 * guardado, el que viaja al ZIP, cambia solo cuando lo es. Antes cada tecla que
 * dejaba el valor inválido lo borraba y un link o un color no se podían
 * escribir letra por letra. Un cambio que llega de afuera (reordenar filas, un
 * reset) manda sobre lo tipeado.
 */
function useDraft(value) {
  const saved = value ?? ''
  const [draft, setDraft] = useState(saved)
  const [prev, setPrev] = useState(saved)
  if (saved !== prev) {
    setPrev(saved)
    if (saved !== '' || prev === draft) setDraft(saved)
  }
  return [draft, setDraft]
}

function Scalar({ field, value, onChange, absoluteUrls = false }) {
  const { t } = useI18n()
  const [draft, setDraft] = useDraft(value)
  const edit = (next) => {
    setDraft(next)
    onChange(next)
  }
  const isUrl = field.type === 'image' || field.type === 'url'
  const invalid = VALIDATED.has(field.type) && draft.trim() !== '' && !value
  const warning = invalid ? (
    <span role="status" className="mt-1 block text-xs text-danger">
      {isUrl && absoluteUrls
        ? t('lab.invalidUrl')
        : t(`builder.invalid.${isUrl ? 'url' : field.type}`)}
    </span>
  ) : null

  if (field.type === 'toggle') {
    // Interruptor de una capa decorativa: sin valor queda prendido (la demo).
    const on = value !== 'off'
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => edit(on ? 'off' : 'on')}
        className="mt-2 inline-flex min-h-11 items-center gap-3 text-sm text-ink"
      >
        <span
          aria-hidden="true"
          className={`relative inline-block h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 ease-out ${
            on ? 'border-ink bg-ink' : 'border-ink/30 bg-transparent'
          }`}
        >
          <span
            className={`absolute top-[2px] left-[2px] size-[18px] rounded-full transition-transform duration-200 ease-out motion-reduce:transition-none ${
              on ? 'translate-x-5 bg-bone' : 'translate-x-0 bg-ink/45'
            }`}
          />
        </span>
        {on ? field.options?.[0]?.label : field.options?.[1]?.label}
      </button>
    )
  }

  if (field.type === 'select') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectCls}
        style={{ colorScheme: 'light' }}
      >
        {(field.options || []).map((o) => (
          <option
            key={o.value}
            value={o.value}
            style={{ backgroundColor: '#f2efe9', color: '#1a1a1a' }}
          >
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        rows={4}
        value={draft}
        onChange={(e) => edit(e.target.value)}
        className={inputCls}
      />
    )
  }

  if (field.type === 'color') {
    // Vacío = el color de la sección («Original»). Muestras + comodín + tipeado.
    return <ColorField label={field.label} value={value} draft={draft} onChange={edit} warning={warning} />
  }

  if (field.type === 'href' || field.type === 'url' || field.type === 'price') {
    const placeholder = {
      href: '#seccion · /pagina · https://… · mailto:…',
      url: absoluteUrls ? 'https://…' : 'https://… · /api/…',
      price: '15000',
    }[field.type]
    return (
      <>
        <input
          type="text"
          inputMode={field.type === 'price' ? 'decimal' : 'url'}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => edit(e.target.value)}
          className={inputCls}
        />
        {warning}
      </>
    )
  }

  if (field.type === 'image') {
    return (
      <div className="mt-2">
        <input
          type="text"
          inputMode="url"
          value={draft}
          placeholder={absoluteUrls ? 'https://…/imagen.jpg' : 'https://… · /imagen.png'}
          onChange={(e) => edit(e.target.value)}
          className={inputCls.replace('mt-2 ', '')}
        />
        {warning}
        {value ? (
          <img
            src={value}
            alt=""
            className="mt-2 h-16 w-auto rounded border border-ink/15 object-cover"
          />
        ) : null}
      </div>
    )
  }

  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => edit(e.target.value)}
      className={inputCls}
    />
  )
}

/** La guía del campo (`field.help`): cerrada no ocupa lugar; abierta, los pasos. */
function FieldHelp({ help }) {
  if (!help?.steps?.length) return null
  return (
    <details className="group mt-2 border border-ink/15 px-3 py-2">
      <summary className="tpl-hit relative cursor-pointer list-none text-[11px] uppercase tracking-[0.18em] text-ink/60 marker:hidden hover:text-ink [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="mr-1.5 inline-block transition-transform duration-200 group-open:rotate-90">
          ›
        </span>
        {help.title}
      </summary>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-ink/75">
        {help.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </details>
  )
}

export default function SectionFieldRow({ field, value, onChange, hint, absoluteUrls = false }) {
  const { t } = useI18n()

  if (field.type === 'list') {
    const items = Array.isArray(value) ? value : []
    const sub = field.item || []
    const max = field.max ?? 12

    const update = (i, k, v) =>
      onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
    const add = () =>
      onChange([...items, Object.fromEntries(sub.map((f) => [f.key, '']))])
    const remove = (i) => onChange(items.filter((_, j) => j !== i))
    const move = (i, d) => {
      const j = i + d
      if (j < 0 || j >= items.length) return
      const copy = items.slice()
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      onChange(copy)
    }

    return (
      <div className="block">
        <span className="text-[11px] uppercase tracking-[0.2em] text-ink/50">
          {field.label}
        </span>
        {hint ? <span className="mt-1 block text-xs text-ink/45">{hint}</span> : null}
        <div className="mt-2 space-y-3">
          {items.map((it, i) => (
            <div key={i} className="border border-ink/15 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] text-ink/40">
                  {i + 1}
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="px-1.5 text-ink/40 hover:text-ink disabled:opacity-30"
                    aria-label="subir"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                    className="px-1.5 text-ink/40 hover:text-ink disabled:opacity-30"
                    aria-label="bajar"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="px-1.5 text-ink/40 hover:text-danger"
                    aria-label="quitar"
                  >
                    ✕
                  </button>
                </span>
              </div>
              <div className="space-y-2">
                {sub.map((sf) => (
                  <label key={sf.key} className="block">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-ink/45">
                      {sf.label}
                    </span>
                    <Scalar
                      field={sf}
                      value={it[sf.key] ?? ''}
                      onChange={(v) => update(i, sf.key, v)}
                      absoluteUrls={absoluteUrls}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
          {items.length < max ? (
            <button
              type="button"
              onClick={add}
              className="ui-press w-full border border-dashed border-ink/30 py-2 text-[11px] uppercase tracking-[0.2em] text-ink/55 hover:border-ink/60 hover:text-ink"
            >
              ＋ {t('builder.listAdd')}
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="block">
      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.2em] text-ink/50">
          {field.label}
        </span>
        <Scalar
          field={field}
          value={value ?? ''}
          onChange={onChange}
          absoluteUrls={absoluteUrls}
        />
        {field.type === 'href' || hint ? (
          <span className="mt-1 block text-xs text-ink/45">
            {hint || t('builder.hrefHint')}
          </span>
        ) : null}
      </label>
      <FieldHelp help={field.help} />
    </div>
  )
}
