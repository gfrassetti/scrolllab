import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { SECTION_FIELDS } from '../../src/lib/sectionFields.js'
import { sanitizeSectionProps, sanitizeHostedProps } from '../sectionFields.js'

/**
 * Lo que el comprador (o quien arme el POST a mano) puede dejar en un campo de
 * color o de link llega a un `style` o a un `href` del ZIP y del embed de LAB.
 * El servidor decide cómo validar cada valor por el NOMBRE de la prop, no por el
 * `type` del campo del builder: un campo `color` con un nombre que el servidor no
 * reconoce se guardaba como texto libre. Este test recorre TODOS los campos del
 * builder, así que un campo nuevo mal nombrado falla acá y no en producción.
 */
const BAD_COLORS = ['red; background:url(https://evil.test/x)', 'expression(alert(1))', 'url(javascript:alert(1))', '#ff0000; x', 'rojo']
const GOOD_COLORS = ['#abc', '#aabbcc', '#aabbccdd', 'rgb(1, 2, 3)', 'rgba(1,2,3,0.5)']
const BAD_HREFS = ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:x', 'ftp://x.test']
const GOOD_HREFS = ['#ancla', '/ruta', 'https://example.com/a', 'mailto:hola@example.com', 'tel:+5491155550000']

/** [sectionId, key, type] de cada campo suelto, y de cada sub-campo de lista. */
function fieldsOfType(type) {
  const flat = []
  const listed = []
  for (const [id, fields] of Object.entries(SECTION_FIELDS)) {
    for (const field of fields) {
      if (field.type === type) flat.push([id, field.key])
      if (field.type === 'list') {
        for (const sub of field.item || []) if (sub.type === type) listed.push([id, field.key, sub.key])
      }
    }
  }
  return { flat, listed }
}

for (const [label, type, bad, good] of [
  ['color', 'color', BAD_COLORS, GOOD_COLORS],
  ['link', 'href', BAD_HREFS, GOOD_HREFS],
]) {
  const { flat, listed } = fieldsOfType(type)

  describe(`campos de ${label} del builder: el servidor los valida como ${label}`, () => {
    it('hay campos que probar', () => {
      assert.ok(flat.length > 0)
      assert.ok(listed.length > 0)
    })

    for (const sanitize of [sanitizeSectionProps, sanitizeHostedProps]) {
      it(`${sanitize.name}: descarta valores peligrosos en cada campo suelto (${flat.length})`, () => {
        const leaks = []
        for (const [id, key] of flat) {
          for (const value of bad) {
            if (sanitize(id, { [key]: value })?.[key] !== undefined) leaks.push(`${id}.${key} = ${JSON.stringify(value)}`)
          }
        }
        assert.deepEqual(leaks, [])
      })

      it(`${sanitize.name}: conserva los valores válidos en cada campo suelto`, () => {
        const lost = []
        for (const [id, key] of flat) {
          for (const value of good) {
            if (sanitize(id, { [key]: value })?.[key] !== value.trim().toLowerCase() && sanitize(id, { [key]: value })?.[key] !== value) {
              lost.push(`${id}.${key} = ${JSON.stringify(value)}`)
            }
          }
        }
        assert.deepEqual(lost, [])
      })

      it(`${sanitize.name}: descarta valores peligrosos dentro de listas (${listed.length})`, () => {
        const leaks = []
        for (const [id, listKey, sub] of listed) {
          for (const value of bad) {
            const out = sanitize(id, { [listKey]: [{ [sub]: value }] })
            if (out?.[listKey]?.[0]?.[sub] !== undefined) leaks.push(`${id}.${listKey}[].${sub} = ${JSON.stringify(value)}`)
          }
        }
        assert.deepEqual(leaks, [])
      })
    }
  })
}
