# SCROLLLAB

Marketplace de templates scrollytelling. Cada modelo es una demo completa; el builder arma composiciones; la compra entrega un ZIP con código fuente + `LICENSE.txt`.

## Stack

- Vite + React 19 + Tailwind CSS v4
- GSAP 3 + Lenis + three
- Express API (`server/`) + MongoDB + Passport Google OAuth
- Mercado Pago Checkout Pro (pagos únicos)

## Setup local

```bash
cp .env.example .env
npm install
npm run pack:templates
npm run dev
```

- Front: http://localhost:5173  
- API: http://localhost:8787  

Sin `MP_ACCESS_TOKEN`, el checkout usa mock pay. Sin credenciales de Google, usá “Login de desarrollo”.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Vite + API |
| `npm run dev:web` | Solo Vite |
| `npm run dev:api` | Solo Express |
| `npm run build` | Build del front |
| `npm start` | API en producción |
| `npm test` | Tests de API |
| `npm run test:e2e` | Embed de LAB en Chromium (secciones, responsive, publicar, dominios, links) |
| `npm run check:builder` | El editor del builder aplica cada cambio (Chromium) |
| `npm run check:lab` | LAB desde el editor: editar → preview → publicar → se ve en un sitio ajeno |
| `npm run check:mobile` | Cada sección de los 10 templates de 320 a 1280 px: desbordes, texto cortado o chico, zonas de toque, imágenes |
| `npm run check:motion` | Emulador de teléfono (gestos táctiles reales, CPU ×4) en los 10 templates y el home: huecos, trabas, texto oculto; con «reducir movimiento» y con «Ver con animaciones» |
| `npm run check:motion-notice` | El aviso «Ver con animaciones»: se pregunta una sola vez, el botón anda en todo, el toggle del header |
| `npm run images` | Regenera las fotos WebP (y sus `srcset`) desde `design/masters/` |
| `npm run pack:templates` | Prearma ZIPs del catálogo |

## Suscripciones LAB (Mercado Pago)

Sistema de PreApproval de Mercado Pago detrás de LAB (planes hosteados). Estado:
**en producción, testeado contra MP real**. Detalle técnico completo (estados,
logs greppables, cómo correr `check:mp-sandbox`) en
[`docs/mercadopago-suscripciones-setup.md`](docs/mercadopago-suscripciones-setup.md).

### Auditoría y fixes

- **Prueba gratis (7 días):** confirmado en sandbox real que `auto_recurring.start_date` difiere el primer cobro sin cobrar nada; cancelar durante la prueba no cobra un peso.
- **Cancelación:** conserva el acceso hasta `currentPeriodEnd` (antes cortaba en el acto aunque quedaran días pagos). La baja se confirma contra MP antes de marcarla local — si MP no confirma, 502, nunca una baja que MP no hizo.
- **Cobro rechazado / renovación caída:** gracia de 7 días (`HOSTED_GRACE_DAYS`) antes de caer a free; si un reintento de MP cobra después (reintenta hasta 4 veces en 10 días), el plan vuelve solo. El primer cobro (fin de la prueba) tiene 1 día de margen, no 7.
- **Pausa en Mercado Pago** (la puede activar el vendedor desde el panel de MP): conserva el acceso pagado en vez de cortarlo en el acto; visible en la cuenta ("En pausa en MP").
- **UI:** confirmación antes de cancelar, botón de reactivar, "Tu plan está activo hasta …", avisos de pago pendiente/rechazado/pausado, sincroniza sola al volver del checkout de MP.
- **Cambio de plan sin dar de baja** (mismo ciclo): la cuota nueva rige en el acto; bajar de plan se bloquea si ya publicaste más secciones de las que el plan nuevo permite.
- **Emails:** bienvenida (distingue si hay prueba en curso) y cancelación (distingue si fue durante la prueba, donde no se cobró nada).

### Lo último que se sumó

