import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

// Single registration point: every section imports gsap from here
// so plugins are guaranteed to be registered exactly once.
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

export { gsap, useGSAP, ScrollTrigger, SplitText }
