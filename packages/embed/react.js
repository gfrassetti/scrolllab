'use client'

import { createElement, useEffect, useRef } from 'react'
import { mountEmbed } from './loader-client.js'

/**
 * <ScrollLabEmbed embedKey="pub_…" />   una sección
 * <ScrollLabEmbed packKey="pk_…" />     un pack (varias secciones, en orden)
 *
 * Sin JSX a propósito: el paquete se publica tal cual, sin build.
 */
export default function ScrollLabEmbed({ embedKey, packKey }) {
  const ref = useRef(null)
  useEffect(
    () => mountEmbed(ref.current, embedKey ? { key: embedKey } : { pack: packKey }),
    [embedKey, packKey],
  )
  return createElement('div', { ref })
}
