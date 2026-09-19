/**
 * Textos listos para publicar, uno por demo y por idioma, con el link de cada
 * canal ya con UTM (así después `npm run leads:export` dice qué canal trajo
 * cada mail). Salen de src/i18n/locales/{es,en}.json: si cambia la descripción
 * de un modelo, se regeneran solos.
 *
 * Deja, en media/marketing/<sku>/: caption-es.txt y caption-en.txt, y un índice
 * en media/marketing/LEEME.md. Va junto a los videos de `npm run video:demos`.
 *
 * Uso: npm run copy:social
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { publicDemoSkus } from '../src/lib/sharePages.js'
import { SITE_URL } from '../src/lib/site.js'
import { WELCOME_COUPON_PERCENT } from '../src/lib/pricing.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'media', 'marketing')

const locales = {
  es: JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/locales/es.json'), 'utf8')),
  en: JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/locales/en.json'), 'utf8')),
}

/** Cada canal con su utm_source / utm_medium. El link va a la franja del cupón. */
const CHANNELS = [
  { id: 'instagram', label: { es: 'Instagram (bio o historias)', en: 'Instagram (bio or stories)' }, source: 'instagram', medium: 'reels' },
  { id: 'tiktok', label: { es: 'TikTok (bio)', en: 'TikTok (bio)' }, source: 'tiktok', medium: 'video' },
  { id: 'youtube', label: { es: 'YouTube Shorts (descripción)', en: 'YouTube Shorts (description)' }, source: 'youtube', medium: 'shorts' },
  { id: 'x', label: { es: 'X', en: 'X' }, source: 'x', medium: 'social' },
  { id: 'linkedin', label: { es: 'LinkedIn', en: 'LinkedIn' }, source: 'linkedin', medium: 'social' },
  { id: 'reddit', label: { es: 'Reddit', en: 'Reddit' }, source: 'reddit', medium: 'community' },
  { id: 'hackernews', label: { es: 'Hacker News', en: 'Hacker News' }, source: 'hackernews', medium: 'community' },
  { id: 'dm', label: { es: 'Mensajes directos / mail', en: 'Direct messages / email' }, source: 'dm', medium: 'direct' },
]

const HASHTAGS = '#scrollytelling #gsap #reactjs #webdesign #frontend #creativecoding #webdev'

function link(channel, sku) {
  const params = new URLSearchParams({
    utm_source: channel.source,
    utm_medium: channel.medium,
    utm_campaign: sku,
  })
  return `${SITE_URL}/?${params}#cupon`
}

const COPY = {
  es: {
    hook: 'Webs que cuentan una historia mientras scrolleás.',
    intro: (name, vibe) => `${name} — ${vibe}.`,
    body: (tags) => `Template en React + GSAP, con el código fuente incluido: ${tags}.`,
    cta: `Mirá la demo y, si te sirve para un proyecto, tenés ${WELCOME_COUPON_PERCENT}% menos en tu primera compra.`,
    bio: 'Link en la bio 👆',
    sections: {
      bio: '[Instagram · TikTok · YouTube Shorts] el link va en la bio',
      text: '[X · LinkedIn] el link va en el texto',
      links: '[Links con UTM] para la bio, las respuestas y los mensajes',
    },
  },
  en: {
    hook: 'Websites that tell a story as you scroll.',
    intro: (name, vibe) => `${name} — ${vibe}.`,
    body: (tags) => `A React + GSAP template, source code included: ${tags}.`,
    cta: `Watch the demo — and if it fits a project, get ${WELCOME_COUPON_PERCENT}% off your first purchase.`,
    bio: 'Link in bio 👆',
    sections: {
      bio: '[Instagram · TikTok · YouTube Shorts] the link goes in the bio',
      text: '[X · LinkedIn] the link goes in the post',
      links: '[UTM links] for bios, replies and DMs',
    },
  },
}

function caption(sku, lang) {
  const t = locales[lang].templates?.[sku]
  if (!t?.vibe) throw new Error(`Falta templates.${sku}.vibe en ${lang}.json`)
  const c = COPY[lang]
  const name = sku.toUpperCase()
  const tags = (t.tags || []).slice(0, 3).join(', ').toLowerCase()
  const head = [c.hook, '', c.intro(name, t.vibe), c.body(tags), '', c.cta].join('\n')
  const x = CHANNELS.find((ch) => ch.id === 'x')

  return [
    c.sections.bio,
    '',
    head,
    c.bio,
    '',
    HASHTAGS,
    '',
    '---',
    '',
    c.sections.text,
    '',
    head,
    link(x, sku),
    '',
    HASHTAGS,
    '',
    '---',
    '',
    c.sections.links,
    '',
    ...CHANNELS.map((ch) => `${ch.label[lang]}: ${link(ch, sku)}`),
    '',
  ].join('\n')
}

const skus = publicDemoSkus()
fs.mkdirSync(OUT, { recursive: true })
for (const sku of skus) {
  const dir = path.join(OUT, sku)
  fs.mkdirSync(dir, { recursive: true })
  for (const lang of ['es', 'en']) {
    fs.writeFileSync(path.join(dir, `caption-${lang}.txt`), caption(sku, lang))
  }
}

fs.writeFileSync(
  path.join(OUT, 'LEEME.md'),
  [
    '# Contenido para redes',
    '',
    'Un video y un texto por demo. Generado por `npm run video:demos` y `npm run copy:social`.',
    '',
    '| Archivo | Para qué |',
    '|---|---|',
    '| `<demo>/9x16-es.mp4`, `9x16-en.mp4` | Reels, TikTok, YouTube Shorts, X y LinkedIn (vertical, cierra con el sitio y el cupón) |',
    '| `<demo>/caption-es.txt`, `caption-en.txt` | Texto para publicar + links con UTM por canal |',
    '',
    `Demos: ${skus.join(', ')}.`,
    '',
    'Publicá con el link de cada canal (lleva UTM): después `npm run leads:export` muestra',
    'en las columnas `utmSource`, `utmMedium` y `utmCampaign` qué canal trajo cada mail.',
    '',
  ].join('\n'),
)

console.log(`Textos de ${skus.length} demos → ${path.relative(ROOT, OUT)}`)
