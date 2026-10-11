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
        { value: 'nocturne', label: 'Nocturne' },
        { value: 'monolith', label: 'Monolith' },
        { value: 'velocity', label: 'Velocity' },
        { value: 'fizz', label: 'Fizz' },
        { value: 'atelier', label: 'Atelier' },
        { value: 'comic', label: 'Comic' },
        { value: 'unity', label: 'Unity' },
        { value: 'ratio', label: 'Ratio' },
        { value: 'atrium', label: 'Atrium' },
        { value: 'meridian', label: 'Meridian' },
        { value: 'kin', label: 'Kin' },
        { value: 'fold', label: 'Fold' },
      ],
    },
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'nameLabel', label: 'Name — label', type: 'text' },
    { key: 'emailLabel', label: 'Email — label', type: 'text' },
    { key: 'messageLabel', label: 'Message — label', type: 'text' },
    { key: 'submitLabel', label: 'Submit — label', type: 'text' },
    { key: 'sendingLabel', label: 'Sending — label', type: 'text' },
    { key: 'successMessage', label: 'Success message', type: 'textarea' },
    { key: 'errorMessage', label: 'Error message', type: 'textarea' },
    { key: 'note', label: 'Note', type: 'textarea' },
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
  ],
}
