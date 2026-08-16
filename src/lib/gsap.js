import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'

// Single registration point: every section imports gsap from here
// so plugins are guaranteed to be registered exactly once.
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, MotionPathPlugin)

export { gsap, useGSAP, ScrollTrigger, SplitText, MotionPathPlugin }