- **Cobro de la diferencia al subir de plan.** MP no prorratea: antes, subir de plan con días ya pagados regalaba la diferencia hasta la próxima renovación (en un plan anual, hasta un año entero). Ahora, si quedan días pagos, la UI muestra el monto exacto y abre un Checkout Pro por esa diferencia; el plan nuevo rige recién cuando el pago se aprueba (webhook o al volver de MP). Bajar de plan, cambiar durante la prueba, o una diferencia menor a ARS 1.000, sigue sin cargo. Cancelado con días pagos no te podés re-suscribir de una a un plan más caro sin pagar la diferencia — primero reactivás.
- **Recordatorio de fin de prueba por email** (`server/services/trialReminders.js`): corre cada hora dentro del proceso de la API, avisa `HOSTED_TRIAL_REMINDER_DAYS` días antes del primer cobro, idempotente (no manda dos veces aunque el server se reinicie en el medio).

### Testeado

- `npm test` — 607/607: recorridos con reloj simulado (prueba → cobro del día 7 → renovación → gracia → pausa → cambio de plan → subida pagando la diferencia → mensual↔anual).
- `npm run check:mp-sandbox` — contra el sandbox **real** de Mercado Pago (16/16): no un simulador, la API de MP de verdad con credenciales de prueba.
- Mutation testing manual sobre la cotización/pago de la diferencia al subir de plan: 5 fallos inyectados a propósito (cotización en cero, sin validar monto, sin bloquear re-suscripción más cara, sin idempotencia, aplica sobre una baja), los 5 detectados por los tests.

## Checkout de templates (Mercado Pago)

Compra única con Checkout Pro: carrito → `POST /api/checkout` (precios del
servidor, en pesos con la cotización del día) → pago en MP → webhook o
confirmación al volver → orden paga → ZIP con licencia marcada → Mis compras.

- **Varios ítems en una compra:** el ZIP trae todos, uno por carpeta (cada una
  es un proyecto que se instala solo) con una licencia en la raíz, igual que el
  bundle. Con un solo ítem el ZIP es el de siempre. El servidor rechaza pagar
  dos veces lo mismo (template repetido, o un modelo que el bundle ya trae) y
  el carrito lo evita.
- **Avisos al dueño** (mail a `EMAIL_NOTIFY_TO` + log greppable), uno por pago:
  - `COMPRA PAGADA DOS VECES` — MP deja pagar el mismo link más de una vez; la
    orden queda paga con el primero y el segundo hay que reembolsarlo.
  - `PAGO SIN ORDEN` — llegó un pago cuya orden ya no existe (venció): entregar
    o reembolsar. Los cobros de LAB que llegan como `payment` no avisan.
  - `ORDEN REEMBOLSADA` / `CONTRACARGO` — la orden pasa a *Reembolsada* y deja
    de descargarse. Reembolsar un pago duplicado no toca la orden.
- **Efectivo** (Rapipago, Pago Fácil): el ticket vence a los 3 días, antes que
  la orden pendiente (7), así no se puede pagar una orden ya borrada.
- **Datos para MP** (su checklist de calidad, pesan en el antifraude): mail,
  nombre y apellido del comprador, y descripción y categoría (`virtual_goods`)
  de cada ítem.
- El mail de compra es un detalle de la compra, **no una factura fiscal**.

Testeado: `checkoutPayments.test.js` (doble pago, pago sin orden, reembolso,
contracargo, dos templates juntos contra el MP simulado), tests del ZIP con
varios ítems y `npm run check:mp-sandbox` contra MP real.

## Builder (composiciones)

El comprador arma una página con secciones de varios modelos, la ve en vivo,
edita textos y la compra. El ZIP es un proyecto Vite con esas secciones, en
ese orden y con lo que editó. Precio por tramos, calculado por el servidor:
base USD 389 con 8 secciones, USD 15 por cada sección extra (tope 30) y USD 39
si suma commerce.

### Qué se edita (y qué no)

A propósito no es un editor completo: se vende código para seguir en el
editor, no un Wix. Se editan textos, enlaces, colores de fondo y texto, y
listas cortas (links, métricas, ítems). Las imágenes se cargan como URL o ruta:
se ven en el preview y viajan igual al ZIP. En el kit commerce se editan los
productos (nombre, precio, descripción y foto, hasta 8): los usan la grilla, la
ficha, el carrito y el checkout; lo que se deja vacío queda como el producto de
ejemplo. El 3D (la forma del hero de
MONOLITH, un GLB propio en FIZZ o MONOLITH) no se edita en el builder: queda el
de la demo y se cambia en el código, con los pasos en el README del ZIP.
Motion, layout y recetas Beat también quedan en el código.

