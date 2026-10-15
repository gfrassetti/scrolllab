/**
 * Los datos de la carta take-away (rubros y productos, con precios de la carta impresa).
 * [nombre, precio, descripción?, vegano?] — o ['tag', 'Subtítulo'] para un subtítulo dentro del rubro.
 * `planet` es la paleta del rubro (luz, medio, sombra): tiñe pestañas, cápsulas y brillos.
 */

const VG = true

// [nombre, precio, descripción?, vegano?] — o ['tag', 'Subtítulo'] para un subtítulo dentro del rubro.
// `planet` es la paleta del rubro (luz, medio, sombra): tiñe la pestaña y el brillo del fondo.
export const CATEGORIES = [
  {
    id: 'cafeteria',
    title: 'Cafetería',
    blurb: 'Espresso a 93 grados, de especialidad.',
    planet: ['#ffb067', '#ff7a1a', '#7a2a07'],
    rows: [
      ['tag', 'Calientes'],
      ['Americano', '$4.800'],
      ['Lagrima', '$4.500'],
      ['Flat White', '$5.500'],
      ['Capuccino', '$6.000'],
      ['Latte', '$5.500'],
      ['Latte cápsula33', '$6.000'],
      ['Chocolate caliente', '$6.500'],
      ['Chocolate caliente cápsula33', '$6.500'],
      ['Golden milk', '$5.000'],
      ['tag', 'Fríos'],
      ['Americano con hielo', '$5.500'],
      ['Latte con hielo', '$6.000'],
      ['Affogato', '$6.500'],
    ],
  },
  {
    id: 'smoothies',
    title: 'Smoothies',
    blurb: 'Frutas licuadas, una por humor.',
    planet: ['#ff9fd0', '#d63c8f', '#4a0b2e'],
    rows: [
      ['Alegría', '$9.000', 'Frutos rojos y ananá'],
      ['Capricho', '$9.000', 'Oreo y mantequilla de maní'],
      ['Vigor', '$9.000', 'Durazno y jengibre'],
    ],
  },
  {
    id: 'laminados',
    title: 'Laminados y pastelería',
    blurb: 'Masa madre, manteca y horno de todos los días.',
    planet: ['#ffe2a3', '#d9a441', '#5a3a07'],
    rows: [
      ['Medialuna clásica', '$3.500', null, VG],
      ['Medialuna con jamón y queso', '$7.000'],
      ['Croissant', '$4.500', null, VG],
      ['Croissant de Coruscant', '$8.000', 'Con jamón y queso'],
      ['Croissant bicolor', '$5.000', 'De frambuesa', VG],
      ['Alfajor Libra', '$6.000', 'Nuez / ddl / chocolate blanco / lima', VG],
      ['tag', 'Wookie Cookies · VG'],
      ['Clásica', '$3.500', 'Vainilla, chips de chocolate y nueces'],
      ['Salted caramel', '$3.500', 'Maní y salted caramel'],
      ['Chocolate', '$3.500', 'Full chocolate'],
    ],
  },
  {
    id: 'cervezas',
    title: 'Cervezas',
    blurb: 'De la canilla.',
    planet: ['#ffd58a', '#e0901f', '#4d2a05'],
    rows: [
      ['Golden', '$6.000'],
      ['Scottish', '$6.000'],
      ['Porter', '$6.000'],
      ['American Pale Ale', '$8.000'],
      ['Hazy Indian Pale Ale', '$10.000'],
      ['New England Indian Pale Ale', '$10.000'],
    ],
  },
  {
    id: 'platos',
    title: 'Platos intensos',
    blurb: 'Para quedarse un rato largo.',
    planet: ['#ff9a86', '#d8402f', '#4a0d07'],
    rows: [
      ['Sándwich de carne braseada', '$22.000', 'Ciabatta, carne desmechada, provolone, coleslaw, chimichurri, alioli de mostaza y papines'],
      ['Pizza de masa madre y mozzarella', '$15.000'],
      ['tag', 'Las pizzas'],
      ['Pesto y tomates asados', null, null, VG],
      ['Calabaza asada, queso azul y nueces', null, null, VG],
      ['Cantimpalo, olivas y muhammara'],
      ['Cebolla, orégano y olivas negras', null, null, VG],
    ],
  },
  {
    id: 'helados',
    title: 'Helados soft',
    blurb: 'Con toppings.',
    planet: ['#e8f4ff', '#8fb8e0', '#1d3550'],
    rows: [
      ['Crema', '$6.000', 'Coulis de frambuesa y crumble de avena'],
      ['Dulce de leche', '$6.000', 'Ganache de chocolate y praliné de almendras'],
      ['Mixto', '$6.000', 'Salted caramel y cucurucho molido'],
    ],
  },
]

export const isTag = (row) => row[0] === 'tag'

// Íconos de línea de cada rubro (viewBox 48).
export const ICONS = {
  cafeteria: 'M10 18h22v10a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8z M32 20h3a4 4 0 0 1 0 8h-3 M16 8c-2 2 2 3 0 6 M23 8c-2 2 2 3 0 6',
  smoothies: 'M12 14h24l-3 24a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3z M30 14l5-9 M14 23h20',
  laminados: 'M4 31C6 19 15 13 24 13s18 6 20 18c-3-1-5 0-7 2-2-4-6-4-8 0-2-4-6-4-8 0-2-4-6-4-8 0-2-4-5-4-8-1-2-1-3-2-5-1z M14 17l3 12 M24 13v14 M34 17l-3 12',
  cervezas: 'M12 13h20v25a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z M32 19h5a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-5 M12 13c0-4 5-5 8-3 3-3 9-1 9 3 M18 21v14 M24 21v14',
  platos: 'M7 11c11-5 23-5 34 0L24 42z M19 19a2 2 0 1 0 .1 0 M29 21a2 2 0 1 0 .1 0 M23 31a2 2 0 1 0 .1 0',
  helados: 'M15 23h18L24 43z M13 23a11 11 0 0 1 22 0 M18 23c0-3 2-6 6-6',
}

/** Parte las filas de un rubro en grupos, cortando en cada subtítulo. */
export function groupsOf(rows) {
  const groups = []
  let cur = { label: null, items: [] }
  rows.forEach((r) => {
    if (isTag(r)) {
      if (cur.items.length) groups.push(cur)
      cur = { label: r[1], items: [] }
    } else {
      cur.items.push({ name: r[0], price: r[1], desc: r[2], vg: r[3] })
    }
  })
  if (cur.items.length) groups.push(cur)
  return groups
}
