import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'

// Single registration point: every section imports gsap from here
// so plugins are guaranteed to be registered exactly once.
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, MotionPathPlugin)

// Mobile: el address bar del navegador se esconde/aparece al scrollear y
// dispara un resize — sin esto ScrollTrigger lo toma como "cambió el layout"
// y se re-mide a mitad de scroll, dejando pines/scrubs desalineados o
// directamente sin disparar. Config global, no toca el scroll en sí
// (a diferencia de normalizeScroll, que si lo usás junto a Lenis en los
// demos de templates pelean por el control del scroll — ver useLenis.js).
ScrollTrigger.config({ ignoreMobileResize: true })

export { gsap, useGSAP, ScrollTrigger, SplitText, MotionPathPlugin }