### Kit commerce (solo frontend)

Grilla de productos, ficha, carrito (agregar, quitar, cantidades) y checkout
completo. Sin backend, a propósito: pagos, stock y cuentas dependen del stack de
cada comprador (credenciales, base de datos, hosting) y empaquetarlo no tiene
sentido. El kit trae `checkoutAdapter.js`, una sola función donde se conecta
Mercado Pago o Stripe. En el builder se editan los productos y los textos del
checkout; las variantes (talle, color) se agregan en el código, con la forma
que muestra `src/lib/shop/products.js`.

### Auditoría y fixes

- **Composiciones con MERIDIAN:** el ZIP no traía `public/meridian/` (frames
  del hero, galería, mapa). Compilaba, pero el hero rompía el canvas y las
  fotos salían rotas. Ahora viaja todo lo que el modelo sirve desde `public/`.
- **Listas editadas** (links del footer, métricas, amenities…): quedaban en la
  orden y se veían en el preview, pero el `App.jsx` del ZIP salía con los de
  ejemplo. Ahora van como constantes legibles arriba del `App.jsx`.
- **Fondo de cada sección:** preview y ZIP usaban dos tablas que se habían
  despegado (UNITY y MERIDIAN bajaban con otro color). Ahora es una sola
  (`src/lib/modelWrappers.js`).
- **ZIPs ya vendidos:** se cacheaban para siempre, así que un arreglo no le
  llegaba a quien ya había comprado. Con `PACK_VERSION` se rearman en la
  próxima descarga (la licencia conserva su fecha), sin cortar una descarga en
  curso.
- **Editor:** el botón *Editar nav* quedaba tapado por el del hero (no se
  podía editar la nav); el «probar archivo local» de imágenes y GLB se veía en
  el preview pero no llegaba al ZIP, así que se sacó (queda la URL); campos con
  el tipo mal puesto (capas de VELOCITY como texto, colores de UNITY sin
  selector) y uno que no hacía nada (Index de ATRIUM Blueprint).
- **Servidor:** valida como URL todas las imágenes (la lata de FIZZ y la foto
  de MERIDIAN Panorama pasaban cualquier texto). `npm run check` ahora cruza
  también los tipos entre builder y servidor.
- **Mobile:** barra fija con el total y un atajo a *Tu página* (el botón de
  compra quedaba a ~8.000 px de scroll, después de toda la paleta); el header
  deja de ser fijo en mobile; el panel de edición abre abajo y deja ver la
  sección.

### Lo editado es lo que se descarga

Todo lo que el comprador edita en el builder llega al ZIP tal cual. Está
cubierto para cada campo de cada sección, no para una muestra:

- `builderRoundTrip.test.js` (en `npm test`):
  - Por campo: para los 399 campos editables de las 81 secciones y cada tipo de
    valor (válidos, bordes y basura; 4.254 combinaciones), lo que muestra el
    preview es exactamente lo que manda el carrito y guarda el servidor.
  - De punta a punta: una composición con las 81 secciones y todos sus campos
    editados (listas llenas hasta el tope, textos de 2.000 caracteres con
    comillas, llaves, saltos de línea y emoji) se empaqueta, se ejecuta su
    `App.jsx` y cada sección recibe exactamente las props del preview.
  - Se validó rompiendo el código a propósito: detecta las 7 fallas probadas.
- `npm run check:builder`: cada texto, link e imagen editable (sueltos y dentro
  de listas) aparece en pantalla.
- A mano: 457 valores editados, en 3 ZIP compilados y abiertos en Chromium,
  están todos. 452 se ven directamente o en su atributo (alt, aria-label,
  mailto). Los otros 5 dependen de otra cosa: la lata de FIZZ se ve sin
  modelo 3D, y los tooltips del masterplan al pasar el mouse.

