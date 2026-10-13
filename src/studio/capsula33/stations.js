/**
 * cāpsula33 — el recorrido por el local: cinco páginas, en el orden en que se
 * camina desde la puerta. Cada una tiene su zona (para el puntero), su toma de
 * cámara y lo que se cuenta. Todo es del local real; nada inventado.
 *
 * Coordenadas de Blender: x va de la entrada (−9,6) a la pared naranja del fondo
 * (6); y del lado del salón (−3) a la pared de la barra (3); z hacia arriba.
 */

export const MANIFEST = {
  model: 'room.glb',
  atlases: { shell: 'bake-shell.webp', props: 'bake-props.webp' },
  target: [-1.8, 0, 1.2], // el centro del local (el pivote del giro)
  // Pantalla ancha: de frente y derecho (el largo del local en horizontal).
  viewDir: [0, -1, 0.85],
  lookLift: 0.2,
  radius: 10.2,
  distance: 58,
  // Teléfono en vertical: desde arriba, a lo largo, con la entrada abajo.
  tall: { viewDir: [-0.9, -0.25, 1.9], lookLift: 0.2, radius: 4.6, distance: 34 },
}

export const STATIONS = [
  {
    id: 'entrada',
    page: '001',
    label: 'La entrada',
    zone: { min: [-10, -3, 0], max: [-8.05, 3, 3.2] },
    cam: { pos: [-14.6, -4.2, 2.4], look: [-9.6, 0.2, 1.3] },
    kicker: 'Av. Gral. Roca 1120',
    text: 'A cuadras del lago Lácar, en San Martín de los Andes. Pasando la puerta, la mesa naranja; después, el pulmón a la derecha y la colección a la izquierda.',
    hours: true,
    link: { label: 'Cómo llegar', href: 'https://www.google.com/maps/search/?api=1&query=Gral.+Roca+1120,+San+Mart%C3%ADn+de+los+Andes' },
  },
  {
    id: 'pulmon',
    page: '002',
    label: 'El pulmón',
    zone: { min: [-8, -3, 0], max: [-4.4, -1, 3.2] },
    cam: { pos: [-1.8, -11.5, 8.4], look: [-6.0, -1.6, 1.1] },
    kicker: 'Pulmón de manzana',
    text: 'Un jardín dentro de una caja blanca con arcos. Se ve desde el pasillo de entrada y desde el salón.',
  },
  {
    id: 'vitrinas',
    page: '003',
    label: 'Las vitrinas',
    zone: { min: [-9.6, 2.2, 0], max: [-2.05, 3, 3] },
    cam: { pos: [-0.6, -3.4, 2.9], look: [-5.0, 3, 1.4] },
    kicker: 'La colección',
    text: 'Las figuras de cine del dueño, en vitrinas de ojo de buey. Algunas, a la altura de los más chicos.',
  },
  {
    id: 'barra',
    page: '004',
    label: 'La barra',
    zone: { min: [-1.0, 0.15, 0], max: [3.2, 3, 3.1] },
    cam: { pos: [0.4, -2.7, 4.5], look: [0.9, 1.7, 1.0] }, // por encima de las espirales
    kicker: 'Café de especialidad',
    text: 'Abajo, la luz de la barra; arriba, el pasillo de neón. En la pantalla, los Elegidos.',
    list: ['Mar de otoño', 'Tostón del bosque negro', 'Poke bowl de trucha', 'Spaghetti con ciervo ahumado'],
  },
  {
    id: 'salon',
    page: '005',
    label: 'El salón',
    zone: { min: [-4.3, -3, 0], max: [6, 0.4, 2.9] },
    cam: { pos: [-2.6, -8.6, 6.6], look: [1.2, -1.2, 0.6] },
    kicker: 'Un lugar para reunirse',
    text: 'Mesas bajo las espirales de luz, hasta la pared naranja de los arcos.',
  },
]
