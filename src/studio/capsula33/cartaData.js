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
