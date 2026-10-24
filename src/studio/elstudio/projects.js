import cover from './assets/proyecto-1.webp'
import coverSmall from './assets/proyecto-1-900.webp'
import mostrador from './assets/p1-mostrador.webp'
import mostradorS from './assets/p1-mostrador-s.webp'
import ventanal from './assets/p1-ventanal.webp'
import ventanalS from './assets/p1-ventanal-s.webp'
import nicho from './assets/p1-nicho.webp'
import nichoS from './assets/p1-nicho-s.webp'
import prenda from './assets/p1-prenda.webp'
import prendaS from './assets/p1-prenda-s.webp'
import detalle from './assets/p1-detalle.webp'
import detalleS from './assets/p1-detalle-s.webp'

/**
 * Los proyectos del estudio. Por ahora uno de muestra («Proyecto 1»): las fotos y los datos reales los
 * trae el cliente. Cada proyecto es una página (`/proyectos/<slug>`, ProyectoPage.jsx).
 *
 *   photos   cada foto: `src` (grande), `small` (pantallas chicas), `w` × `h` (su proporción) y `alt`.
 *   hero     la foto de la derecha de la apertura; `thumb`, la que va enmarcada en el panel de color.
 *   gallery  las que se recorren con parallax, con su texto al lado: ventanal (ancha), nicho (alta, con su texto),
 *            prenda + cover (la pareja del final).
 */
const photo = (src, small, w, h, alt) => ({ src, small, w, h, alt })

export const PROJECTS = [
  {
    slug: 'proyecto-1',
    n: '01',
    name: 'Proyecto 1',
    kind: 'Local comercial',
    place: 'Lugar X',
    year: '2025',
    area: '68',
    lede: 'Un local comercial de 68 m² pensado entero: del ventanal a la última pieza de carpintería.',
    services: ['Distribución y obra', 'Revestimientos y color', 'Iluminación', 'Carpintería y mobiliario'],
    photos: {
      cover: photo(cover, coverSmall, 3, 2, 'Proyecto 1: el local visto desde el centro, con la mesa de roble y el mostrador de travertino'),
      hero: photo(mostrador, mostradorS, 3, 4, 'El mostrador curvo de travertino frente a la estantería de roble'),
      thumb: photo(detalle, detalleS, 1, 1, 'Cerámicas sobre una repisa de roble'),
      ventanal: photo(ventanal, ventanalS, 2688, 1520, 'El ventanal del fondo, con la montaña, y la mesa de roble en el centro'),
      nicho: photo(nicho, nichoS, 3, 4, 'El nicho pintado en terracota, con un banco de piedra y un olivo'),
      prenda: photo(prenda, prendaS, 2688, 1520, 'El perchero de lino junto a la puerta, bajo la lámpara de papel'),
    },
    // Los textos que acompañan a las fotos (de muestra).
    notes: {
      ventanal: ['Luz', 'El ventanal ordena el recorrido: todo lo demás se acomoda para que la luz de la tarde cruce el local de punta a punta.'],
      nicho: ['Color', 'Un solo nicho en terracota rompe la calma del microcemento y de la piedra. Es el lugar donde uno se detiene.'],
      prenda: ['Oficio', 'Carpintería de roble y revestimientos hechos a medida, con materiales que mejoran con el uso.'],
    },
    quote: 'Proyectamos el local entero, pieza por pieza, para que quien entre se sienta en casa.',
  },
]

export const projectBySlug = (slug) => PROJECTS.find((p) => p.slug === slug)
