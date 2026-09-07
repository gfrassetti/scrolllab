import { useI18n } from '../i18n'

/**
 * Un campo editable de sección. Tipos: text · textarea · select · color · href
 * · image (URL) · list (sub-campos text/textarea/href/color/image). El `image`
 * suelto de nivel raíz + `model` los sigue manejando cada editor inline cuando
 * traen upload. Compartido por LabEditorPage y BuilderPreview.
 *
 *   <SectionFieldRow field={field} value={props[field.key]} onChange={next => …} />
 *
 * `onChange` recibe un string, o un array de items para `list`.
 */

const inputCls =
  'mt-2 w-full border border-ink/20 bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-ink'
const selectCls =
  'mt-2 w-full border border-ink/20 bg-[#f2efe9] px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-ink'

function toPickerHex(v) {
  if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('')
  if (/^#[0-9a-f]{6,8}$/i.test(v)) return v.slice(0, 7)
  return '#000000'
}

function Scalar({ field, value, onChange }) {
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    )
  }

  if (field.type === 'color') {
    return (
      <div className="mt-2 flex items-center gap-2">
        <input
          type="color"
          value={toPickerHex(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer border border-ink/20 bg-transparent p-0"
          style={{ colorScheme: 'light' }}
          aria-label={field.label}
        />
        <input
          type="text"
          value={value}
          placeholder="#0e0e11 · rgba(14,14,17,.9)"
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-ink/20 bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-ink"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="reset"
            className="shrink-0 px-2 py-2 text-[13px] text-ink/40 hover:text-danger"
          >
            ×
          </button>
        ) : null}
      </div>
    )
  }

  if (field.type === 'href') {
    return (
      <input
        type="text"
        inputMode="url"
        value={value}
        placeholder="#seccion · /pagina · https://… · mailto:…"
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    )
  }

  if (field.type === 'image') {
    return (
      <div className="mt-2">
        <input
          type="text"
          inputMode="url"
          value={value}
          placeholder="https://… · /imagen.png"
          onChange={(e) => onChange(e.target.value)}
          className={inputCls.replace('mt-2 ', '')}
        />
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
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  )
}

export default function SectionFieldRow({ field, value, onChange }) {
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
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.2em] text-ink/50">
        {field.label}
      </span>
      <Scalar field={field} value={value ?? ''} onChange={onChange} />
      {field.type === 'href' ? (
        <span className="mt-1 block text-xs text-ink/45">
          {t('builder.hrefHint')}
        </span>
      ) : null}
    </label>
  )
}
