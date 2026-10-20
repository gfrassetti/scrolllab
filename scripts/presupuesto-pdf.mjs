/**
 * Presupuesto TXT → PDF con diseño. Lee un presupuesto escrito con el modelo del Estudio
 * («Estudio — modelo de presupuesto» en Obsidian) y genera el PDF al lado, con el mismo nombre.
 *
 *   node scripts/presupuesto-pdf.mjs <presupuesto.txt> [--accent=#e4601d] [--ink=#111113]
 *
 * Reglas del TXT que entiende: título + «====»; cabecera (Fecha, Válido, Para, De); secciones
 * «N. TÍTULO» entre líneas de guiones; subtítulos en MAYÚSCULAS; viñetas «·» (las líneas siguientes
 * más indentadas las continúan); listas «1.»; ítems con precio «nombre ..... USD x»; el precio grande
 * de la inversión (indentado 8); la firma al final.
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const file = process.argv[2]
if (!file) throw new Error('falta el TXT: node scripts/presupuesto-pdf.mjs <presupuesto.txt>')
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d
const ACCENT = arg('accent', '#e4601d')
const INK = arg('ink', '#111113')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const link = (s) => esc(s).replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1">$1</a>').replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g, '<a href="mailto:$1">$1</a>')
const RULE = /^-{10,}$/

const lines = fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n')
const title = lines[0].trim()

// cabecera: hasta la primera regla
let i = 2
const head = []
while (i < lines.length && !RULE.test(lines[i].trim())) head.push(lines[i++])

// secciones
const sections = []
let sig = []
while (i < lines.length) {
  if (RULE.test(lines[i].trim()) && /^\d+\.\s/.test((lines[i + 1] || '').trim()) && RULE.test((lines[i + 2] || '').trim())) {
    const [, num, name] = lines[i + 1].trim().match(/^(\d+)\.\s+(.*)$/)
    i += 3
    const body = []
    while (i < lines.length && !RULE.test(lines[i].trim())) body.push(lines[i++])
    sections.push({ num, name, body })
  } else if (RULE.test(lines[i].trim())) {
    sig = lines.slice(i + 1).filter((l) => l.trim())
    break
  } else i++
}

// cuerpo de una sección → HTML
function renderBody(body) {
  const out = []
  let k = 0
  const cont = (minIndent) => {
    const parts = []
    while (k < body.length && body[k].trim() && body[k].search(/\S/) >= minIndent && !/^\s*(·|\d+\.)\s/.test(body[k])) parts.push(body[k++].trim())
    return parts
  }
  while (k < body.length) {
    const l = body[k]
    const t = l.trim()
    const ind = l.search(/\S/)
    if (!t) {
      k++
      continue
    }
    const price = t.match(/^·\s+(.+?)\s+\.{3,}\s+(USD .+)$/)
    if (price) {
      k++
      const desc = cont(ind + 2)
      out.push(`<div class="opt"><div class="opt-h"><span>${esc(price[1])}</span><span class="dots"></span><b>${esc(price[2])}</b></div>${desc.length ? `<p>${link(desc.join(' '))}</p>` : ''}</div>`)
      continue
    }
    if (/^·\s/.test(t)) {
      k++
      const text = [t.replace(/^·\s+/, ''), ...cont(ind + 2)].join(' ')
      out.push(`<li>${link(text)}</li>`)
      continue
    }
    const num = t.match(/^(\d+)\.\s+(.*)$/)
    if (num) {
      k++
      const text = [num[2], ...cont(ind + 2)].join(' ')
      const m = text.match(/^([^:]+):\s*(.*)$/)
      out.push(`<li class="num"><i>${num[1].padStart(2, '0')}</i><span>${m ? `<b>${esc(m[1])}</b> ${link(m[2])}` : link(text)}</span></li>`)
      continue
    }
    if (ind >= 8 && /USD/.test(t)) {
      // el precio grande y su línea en pesos
      k++
      const more = cont(ind)
      const lead = out.length && /^<p>/.test(out[out.length - 1]) ? out.pop() : ''
      out.push(`<div class="keep">${lead}<div class="total"><span>Total</span><strong>${esc(t)}</strong>${more.length ? `<p>${esc(more.join(' '))}</p>` : ''}</div></div>`)
      continue
    }
    const nextLine = body.slice(k + 1).find((x) => x.trim()) || ''
    const beforeList = /^\s*(·|\d+\.)\s/.test(nextLine) && !/\.$/.test(t) && t.length < 60
    if ((/^[A-ZÁÉÍÓÚÑ0-9 ()/,·.-]+$/.test(t) && t.length < 60 && /[A-Z]/.test(t)) || beforeList) {
      k++
      out.push(`<h3>${esc(t.replace(/:$/, ''))}</h3>`)
      continue
    }
    // párrafo (o un renglón «Etiqueta:» seguido de un valor)
    k++
    const para = [t, ...cont(ind)]
    const txt = para.join(' ')
    const lead = txt.match(/^([A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ ]{3,}):\s*(.*)$/)
    out.push(lead ? `<p class="note"><b>${esc(lead[1])}.</b> ${link(lead[2])}</p>` : `<p>${link(txt)}</p>`)
  }
  // agrupar <li> consecutivos en listas
  return out
    .join('\n')
    .replace(/((?:<li class="num">[\s\S]*?<\/li>\n?)+)/g, '<ol>$1</ol>')
    .replace(/((?:<li>[\s\S]*?<\/li>\n?)+)/g, '<ul>$1</ul>')
}

// cabecera → meta
const meta = {}
let lastKey = null
for (const l of head) {
  const m = l.match(/^(\w[\wáéíóú ]*):\s+(.*)$/)
  if (m) {
    lastKey = m[1]
    meta[lastKey] = [m[2].trim()]
  } else if (l.trim() && lastKey) meta[lastKey].push(l.trim())
}
const metaHtml = (k) => (meta[k] || []).map((x, n) => (n ? `<span>${link(x)}</span>` : `<b>${link(x)}</b>`)).join('')

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Roboto+Mono:wght@300;400;500&family=Barlow:wght@400;500;600&display=block">
<style>
  @page { size: A4; margin: 18mm 17mm 20mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 400 10pt/1.45 'Barlow', sans-serif; color: ${INK}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  a { color: inherit; text-decoration: none; border-bottom: 1px solid ${ACCENT}66; }
  .cover { background: ${INK}; color: #f2e9dc; margin: 0 0 9mm; padding: 13mm 12mm 11mm; border-radius: 3mm; position: relative; overflow: hidden; }
  .cover:after { content: ''; position: absolute; right: -38mm; top: -62mm; width: 96mm; height: 96mm; border-radius: 50%; border: 11mm solid ${ACCENT}; }
  .kicker { font: 500 8pt 'Roboto Mono', monospace; letter-spacing: .22em; text-transform: uppercase; color: ${ACCENT}; display: flex; align-items: center; gap: 10px; }
  .kicker:before { content: ''; width: 26px; height: 1px; background: ${ACCENT}; }
  h1 { font: 700 28pt/1 'Chakra Petch', sans-serif; text-transform: uppercase; margin: 6mm 0 0; letter-spacing: -.01em; position: relative; z-index: 1; max-width: 120mm; }
  h1 em { font-style: normal; color: ${ACCENT}; display: block; font: 300 27pt/1.05 'Roboto Mono', monospace; text-transform: none; letter-spacing: -.04em; }
  .meta { display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: 6mm; margin-top: 10mm; position: relative; z-index: 1; }
  .meta div { border-top: 1px solid #f2e9dc44; padding-top: 3mm; font-size: 9pt; }
  .meta label { display: block; font: 500 7pt 'Roboto Mono', monospace; letter-spacing: .2em; text-transform: uppercase; opacity: .6; margin-bottom: 1.5mm; }
  .meta b, .meta span { display: block; font-weight: 500; }
  .meta span { font-weight: 400; opacity: .82; }
  section { margin: 0 0 6mm; }
  section:has(.total) { break-inside: avoid; } /* la inversión, entera en una página */
  .keep { break-inside: avoid; } /* la frase de la inversión va con su precio */

  h2 { display: flex; align-items: baseline; gap: 4mm; font: 600 13pt 'Chakra Petch', sans-serif; text-transform: uppercase; letter-spacing: .02em; margin: 0 0 3.5mm; padding-bottom: 2mm; border-bottom: 1.5px solid ${INK}; break-after: avoid; }
  h2 i { font: 500 9pt 'Roboto Mono', monospace; color: ${ACCENT}; font-style: normal; }
  h3 { font: 600 8pt 'Roboto Mono', monospace; letter-spacing: .18em; text-transform: uppercase; color: ${ACCENT}; margin: 3.8mm 0 1.3mm; break-after: avoid; }
  p { margin: 0 0 2.5mm; }
  ul { margin: 0 0 2mm; padding: 0; list-style: none; }
  ul li { position: relative; padding-left: 5mm; margin: 0 0 1.1mm; break-inside: avoid; }
  ul li:before { content: ''; position: absolute; left: 0; top: .62em; width: 2.2mm; height: 2.2mm; background: ${ACCENT}; transform: translateY(-50%); }
  ol { margin: 0 0 2mm; padding: 0; list-style: none; }
  ol li { display: grid; grid-template-columns: 9mm 1fr; margin: 0 0 1.6mm; break-inside: avoid; }
  ol li i { font: 500 8.5pt 'Roboto Mono', monospace; color: ${ACCENT}; font-style: normal; padding-top: .15em; }
  .opt { padding: 2.6mm 0; border-bottom: 1px solid ${INK}1f; break-inside: avoid; }
  .opt-h { display: flex; align-items: baseline; gap: 3mm; font-weight: 600; }
  .opt-h .dots { flex: 1; height: 2px; align-self: center; transform: translateY(3px); background-image: radial-gradient(circle, ${INK}70 0.6px, transparent 0.8px); background-size: 4px 2px; background-repeat: repeat-x; }
  .opt-h b { font: 500 10pt 'Roboto Mono', monospace; white-space: nowrap; }
  .opt p { margin: 1mm 0 0; font-size: 9.4pt; opacity: .78; max-width: 140mm; }
  .total { margin: 3mm 0 4mm; break-inside: avoid; } /* sin caja: el precio, en el mismo tono que el resto */
  .total span { display: block; font: 600 8pt 'Roboto Mono', monospace; letter-spacing: .18em; text-transform: uppercase; color: ${ACCENT}; }
  .total strong { display: block; font: 700 17pt/1.1 'Chakra Petch', sans-serif; margin: 1.2mm 0 1mm; }
  .total p { margin: 0; font-size: 9.6pt; opacity: .75; }
  .note { font-size: 9.2pt; opacity: .8; }
  .sig { margin-top: 5mm; padding-top: 4mm; border-top: 1.5px solid ${INK}; display: flex; justify-content: space-between; align-items: end; break-inside: avoid; }
  .sig b { font: 600 14pt 'Chakra Petch', sans-serif; text-transform: uppercase; display: block; }
  .sig span { display: block; font-size: 9.2pt; opacity: .75; }
  .gf { width: 26mm; height: auto; color: ${INK}; }
