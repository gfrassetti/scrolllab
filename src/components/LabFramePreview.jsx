import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n'

/**
 * Vista previa del editor de LAB con el frame REAL del embed (el mismo que va
 * al sitio del cliente), no la sección de React del sitio: mismas fuentes,
 * mismo CSS, las imágenes por defecto sin foto como en el embed, y `vw` /
 * breakpoints según el ancho elegido. Los props (lo que está sin guardar) van
 * por postMessage; el frame solo los acepta de este sitio.
 *
 * El ancho de desktop es de verdad 1280px: si la columna es más angosta se
 * escala entero, como un dispositivo en miniatura. Si el frame no contesta
 * (embed viejo sin modo preview, CDN caído) → `onFail` y el editor vuelve a la
 * vista previa en React.
 */
const PREVIEW_DEVICES = {
  desktop: { width: 1280, viewportHeight: 800 },
  tablet: { width: 768, viewportHeight: 1024 },
  mobile: { width: 390, viewportHeight: 844 },
}

const SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'
const READY_TIMEOUT_MS = 8000

export default function LabFramePreview({ frameSrc, sectionId, props, device = 'desktop', onFail }) {
  const { t } = useI18n()
  const frameRef = useRef(null)
  const boxRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [height, setHeight] = useState(0)
  const [boxWidth, setBoxWidth] = useState(0)
  const origin = useMemo(() => {
    try {
      return new URL(frameSrc).origin
    } catch {
      return ''
    }
  }, [frameSrc])
  const { width, viewportHeight } = PREVIEW_DEVICES[device] || PREVIEW_DEVICES.desktop
  const scale = boxWidth ? Math.min(1, boxWidth / width) : 1
  // Callback del padre en un ref: que cambie no reinicia el handshake.
  const onFailRef = useRef(onFail)
  useEffect(() => {
    onFailRef.current = onFail
  })

  useEffect(() => {
    const el = boxRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let alive = true
    let gotReady = false
    const onMessage = (e) => {
      if (e.origin !== origin || e.source !== frameRef.current?.contentWindow) return
      const m = e.data
      if (!m || typeof m !== 'object') return
      if (m.type === 'scrolllab:preview-ready') {
        gotReady = true
        setReady(true)
      } else if (m.type === 'scrolllab:height' && typeof m.px === 'number') {
        setHeight(Math.max(0, Math.round(m.px)))
      }
    }
    window.addEventListener('message', onMessage)
    const timer = setTimeout(() => {
      if (alive && !gotReady) onFailRef.current?.()
    }, READY_TIMEOUT_MS)
    return () => {
      alive = false
      window.removeEventListener('message', onMessage)
      clearTimeout(timer)
    }
  }, [origin, frameSrc])

  // Cada cambio (con un respiro para no remontar la sección por tecla).
  useEffect(() => {
    if (!ready) return undefined
    const timer = setTimeout(() => {
      frameRef.current?.contentWindow?.postMessage(
        { type: 'scrolllab:preview', sectionId, props, viewportHeight },
        origin,
      )
    }, 250)
    return () => clearTimeout(timer)
  }, [ready, sectionId, props, viewportHeight, origin])

  const frameHeight = height || 320
  return (
    <div
      ref={boxRef}
      className="relative w-full overflow-hidden"
      style={{ height: frameHeight * scale }}
      data-lab-preview={device}
    >
      {!ready && (
        <p className="absolute inset-0 grid place-items-center text-sm text-ink/45">
          {t('lab.previewLoading')}
        </p>
      )}
      <iframe
        ref={frameRef}
        src={frameSrc}
        title={t('lab.preview')}
        sandbox={SANDBOX}
        scrolling="no"
        className="block border-0"
        style={{
          width,
          height: frameHeight,
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: '0 0',
          margin: scale < 1 ? 0 : '0 auto',
          opacity: ready ? 1 : 0,
        }}
      />
    </div>
  )
}
