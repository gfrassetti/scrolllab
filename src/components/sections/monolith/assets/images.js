// Generado por scripts/gen-image-variants.mjs desde design/masters/monolith/ — no editar a mano.
// Cada foto de ejemplo en WebP, con versiones más angostas para el srcset.
import accA from './acc-a.webp'
import accAW640 from './acc-a-640.webp'
import accAW1080 from './acc-a-1080.webp'
import accB from './acc-b.webp'
import accBW640 from './acc-b-640.webp'
import accBW1080 from './acc-b-1080.webp'
import accC from './acc-c.webp'
import accCW640 from './acc-c-640.webp'
import accCW1080 from './acc-c-1080.webp'
import ex01 from './ex-01.webp'
import ex01W640 from './ex-01-640.webp'
import ex02 from './ex-02.webp'
import ex02W640 from './ex-02-640.webp'
import ex03 from './ex-03.webp'
import ex03W640 from './ex-03-640.webp'
import ex04 from './ex-04.webp'
import ex04W640 from './ex-04-640.webp'

export { accA, accB, accC, ex01, ex02, ex03, ex04 }

/** srcset y tamaño intrínseco de cada foto, por URL: ver src/lib/responsiveImage.js. */
export const variants = {
  [accA]: { srcSet: `${accAW640} 640w, ${accAW1080} 1080w, ${accA} 1536w`, width: 1536, height: 1024 },
  [accB]: { srcSet: `${accBW640} 640w, ${accBW1080} 1080w, ${accB} 1536w`, width: 1536, height: 1024 },
  [accC]: { srcSet: `${accCW640} 640w, ${accCW1080} 1080w, ${accC} 1536w`, width: 1536, height: 1024 },
  [ex01]: { srcSet: `${ex01W640} 640w, ${ex01} 1024w`, width: 1024, height: 1024 },
  [ex02]: { srcSet: `${ex02W640} 640w, ${ex02} 1024w`, width: 1024, height: 1024 },
  [ex03]: { srcSet: `${ex03W640} 640w, ${ex03} 1024w`, width: 1024, height: 1024 },
  [ex04]: { srcSet: `${ex04W640} 640w, ${ex04} 1024w`, width: 1024, height: 1024 },
}
