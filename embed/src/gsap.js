/**
 * gsap para el embed: reemplaza a src/lib/gsap.js vía alias en vite.config.js.
 *
 * Diferencias con el del sitio:
 *  - sin MotionPathPlugin (ninguna sección `hostable` lo usa todavía; sumarlo
 *    acá cuando una que lo necesite entre al registry)
 *  - sin el wrapper TEMP DEBUG que envuelve cada método de gsap
 *
 * Mantener la misma superficie de export que src/lib/gsap.js.
 */
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

export { gsap, useGSAP, ScrollTrigger, SplitText }
