// Generado por scripts/gen-image-variants.mjs desde design/masters/neon/ — no editar a mano.
// Cada foto de ejemplo en WebP, con versiones más angostas para el srcset.
import city from './city.webp'
import cityW320 from './city-320.webp'
import fore from './fore.webp'
import foreW320 from './fore-320.webp'
import room from './room.webp'
import roomW320 from './room-320.webp'
import scene from './scene.webp'
import sceneW640 from './scene-640.webp'
import sceneW1080 from './scene-1080.webp'
import sky from './sky.webp'
import skyW640 from './sky-640.webp'
import skyW1080 from './sky-1080.webp'

export { city, fore, room, scene, sky }

/** srcset y tamaño intrínseco de cada foto, por URL: ver src/lib/responsiveImage.js. */
export const variants = {
  [city]: { srcSet: `${cityW320} 320w, ${city} 2688w`, width: 2688, height: 1520 },
  [fore]: { srcSet: `${foreW320} 320w, ${fore} 2688w`, width: 2688, height: 1520 },
  [room]: { srcSet: `${roomW320} 320w, ${room} 2688w`, width: 2688, height: 1520 },
  [scene]: { srcSet: `${sceneW640} 640w, ${sceneW1080} 1080w, ${scene} 2688w`, width: 2688, height: 1520 },
  [sky]: { srcSet: `${skyW640} 640w, ${skyW1080} 1080w, ${sky} 2688w`, width: 2688, height: 1520 },
}
