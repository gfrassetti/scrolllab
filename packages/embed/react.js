'use client'

import { createElement, useEffect, useRef } from 'react'
import { mountEmbed } from './loader-client.js'

/**
 * <ScrollLabEmbed embedKey="pub_…" />
 *
 * Sin JSX a propósito: el paquete se publica tal cual, sin build.
 */
export default function ScrollLabEmbed({ embedKey }) {
  const ref = useRef(null)
  useEffect(() => mountEmbed(ref.current, embedKey), [embedKey])
  return createElement('div', { ref })
}