Lo que salió de ese QA y se corrigió:

- El editor aceptaba valores que el servidor descartaba (rutas de imagen con
  espacios, `data:`, un endpoint del formulario sin https): se veían en el
  preview y no llegaban al ZIP. Ahora rige la misma regla en los dos lados.
- El carrito guardaba una foto de la composición: lo editado después de
  «Agregar al carrito» no se compraba. Ahora sigue a la del builder.
- BigNumbers contaba con `parseFloat`: «1.500» terminaba en «2», «4,8» en «5»
  y «24/7» en «NaN», en el preview y en el ZIP. Ahora cuenta los enteros y
  deja el resto como se escribió.
- Una fila de lista agregada y dejada en blanco ya no se dibuja ni se manda.
- Los campos validados (link, color, URL de imagen) no se podían escribir letra
  por letra: cada tecla que dejaba el valor inválido lo borraba («https://…»
  terminaba en «//…», un color quedaba vacío). Ahora el campo muestra lo que se
  tipea, guarda solo cuando es válido y avisa si así no se guarda.

### Testeado

- `npm test`: compra de una composición de punta a punta contra el MP simulado
  (precio por tramos, ítem de MP, ZIP pago con textos, listas, fotos de
  MERIDIAN y kit commerce), tests del ZIP (archivos de `public/`, listas
  intactas aun con comillas y llaves, fondos iguales al preview) y el rearmado
  de ZIPs viejos.
- `npm run check:builder`: cada campo editable de la paleta pública se ve en
  pantalla, edición en vivo, contador y consola limpia.
- Las 81 secciones del builder, en 3 composiciones: empaquetadas, `vite build`
  y abiertas en Chromium a 1280 y 390 sin errores ni scroll horizontal.
- `npm run check:mp-sandbox`: MP real acepta una composición de 30 secciones
  con su SKU y su precio.

## LAB (secciones en vivo)

Una sección que el suscriptor configura en `/lab/:id` y pega en su sitio: un
`<script>` (HTML, Webflow, WordPress…) o `@scrolllab/embed` (React, Next, Vue).
El loader crea un iframe en otro origen y la sección corre ahí, aislada de la
página. Lo publicado se ve en la próxima carga del sitio; un borrador no sale.
Hay 23 secciones hosteables (las que no pinean ni scrubean: dentro de un iframe
de alto acotado esas se rompen). Detalle técnico en [`embed/README.md`](embed/README.md).

### Auditoría y fixes

- **Dominios permitidos:** estaban rotos. El config lo pide el iframe, que corre
  en nuestro origen, así que el server veía siempre `embed.scrolllab…` y una
  sección con dominios cargados daba 403 también en el sitio autorizado. Ahora
  el frame manda el sitio que lo contiene. Se puede sumar `localhost` para
  probar local, y lo que no es un dominio se avisa en vez de desaparecer.
- **Links dentro del embed:** un link externo cargaba el otro sitio adentro del
  iframe; `#ancla` y «Back to top» no hacían nada. Ahora anclas y volver arriba
  scrollean la página del cliente, un link de su sitio navega en la misma
  pestaña, uno externo abre pestaña nueva (como página normal, sin sandbox) y
  mailto/tel abren la app. El loader solo navega a su propio origen y solo
  después de un click.
- **Alto infinito:** `vh`/`svh` dentro del iframe medían el propio iframe; la
  recién sumada ManifestoType crecía sin fin en desktop (646 → 4220 px en 4 s).
  El build las reescribe al viewport del sitio. Y un embed puesto arriba de
  todo no aparecía hasta scrollear.
- **Todo el texto se edita:** nota de cierre y «Back to top» de los footers,
  rótulos de FooterAtelier, «Unit»/«Seq.», etiquetas de AboutClarity (también en
  el builder y en el ZIP). Quedan fijos solo decorativos (*, !, ◆, /), la hora
  local de FooterAtelier y la numeración automática de filas.
- **Imágenes:** en LAB van con URL completa (`https://…`). Una `/ruta` apuntaba
  al dominio del embed y en el sitio del cliente salía rota: el editor avisa, el
  server no la guarda y la saca al servir (instancias viejas).
- **La vista previa es el embed real:** antes era la sección de React del sitio,
  con otro fondo, las fotos por defecto que el embed no muestra y `vw` medido
  contra la ventana. Ahora es el frame del embed con lo que está sin guardar,
  en desktop (1280, escalado), tablet y mobile; en el teléfono va arriba del
  formulario. Avisa «cambios sin publicar».
- **Next:** el snippet ya no pide `'use client'`: el paquete lo trae y entra en
  un Server Component.
- **Limitador por plan:** la regla ya estaba bien y cubierta por tests
  (Starter 5, Pro 15, Studio sin tope, 402 en la N+1, congeladas cuando el plan
  baja o se cae). Lo roto era el aviso: al pasarse del tope, el error salía
  arriba de todo, fuera de pantalla, y parecía que «Publicar» no hacía nada.
  Ahora aparece al lado de los botones.
- **Sin foto:** HelmetGrid sin imágenes (un ítem nuevo, el embed) mostraba solo
  trazos sueltos sobre negro; ahora sus máscaras se leen como paneles.

### Testeado

- `npm run check:lab` (nuevo): las 23 secciones en Chromium desde el editor
  real — editar → la vista previa cambia → Publicar → el embed en un sitio
  ajeno muestra el cambio → otro cambio sin publicar avisa y no sale en vivo.
  Además: preview mobile de 390 px reales, imagen relativa rechazada, consola
  limpia, y con Starter la 6ª publicación avisa el tope en pantalla y queda en
  borrador. Probado que detecta un publicar roto y el aviso fuera de pantalla
  (mutaciones).
- `npm run test:e2e` (103): las 23 embebidas en un sitio ajeno, responsive a
  375/768/1280 con el alto que converge, aislamiento, y `lab-live`: publicar,
  borrador, despublicar, dominios y links.
- `@scrolllab/embed` tal como está en npm (idéntico al repo), en apps reales:
  React 19 con StrictMode, Vue 3.5 y Next 15.5 (Server Component y el snippet
  viejo): renderiza, un solo iframe y un solo loader, y al desmontar no quedan
  listeners colgados.

## Templates en mobile y tablet

Los 9 templates en venta (MERIDIAN aparte) tienen un piso común de 320 px en
adelante, medido por `npm run check:mobile` sección por sección:

- **Texto:** micro-labels de 11 px o más, cuerpo de 14 px o más, y ninguna
  palabra de un titular partida en dos líneas.
- **Toque:** controles de 44 px o más en táctil (24 px en desktop). Si el
  dibujo es más chico, `tpl-hit` agranda la zona sin mover el layout; los links
  dentro de un párrafo quedan exentos.
- **Nada tapado:** los rótulos de las secciones pinneadas quedan debajo de la
  nav fija; texto chico sobre fotos o 3D con chip o velo.
- **Reduced motion:** todo el contenido queda visible y nada se superpone.

Micro-interacciones (guía «The Award-Winning Web Developer», Detalle #6): la
capa `tpl-*` de `src/styles/tpl.css` (subrayado de links, zona de toque, foco
visible, cards que se elevan) y `ScrollRail`, la barra de scroll propia que
monta cada página con su paleta (solo con mouse). Viajan en el ZIP.

Imágenes: los originales viven en `design/masters/<sku>/` y no entran al build
ni al ZIP. `npm run images` genera WebP a tamaño completo más 640/1080 px (320
en recortes con alfa) y un `assets/images.js` por modelo; cada `<img>` usa
`imgAttrs` (`src/lib/responsiveImage.js`) con su `sizes`. Una foto que carga
el comprador sigue como `src` simple.

La auditoría corre contra el dev server; con `--snapshot` compila una copia
sin minificar y se puede seguir editando mientras corre. Las hojas de contacto
quedan en `storage/responsive-check/mobile/<sku>/sheet-normal.html`.

## Deploy

Ver [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Licencia

Código del marketplace: privado. Los ZIPs vendidos incluyen `LICENSE.txt` con watermark de orden/email.
