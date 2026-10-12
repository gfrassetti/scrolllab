import type { ReactElement } from 'react'

export interface ScrollLabEmbedProps {
  /** Key pública de una sección publicada en LAB (`pub_…`). */
  embedKey?: string
  /** Key pública de un pack (`pk_…`): varias secciones, en orden. Se usa si no hay `embedKey`. */
  packKey?: string
}

/**
 * Embebe una sección de ScrollLab (o un pack) con una etiqueta. Pasá
 * `embedKey` o `packKey`.
 *
 * @example
 * <ScrollLabEmbed embedKey="pub_xxxxxxxxxxxxxxxxxxxxxxxx" />
 * <ScrollLabEmbed packKey="pk_xxxxxxxxxxxxxxxxxxxxxxxx" />
 */
declare function ScrollLabEmbed(props: ScrollLabEmbedProps): ReactElement

export default ScrollLabEmbed
