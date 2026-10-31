import { toggle } from '../helpers.js'

/** @typedef {import('../types.js').SectionField} SectionField */

/**
 * Campos editables de las secciones de CONTACT (builder + LAB).
 * El ensamblado y la lista completa: ../fields.js.
 * @type {Record<string, SectionField[]>}
 */
export const CONTACT_FIELDS = {
  'contact/ContactForm': [
    {
      key: 'theme',
      label: 'Theme',
      type: 'select',
      options: [
        { value: 'auto', label: 'Auto (sección de al lado)' },
        { value: 'chapters', label: 'Chapters' },
        { value: 'nocturne', label: 'Nocturne', retired: true },
        { value: 'monolith', label: 'Monolith' },
        { value: 'velocity', label: 'Velocity', retired: true },
        { value: 'fizz', label: 'Fizz' },
        { value: 'atelier', label: 'Atelier' },
        { value: 'comic', label: 'Comic' },
        { value: 'unity', label: 'Unity' },
        { value: 'ratio', label: 'Ratio', retired: true },
        { value: 'atrium', label: 'Atrium' },
        { value: 'meridian', label: 'Meridian' },
        { value: 'kin', label: 'Kin' },
        { value: 'fold', label: 'Fold' },
        { value: 'apex', label: 'Apex' },
        { value: 'ordo', label: 'Ordo' },
      ],
    },
    {
      key: 'formType',
      label: 'Tipo de formulario',
      type: 'select',
      options: [
        { value: 'contact', label: 'Contacto: nombre, email y mensaje' },
        { value: 'quote', label: 'Presupuesto: + empresa, rango y plazo' },
        { value: 'newsletter', label: 'Newsletter: solo email, en una línea' },
        { value: 'callback', label: 'Que te llamen: nombre, teléfono y horario' },
        { value: 'booking', label: 'Reserva o turno: nombre, email, fecha y personas' },
      ],
    },
    { key: 'eyebrow', label: 'Sobretítulo', type: 'text' },
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'body', label: 'Texto', type: 'textarea' },
    { key: 'nameLabel', label: 'Nombre — rótulo', type: 'text' },
    { key: 'emailLabel', label: 'Email — rótulo', type: 'text' },
    { key: 'messageLabel', label: 'Mensaje — rótulo', type: 'text' },
    { key: 'submitLabel', label: 'Enviar — rótulo', type: 'text' },
    { key: 'sendingLabel', label: 'Enviando — rótulo', type: 'text' },
    { key: 'successMessage', label: 'Success message', type: 'textarea' },
    { key: 'errorMessage', label: 'Mensaje de error', type: 'textarea' },
    { key: 'note', label: 'Nota', type: 'textarea' },
    {
      key: 'endpoint',
      label: 'Endpoint — https:// or /path (empty = demo)',
      type: 'url',
    },
    { key: 'requiredError', label: 'Error — campo vacío', type: 'text' },
    { key: 'emailError', label: 'Error — email inválido', type: 'text' },
    { key: 'messageError', label: 'Error — mensaje corto', type: 'text' },
    { key: 'bg', label: 'Color de fondo (pisa el de la paleta)', type: 'color' },
    { key: 'fg', label: 'Color de texto (pisa el de la paleta)', type: 'color' },
    { key: 'accent', label: 'Color de acento: rótulo y botón', type: 'color' },
    { key: 'phoneLabel', label: 'Teléfono — etiqueta', type: 'text' },
    { key: 'companyLabel', label: 'Empresa — etiqueta (presupuesto)', type: 'text' },
    { key: 'budgetLabel', label: 'Presupuesto — etiqueta', type: 'text' },
    { key: 'budgetOptions', label: 'Presupuesto — opciones (una por línea)', type: 'textarea' },
    { key: 'timelineLabel', label: 'Plazo — etiqueta (presupuesto)', type: 'text' },
    { key: 'timeLabel', label: 'Horario — etiqueta (que te llamen)', type: 'text' },
    { key: 'timeOptions', label: 'Horario — opciones (una por línea)', type: 'textarea' },
    { key: 'dateLabel', label: 'Fecha — etiqueta (reserva)', type: 'text' },
    { key: 'peopleLabel', label: 'Personas — etiqueta (reserva)', type: 'text' },
    { key: 'selectPlaceholder', label: 'Texto de las listas sin elegir', type: 'text' },
    {
      key: 'extraFields',
      label: 'Campos extra (van antes del mensaje)',
      type: 'list',
      max: 6,
      item: [
        { key: 'label', label: 'Etiqueta', type: 'text' },
        {
          key: 'kind',
          label: 'Tipo',
          type: 'select',
          options: [
            { value: 'text', label: 'Texto' },
            { value: 'email', label: 'Email' },
            { value: 'tel', label: 'Teléfono' },
            { value: 'number', label: 'Número' },
            { value: 'date', label: 'Fecha' },
            { value: 'textarea', label: 'Texto largo' },
            { value: 'options', label: 'Opciones (lista)' },
          ],
        },
        { key: 'options', label: 'Opciones (si el tipo es «Opciones»), separadas por coma', type: 'text' },
        toggle('showRequired', 'Obligatorio', undefined, 'off'),
      ],
      help: {
        title: 'Cómo funcionan los campos extra',
        steps: [
          'Se suman después de los campos del tipo elegido y antes del mensaje.',
          'Llegan a tu endpoint con la etiqueta como nombre: «Empresa»: «Acme».',
          'Un campo obligatorio vacío muestra el error «campo vacío».',
        ],
      },
    },
  ],
}
