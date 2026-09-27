# Estudio (trabajo a medida) — posicionamiento y precios

ScrollLab es dos cosas a la vez: un marketplace de templates (self-serve, precio
fijo, comprador desarrollador) **y** un estudio que hace trabajo a medida por
cotización manual. Este doc es la referencia canónica del segundo — para que
nadie reabra esta discusión desde cero ni la contradiga con copy nuevo.

Sección en el home: `src/pages/TemplatesIndex.jsx`, zona `estudio` (misma
mecánica de `<ZoneHeadline>` que Templates/Builder/LAB). Copy en
`src/i18n/locales/{es,en}.json` bajo `home.studio*` y `home.req4*`.

## Público

Marcas que quieren un sitio de nivel superior al promedio — no cualquier pyme
que busca la opción más barata. No se nombran rubros específicos en el copy
público ni en el pitch (regla 6 más abajo): el filtro real es el nivel de
exigencia del cliente, no su industria.

## Los servicios

Dos, con tarjeta propia en el home:

| Servicio | `contactType*` | Qué es | Precio ancla |
|---|---|---|---|
| Sitio a medida | `custom` | Diseño y desarrollo de un sitio scrollytelling desde cero, de punta a punta. | Desde USD 2.900 |
| Adaptar un modelo | `adapt` | Un modelo del catálogo, rebrandeado con la identidad y el contenido del cliente. | Desde USD 1.400 |

Un tercero, **sin tarjeta y sin listar en la página**:

| Servicio | `contactType*` | Qué es | Precio ancla |
|---|---|---|---|
| Mantenimiento y soporte | `maintenance` | Cambios, cuidado técnico y soporte de deploy sobre un sitio ya entregado. | Desde USD 250/mes |

No tiene tarjeta porque no hay forma de contratarlo desde la UI — a diferencia
de LAB, que sí es una suscripción self-serve real, esto no lo es. Se ofrece
caso por caso a quien ya contactó por alguno de los dos de arriba; el select
del formulario ("¿Qué necesitás?") igual tiene la opción `maintenance`, para
no perder ese lead si alguien pregunta puntualmente por esto.

Todos por **cotización manual** — nunca pasan por el checkout de Mercado Pago,
nunca tocan `server/catalog.js` ni `src/lib/pricing.js` (esas rutas son solo
para lo que sí se compra online: templates, builder, LAB).

**Estos precios no se muestran en el sitio.** Las tarjetas de servicio del home
(`src/pages/TemplatesIndex.jsx`, zona `estudio`) solo listan para quién es cada
servicio y qué se lleva — sin precio y sin prometer un resultado de negocio
(regla 6 más abajo). El monto se habla en la conversación con el cliente, caso
por caso; esta tabla es la referencia interna para esa charla, no un texto que
vaya a parar a `es.json`/`en.json`.

## Por qué esos números (piso de precio)

Techo real del negocio de productos (`src/lib/pricing.js`, revisar si cambia):
template más caro en venta = `meridian`, USD 379 (no `ratio`, que está en
`COMING_SOON_SKUS`); bundle de los 9 = USD 649; techo teórico del builder con
30 secciones + commerce = USD 758 (`CUSTOM_BASE_PRICE_USD + 22×CUSTOM_EXTRA_SECTION_USD + COMMERCE_PACK_SURCHARGE_USD`).

Las tres anclas de Estudio (las 2 públicas + mantenimiento) quedan claramente
arriba de eso — si no, un proyecto a medida se lee como "una composición
grande del builder", justo lo que el posicionamiento premium busca evitar
(comparación por precio/horas en vez de por resultado):

- **Sitio a medida (USD 2.900)**: el ancla más alta va primera (efecto de
  anclaje). ~3.8x el techo del builder.
- **Adaptar un modelo (USD 1.400)**: ratio ~2:1 contra el ítem anterior ("la
  mitad del sitio a medida"). Sigue ~1.8x el techo del builder.
- **Mantenimiento (USD 250/mes)**: precio redondo (las suscripciones se
  anclan en redondo, no en "charm pricing"). El plan más caro de LAB
  (`hosted_studio`, autoservicio) ronda USD ~190/mes — un servicio con
  criterio humano no puede costar menos que una suscripción automatizada.

Si estos números cambian, se edita solo esta tabla — no viven en ningún lado
del código ni de los locales.

## Reglas de copy (no negociables)

1. **Nunca en la página.** Los precios ancla no se muestran en el sitio —
   ni en las tarjetas de servicio ni en ningún otro lado. Se hablan en la
   conversación con el cliente, caso por caso.
2. **Mantenimiento no es un servicio público.** No le des tarjeta propia ni lo
   publiques como algo que se "activa" desde la interfaz — no existe esa
   suscripción self-serve. Sale solo cuando surge en la conversación.
3. **Nunca por hora.** No desglosar el precio en horas ni justificarlo así — es
   la señal más rápida de "commodity" (ver la lección que originó este doc:
   vender resultado, no tiempo).
4. **Nunca cupos fijos.** No afirmar "1 proyecto por mes" ni nada similar — la
   capacidad depende del proyecto, y una promesa así no es verificable.
5. **Siempre "desde".** Los precios son anclas de entrada, no el precio
   final — el proyecto real se cotiza después del diagnóstico.
6. **No prometer resultados de negocio.** No decir que el sitio "consigue
   clientes" ni prometer conversión, consultas o ventas — eso depende de
   marketing, tráfico y oferta, cosas que no controlamos ni vendemos. Somos
   un estudio de desarrollo web, no una agencia de marketing (decisión
   explícita del dueño, 2026-09-28, tras dudar de la lección de un curso que
   originó este doc: "vendé resultado, no feature" suena bien pero para un
   estudio de dev es una promesa que no podemos sostener). Cada servicio se
   describe por lo que construimos y entregamos (el sitio, el proceso, la
   calidad) — tampoco por lo que incluye técnicamente (animaciones, Three.js);
   el stack no se menciona en copy público, mismo criterio que rige el resto
   del sitio.
7. **No especificar nicho.** No listar rubros ("arquitectura", "moda", "foto y
   cine") ni en el copy público ni en el pitch — el servicio es para cualquier
   marca que lo necesite, acotar la lista no suma.
8. **Precio siempre en USD** si en algún momento se comparte por escrito (una
   propuesta enviada al cliente, por ejemplo) — nunca convertido a ARS. Señal
   deliberada de precio premium/internacional.

## Tracking

El formulario del home (`HomeContact.jsx`) agrega un select "¿Qué necesitás?"
(`project_type`: `custom` / `adapt` / `maintenance` / `other`) que viaja a
Formspree y dispara `trackLead({ source: 'home_contact_<tipo>' })` (GTM,
evento `generate_lead`). Sirve para separar, en GA4, un lead de Estudio de uno
genérico — sin infraestructura nueva.
