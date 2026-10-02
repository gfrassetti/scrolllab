// Generado por scripts/gen-image-variants.mjs desde design/masters/comic/ — no editar a mano.
// Cada foto de ejemplo en WebP, con versiones más angostas para el srcset.
import closedYards from './closed-yards.webp'
import closedYardsW640 from './closed-yards-640.webp'
import closedYardsW1080 from './closed-yards-1080.webp'
import closeupBuddies from './closeup-buddies.webp'
import closeupBuddiesW640 from './closeup-buddies-640.webp'
import closeupBuddiesW1080 from './closeup-buddies-1080.webp'
import driveSunset from './drive-sunset.webp'
import driveSunsetW640 from './drive-sunset-640.webp'
import driveSunsetW1080 from './drive-sunset-1080.webp'
import heroRoad from './hero-road.webp'
import heroRoadW640 from './hero-road-640.webp'
import heroRoadW1080 from './hero-road-1080.webp'

export { closedYards, closeupBuddies, driveSunset, heroRoad }

/** srcset y tamaño intrínseco de cada foto, por URL: ver src/lib/responsiveImage.js. */
export const variants = {
  [closedYards]: { srcSet: `${closedYardsW640} 640w, ${closedYardsW1080} 1080w, ${closedYards} 1536w`, width: 1536, height: 1024 },
  [closeupBuddies]: { srcSet: `${closeupBuddiesW640} 640w, ${closeupBuddiesW1080} 1080w, ${closeupBuddies} 1536w`, width: 1536, height: 1024 },
  [driveSunset]: { srcSet: `${driveSunsetW640} 640w, ${driveSunsetW1080} 1080w, ${driveSunset} 1536w`, width: 1536, height: 1024 },
  [heroRoad]: { srcSet: `${heroRoadW640} 640w, ${heroRoadW1080} 1080w, ${heroRoad} 1536w`, width: 1536, height: 1024 },
}
