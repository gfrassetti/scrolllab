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
// y se re-mide a mitad de scroll, dejando pines/scrubs desalineados. GSAP ya
// lo trae prendido en táctiles; queda explícito. El scroll táctil en sí se
// normaliza aparte, solo mientras una página lo pide (lib/touchScroll.js).
ScrollTrigger.config({ ignoreMobileResize: true })

export { gsap, useGSAP, ScrollTrigger, SplitText, MotionPathPlugin }
