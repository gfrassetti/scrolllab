import { useEffect, useRef, useState } from 'react'

/**
 * Texto que se «tipea» con letras al azar hasta acomodarse (como los menús de
 * una consola). El texto real va invisible debajo y fija el tamaño, así nada
 * salta; encima se dibuja la animación. Cambiar `run` la vuelve a disparar.
 */

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const rand = () => POOL[Math.floor(Math.random() * POOL.length)]

export default function HackyText({ text, run = 0, step = 26, tail = 3, onTick, className = '', style }) {
  const [shown, setShown] = useState(text)
  const timer = useRef(0)

  useEffect(() => {
    if (!run) {
      setShown(text)
      return undefined
    }
    let revealed = 0
    let frame = 0
    window.clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      frame += 1
      if (frame % 2 === 0) revealed += 1
      const len = Math.min(text.length, revealed + tail)
      let out = text.slice(0, revealed)
      for (let i = revealed; i < len; i += 1) out += text[i] === ' ' ? ' ' : rand()
      setShown(out)
      onTick?.()
      if (revealed >= text.length) {
        window.clearInterval(timer.current)
        setShown(text)
      }
    }, step)
    return () => window.clearInterval(timer.current)
    // onTick puede cambiar en cada render: no reinicia la animación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, text, step, tail])

  return (
    <span className={`relative inline-block ${className}`} style={style}>
      <span aria-hidden="true" className="invisible">
        {text}
      </span>
      <span aria-hidden="true" className="absolute top-0 left-0 whitespace-pre">
        {shown}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  )
}
