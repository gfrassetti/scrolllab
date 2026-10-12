import type { DefineComponent } from 'vue'

export interface ScrollLabEmbedProps {
  /** Key pública de una sección publicada en LAB (`pub_…`). */
  embedKey?: string
  /** Key pública de un pack (`pk_…`): varias secciones, en orden. Se usa si no hay `embedKey`. */
  packKey?: string
}

/**
 * Embebe una sección de ScrollLab (o un pack) con una etiqueta. Pasá
 * `embed-key` o `pack-key`.
 *
 * @example
 * <ScrollLabEmbed embed-key="pub_xxxxxxxxxxxxxxxxxxxxxxxx" />
 * <ScrollLabEmbed pack-key="pk_xxxxxxxxxxxxxxxxxxxxxxxx" />
 */
declare const ScrollLabEmbed: DefineComponent<ScrollLabEmbedProps>

export default ScrollLabEmbed
