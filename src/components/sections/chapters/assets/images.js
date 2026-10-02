// Generado por scripts/gen-image-variants.mjs desde design/masters/chapters/ — no editar a mano.
// Cada foto de ejemplo en WebP, con versiones más angostas para el srcset.
import editA from './edit-a.webp'
import editAW640 from './edit-a-640.webp'
import editB from './edit-b.webp'
import editBW640 from './edit-b-640.webp'
import editBW1080 from './edit-b-1080.webp'
import editC from './edit-c.webp'
import editCW640 from './edit-c-640.webp'
import editD from './edit-d.webp'
import editDW640 from './edit-d-640.webp'
import editDW1080 from './edit-d-1080.webp'
import panelA from './panel-a.webp'
import panelAW640 from './panel-a-640.webp'
import panelB from './panel-b.webp'
import panelBW640 from './panel-b-640.webp'
import panelC from './panel-c.webp'
import panelCW640 from './panel-c-640.webp'
import panelD from './panel-d.webp'
import panelDW640 from './panel-d-640.webp'
import sceneA from './scene-a.webp'
import sceneAW640 from './scene-a-640.webp'
import sceneB from './scene-b.webp'
import sceneBW640 from './scene-b-640.webp'
import sceneC from './scene-c.webp'
import sceneCW640 from './scene-c-640.webp'

export { editA, editB, editC, editD, panelA, panelB, panelC, panelD, sceneA, sceneB, sceneC }

/** srcset y tamaño intrínseco de cada foto, por URL: ver src/lib/responsiveImage.js. */
export const variants = {
  [editA]: { srcSet: `${editAW640} 640w, ${editA} 1024w`, width: 1024, height: 1536 },
  [editB]: { srcSet: `${editBW640} 640w, ${editBW1080} 1080w, ${editB} 1536w`, width: 1536, height: 1024 },
  [editC]: { srcSet: `${editCW640} 640w, ${editC} 1024w`, width: 1024, height: 1536 },
  [editD]: { srcSet: `${editDW640} 640w, ${editDW1080} 1080w, ${editD} 1536w`, width: 1536, height: 1024 },
  [panelA]: { srcSet: `${panelAW640} 640w, ${panelA} 1024w`, width: 1024, height: 1536 },
  [panelB]: { srcSet: `${panelBW640} 640w, ${panelB} 1024w`, width: 1024, height: 1536 },
  [panelC]: { srcSet: `${panelCW640} 640w, ${panelC} 1024w`, width: 1024, height: 1536 },
  [panelD]: { srcSet: `${panelDW640} 640w, ${panelD} 1024w`, width: 1024, height: 1536 },
  [sceneA]: { srcSet: `${sceneAW640} 640w, ${sceneA} 1024w`, width: 1024, height: 1536 },
  [sceneB]: { srcSet: `${sceneBW640} 640w, ${sceneB} 1024w`, width: 1024, height: 1536 },
  [sceneC]: { srcSet: `${sceneCW640} 640w, ${sceneC} 1024w`, width: 1024, height: 1536 },
}
