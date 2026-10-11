// Generado por scripts/gen-image-variants.mjs desde design/masters/nocturne/ — no editar a mano.
// Cada foto de ejemplo en WebP, con versiones más angostas para el srcset.
import beatDiner from './beat-diner.webp'
import beatDinerW640 from './beat-diner-640.webp'
import beatRoad from './beat-road.webp'
import beatRoadW640 from './beat-road-640.webp'
import beatRoof from './beat-roof.webp'
import beatRoofW640 from './beat-roof-640.webp'
import hero from './hero.webp'
import heroW640 from './hero-640.webp'
import heroW1080 from './hero-1080.webp'
import portal from './portal.webp'
import portalW640 from './portal-640.webp'
import portalW1080 from './portal-1080.webp'
import workCoat from './work-coat.webp'
import workCoatW640 from './work-coat-640.webp'
import workNeon from './work-neon.webp'
import workNeonW640 from './work-neon-640.webp'
import workSet from './work-set.webp'
import workSetW640 from './work-set-640.webp'
import workTrails from './work-trails.webp'
import workTrailsW640 from './work-trails-640.webp'

export { beatDiner, beatRoad, beatRoof, hero, portal, workCoat, workNeon, workSet, workTrails }

/** srcset y tamaño intrínseco de cada foto, por URL: ver src/lib/responsiveImage.js. */
export const variants = {
  [beatDiner]: { srcSet: `${beatDinerW640} 640w, ${beatDiner} 1168w`, width: 1168, height: 880 },
  [beatRoad]: { srcSet: `${beatRoadW640} 640w, ${beatRoad} 1168w`, width: 1168, height: 880 },
  [beatRoof]: { srcSet: `${beatRoofW640} 640w, ${beatRoof} 1168w`, width: 1168, height: 787 },
  [hero]: { srcSet: `${heroW640} 640w, ${heroW1080} 1080w, ${hero} 1344w`, width: 1344, height: 752 },
  [portal]: { srcSet: `${portalW640} 640w, ${portalW1080} 1080w, ${portal} 1344w`, width: 1344, height: 752 },
  [workCoat]: { srcSet: `${workCoatW640} 640w, ${workCoat} 896w`, width: 896, height: 1120 },
  [workNeon]: { srcSet: `${workNeonW640} 640w, ${workNeon} 896w`, width: 896, height: 1120 },
  [workSet]: { srcSet: `${workSetW640} 640w, ${workSet} 896w`, width: 896, height: 1120 },
  [workTrails]: { srcSet: `${workTrailsW640} 640w, ${workTrails} 896w`, width: 896, height: 1120 },
}
