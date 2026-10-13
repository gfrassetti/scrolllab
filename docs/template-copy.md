# Copy de los templates — un negocio inventado, no placeholders

Decisión del dueño (2026-10-13), después de mirar a la competencia:

- **Framer** pide sacar el placeholder y el lorem ipsum para publicar un template
  ([template requirements](https://www.framer.com/template-requirements)).
- **Webflow** pide no usar lorem ipsum en títulos ni párrafos, copy propio del rubro, y CMS con
  3 a 7 ítems realistas ([submission guidelines](https://templates.webflow.com/submission-guidelines)).
- Los que más venden (Framer, Tailwind Plus con «TaxPal», ThemeForest con Rhye) entregan un
  **sitio terminado**: una marca inventada con su voz, cifras creíbles y testimonios con nombre.

Así que cada template de SCROLLLAB es el sitio de un negocio que inventamos para él.

## Reglas

1. **Copy en inglés, de un negocio inventado**: nombre, rubro, ciudad, voz, cifras que cierran
   entre sí (el «620 km» del hero es el mismo de la ficha). Nada de «Headline 1», «Lorem ipsum»,
   «Link 1», «Placeholder…», «Title 3», `hello@placeholder.studio`, «[Describe your project…]».
2. **Cada link funciona dentro de la página**:
   - Los del nav, los CTA y los del footer van a una sección que existe (`#models` → la sección
     con `id="models"`). Con Lenis el paso es suave (`useLenis`); desde el menú del teléfono, el
     menú se cierra, suelta el scroll y recién ahí va (`useMobileMenu`).
   - **Privacidad / Términos** (`#privacy`, `#terms`) abren su texto en un panel sobre la página:
     `src/components/LegalSheet.jsx`, los campos salen de `legalFields()`
     (`src/domain/sectionFields/helpers.js`). Con una ruta o una URL, el link va ahí.
   - Emails y teléfonos de los bloques de contacto son `mailto:` / `tel:` (`contactHref`,
     `src/lib/contactLinks.js`); redes y links externos abren en otra pestaña (`externalProps`).
   - Nunca `href="#"` solo.
3. **Sin nombres reales**: ni marcas existentes, ni personas reales, ni la marca de la referencia
   (sigue valiendo [`reference-ip-brief.md`](reference-ip-brief.md)). Teléfonos de ficción
   (UK `020 7946 0xxx`, US `555-01xx`) o números con `555`.
4. **Largo parecido al del diseño**: un titular que en la demo medía dos líneas sigue midiendo dos.
   Un texto más largo que el placeholder puede desbordar (nombres de lista a escala de afiche,
   rótulos chicos de una columna): mirar la página a 390, 768 y 1440 después de cambiar copy.
5. **Los textos legales de la demo** son de la marca inventada: el campo explica que el comprador
   los reemplaza por los suyos y los hace revisar.
6. Todo sigue siendo un campo del builder (regla «todo lo visible se edita»).

## Los negocios de cada template

| Template | Negocio inventado | Ciudad | Notas |
|---|---|---|---|
| APEX | **Apex Automobili** — gran turismo eléctrico hecho a mano (Saloon, Coupé, Terra) | Turín | 620 km, 11 semanas por auto, 240 autos al año |
| FOLD | **Fold Paper Studio** — taller de faroles de papel, encargos y talleres los sábados | Porto | el CTA y el footer abren un mail (cruzar 46 pantallas de film hasta el footer no tiene sentido) |
