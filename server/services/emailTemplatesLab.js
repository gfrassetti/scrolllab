import { emailShell, escapeHtml, langOf } from './emailTemplatesBilling.js'

/**
 * Mail de un formulario de LAB: lo que escribió un visitante en el sitio del
 * cliente, al dueño del widget. Responder al mail le contesta al visitante
 * (reply-to). Puro, testeable.
 */
const COPY = {
  es: {
    kind: {
      contact: 'Nuevo mensaje',
      quote: 'Pedido de presupuesto',
      newsletter: 'Nueva suscripción',
      callback: 'Pedido de llamada',
      booking: 'Nueva reserva',
    },
    site: 'tu sitio',
    subject: (kind, host) => `${kind} desde ${host}`,
    eyebrow: 'LAB · Formulario',
    title: (who) => (who ? `Te escribió ${who}` : 'Te escribieron desde tu sitio'),
    intro: (host, reply) =>
      reply
        ? `Llegó desde el formulario de ${host}. Respondiendo a este mail le contestás directo a ${reply}.`
        : `Llegó desde el formulario de ${host}. No dejó un email: los datos que completó están abajo.`,
    cta: 'Ver el widget en LAB',
    footer:
      'Este mail lo manda Scroll Lab por el formulario que publicaste en LAB. Para dejar de recibirlos, despublicá el widget.',
  },
  en: {
    kind: {
      contact: 'New message',
      quote: 'Quote request',
      newsletter: 'New subscriber',
      callback: 'Callback request',
      booking: 'New booking',
    },
    site: 'your site',
    subject: (kind, host) => `${kind} from ${host}`,
    eyebrow: 'LAB · Form',
    title: (who) => (who ? `${who} wrote to you` : 'Someone wrote to you from your site'),
    intro: (host, reply) =>
      reply
        ? `It came from the form on ${host}. Reply to this email to answer ${reply} directly.`
        : `It came from the form on ${host}. They left no email: what they filled in is below.`,
    cta: 'Open the widget in LAB',
    footer:
      'Scroll Lab sends this email for the form you published in LAB. To stop receiving them, unpublish the widget.',
  },
}

/** Un valor corto va en una fila; uno largo o con saltos de línea, en bloque. */
const isLong = (value) => value.length > 80 || value.includes('\n')

/**
 * @param {{ message: { formType: string, fields: Array<[string, string]>, replyTo: string | null }, host?: string | null, locale?: string, labUrl: string, logoUrl: string }} args
 */
export function buildLabFormMessage({ message, host, locale, labUrl, logoUrl }) {
  const lang = langOf(locale)
  const c = COPY[lang]
  const site = host || c.site
  const kind = c.kind[message.formType] || c.kind.contact
  const nameField = message.fields.find(([label]) => /^(nombre|name)$/i.test(label))
  const who = nameField ? nameField[1].slice(0, 60) : ''
  const rows = message.fields.filter(([, v]) => !isLong(v))
  const blocks = message.fields.filter(([, v]) => isLong(v))
  const intro = c.intro(site, message.replyTo)
  const first = (blocks[0] || rows[0] || ['', ''])[1]
  const subject = c.subject(kind, site)
  const html = emailShell({
    lang,
    logoUrl,
    preheader: first.slice(0, 90),
    eyebrow: c.eyebrow,
    title: c.title(who),
    introHtml: escapeHtml(intro),
    rows,
    blocks,
    cta: { href: labUrl, label: c.cta },
    footer: c.footer,
  })
  const text = [
    `Scroll Lab — ${c.eyebrow}`,
    '',
    c.title(who),
    '',
    intro,
    '',
    ...message.fields.map(([k, v]) => (isLong(v) ? `${k}:\n${v}\n` : `${k}: ${v}`)),
    '',
    `${c.cta}:`,
    labUrl,
    '',
    c.footer,
  ].join('\n')
  return { subject, html, text }
}