</style></head><body>
<header class="cover">
  <p class="kicker">Presupuesto</p>
  <h1>${esc(title.replace(/^PRESUPUESTO\s*·\s*/i, '').replace(/\s+DE\s+(\S+)$/i, ''))}<em>${esc((title.match(/\s+DE\s+(\S+)$/i) || [])[1] || '')}</em></h1>
  <div class="meta">
    <div><label>Fecha</label>${metaHtml('Fecha')}${meta['Válido por'] ? `<span>Válido por ${esc(meta['Válido por'][0])}</span>` : ''}</div>
    <div><label>Para</label>${metaHtml('Para')}</div>
    <div><label>De</label>${metaHtml('De')}</div>
  </div>
</header>
${sections.map((s) => `<section><h2><i>${s.num.padStart(2, '0')}</i>${esc(s.name)}</h2>${renderBody(s.body)}</section>`).join('\n')}
${sig.length ? `<footer class="sig">
  <div>${sig.map((l, n) => (n ? `<span>${link(l.trim())}</span>` : `<b>${esc(l.trim())}</b>`)).join('')}</div>
  <svg class="gf" viewBox="-1 -1 46 22" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 0H22V5H5V15H17V14H11V9H22V20H0V5Z M26 0H44L40 5H31V8H40V13H31V20H26Z" vector-effect="non-scaling-stroke"/></svg>
</footer>` : ''}
</body></html>`

const out = file.replace(/\.txt$/i, '.pdf')
fs.writeFileSync(out.replace(/\.pdf$/, '.html'), html)
const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.pdf({
  path: out,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: `<div style="width:100%;font:8px 'Roboto Mono',monospace;color:#888;padding:0 17mm;display:flex;justify-content:space-between"><span>${esc(title)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
})
await browser.close()
console.log('PDF:', path.relative(process.cwd(), out))
