import HorizontalPanels from '../../components/sections/chapters/HorizontalPanels'
import { C } from './brand'
import { MAP_BG } from './mapScene'

/**
 * cāpsula33 — «Galería»: la sección de paneles horizontales de CHAPTERS,
 * reutilizada tal cual (pin + recorrido horizontal con el scroll; en el
 * teléfono, una pila vertical con las fotos que entran con zoom).
 *
 * Primero el texto, después las fotos de a una, de costado. Las fotos son
 * recortes de las imágenes generadas del sitio (pasillo, salón, colección,
 * barra, jardín, la tripulante), nunca las fotos del dueño. La tipografía y
 * los colores se cambian desde afuera (clase `c33-gallery`).
 */

const BASE = '/studio/capsula33/gallery/'

const PANELS = [
  { index: '01', title: 'El acceso', caption: 'La puerta naranja, al final del pasillo de la nave.', img: `${BASE}pasillo.webp` },
  { index: '02', title: 'El salón', caption: 'Bajo la bandeja de neón, hasta la barra plisada.', img: `${BASE}salon.webp` },
  { index: '03', title: 'La colección', caption: 'Figuras de cine, cada una bajo su frasco de vidrio.', img: `${BASE}coleccion.webp` },
  { index: '04', title: 'La barra', caption: 'Café de especialidad, espresso a 93 grados.', img: `${BASE}barra.webp` },
  { index: '05', title: 'El jardín', caption: 'El pulmón de la manzana, detrás de los arcos.', img: `${BASE}jardin.webp` },
  { index: '06', title: 'La tripulación', caption: 'Bienvenidos, exploradores de universos.', img: `${BASE}tripulante.webp` },
]

export default function GaleriaSection() {
  return (
    <div className="c33-gallery">
      <HorizontalPanels
        id="galeria"
        chapterLabel="Bitácora"
        chapter="06"
        total="06"
        label="Galería"
        headingBefore="Seis vistas de"
        headingEm="la cápsula,"
        headingAfter=" de la puerta al jardín."
        panels={PANELS}
        bg={MAP_BG}
        fg={C.cream}
        accent={C.neon}
      />
      <style>{`
        .c33-gallery h2, .c33-gallery h3, .c33-gallery [data-panel-title] {
          font-family: 'Chakra Petch', 'Barlow', sans-serif;
          text-transform: uppercase;
          letter-spacing: -0.01em;
          font-weight: 600;
        }
        .c33-gallery em.font-display { font-family: inherit; font-style: normal; font-weight: inherit; }
        .c33-gallery p, .c33-gallery figcaption { font-family: 'Barlow', 'Helvetica Neue', Arial, sans-serif; }
        .c33-gallery .tracking-\\[0\\.25em\\], .c33-gallery .tracking-\\[0\\.3em\\] { font-family: 'Roboto Mono', ui-monospace, monospace; }
        .c33-gallery img { filter: saturate(1.05) contrast(1.03); }
      `}</style>
    </div>
  )
}
