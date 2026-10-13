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
import ship1 from './ship-1.webp'
import ship1W320 from './ship-1-320.webp'
import ship2 from './ship-2.webp'
import ship2W320 from './ship-2-320.webp'
import ship3 from './ship-3.webp'
import ship3W320 from './ship-3-320.webp'
import ship4 from './ship-4.webp'
import ship4W320 from './ship-4-320.webp'
import ship5 from './ship-5.webp'
import ship5W320 from './ship-5-320.webp'
import ship6 from './ship-6.webp'
import ship6W320 from './ship-6-320.webp'
import sky from './sky.webp'
import skyW640 from './sky-640.webp'
import skyW1080 from './sky-1080.webp'

export { city, fore, room, scene, ship1, ship2, ship3, ship4, ship5, ship6, sky }

/** srcset y tamaño intrínseco de cada foto, por URL: ver src/lib/responsiveImage.js. */
export const variants = {
  [city]: { srcSet: `${cityW320} 320w, ${city} 2688w`, width: 2688, height: 1520 },
  [fore]: { srcSet: `${foreW320} 320w, ${fore} 2688w`, width: 2688, height: 1520 },
  [room]: { srcSet: `${roomW320} 320w, ${room} 2688w`, width: 2688, height: 1520 },
  [scene]: { srcSet: `${sceneW640} 640w, ${sceneW1080} 1080w, ${scene} 2688w`, width: 2688, height: 1520 },
  [ship1]: { srcSet: `${ship1W320} 320w, ${ship1} 1312w`, width: 1312, height: 256 },
  [ship2]: { srcSet: `${ship2W320} 320w, ${ship2} 1312w`, width: 1312, height: 224 },
  [ship3]: { srcSet: `${ship3W320} 320w, ${ship3} 1200w`, width: 1200, height: 192 },
  [ship4]: { srcSet: `${ship4W320} 320w, ${ship4} 968w`, width: 968, height: 144 },
  [ship5]: { srcSet: `${ship5W320} 320w, ${ship5} 816w`, width: 816, height: 144 },
  [ship6]: { srcSet: `${ship6W320} 320w, ${ship6} 712w`, width: 712, height: 136 },
  [sky]: { srcSet: `${skyW640} 640w, ${skyW1080} 1080w, ${sky} 2688w`, width: 2688, height: 1520 },
}
