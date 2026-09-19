# Plan orgánico (Fase 1): videos de las demos y comunidades

Costo: US$0. La idea es traer gente que ya es del público correcto (devs y
estudios que venden sitios) mostrando el producto, no diciendo que es bueno.

## Qué hay listo

| Pieza | Dónde | Comando |
|---|---|---|
| Video vertical por demo (`9x16-es.mp4` y `9x16-en.mp4`, unos 25 s, sin audio) | `media/marketing/<demo>/` | `npm run video:demos` |
| Texto para publicar por demo (es y en) con links con UTM por canal | `media/marketing/<demo>/caption-*.txt` | `npm run copy:social` |
| Tarjeta propia al compartir cada demo | `public/og/` | `npm run gen:og` |
| Franja del cupón (10% primera compra) en la home | `/#cupon` | — |
| Qué canal trajo cada mail | terminal | `npm run leads:stats` |

Qué ve quien mira el video (sin sonido, se entiende leyendo): arriba una frase que
dice qué es ("Webs que cuentan una historia mientras scrolleás"), la demo grande
scrolleando, a los pocos segundos el nombre del template y "React + GSAP, código
fuente incluido", y un cierre con "Llevate el código y usalo en tu proyecto", el
sitio y el 10% de la primera compra. La primera frase ya está en el cuadro 0, así
que sirve de portada.

Cada link que publiques lleva UTM (`utm_source`, `utm_medium`, `utm_campaign`) y
apunta a `/#cupon`. La primera visita queda guardada 30 días: quien vio un video
el lunes y se anota el jueves sigue contando como "del video".

## Antes de publicar (una sola vez)

1. Commit y deploy de todo lo pendiente. Sin eso el link lleva a un sitio sin cupón.
2. `EMAIL_ENABLED=true` en Railway (el mail del cupón). Sin eso el cupón igual se ve en pantalla.
3. Tag de GA4 para el evento `generate_lead` en GTM.
4. Una compra de prueba con cupón con credenciales de prueba de Mercado Pago.
5. Reservar los perfiles. `@scrolllab` en Instagram ya existe y parece de otra marca: probá `@scrolllab.dev` o similar.
6. Los videos en inglés esperan al cobro en dólares. Hoy Mercado Pago cobra en pesos y una tarjeta de afuera muchas veces no pasa (Fase 0, pendiente: comercio intermediario tipo Polar o Lemon Squeezy). Hasta entonces publicá solo los `-es`; con los `-en` traés gente que no puede comprar.

## Calendario de 4 semanas

Tres publicaciones por semana. El mismo video vertical sale a Reels, TikTok y
Shorts, y también a X y LinkedIn.

| Semana | Lunes | Miércoles | Viernes |
|---|---|---|---|
| 1 | chapters | nocturne | monolith |
| 2 | velocity | fizz | atelier |
| 3 | comic | unity | atrium |
| 4 | el que mejor haya andado | un "cómo está hecho" (ver abajo) | balance y ajustes |

Empezá por chapters y nocturne: son los más fáciles de entender en tres segundos.
Un modelo distinto por día evita repetir el mismo video.

## Cómo publicar un video

1. Elegí el archivo (`9x16-es.mp4` para público de Argentina y LatAm; `9x16-en.mp4` para el resto, recién cuando exista el cobro en dólares: ver el punto 6 de arriba).
2. Copiá el texto de `caption-es.txt` o `caption-en.txt`. Tiene tres bloques: uno con "link en la bio", uno con el link en el texto (X, LinkedIn) y la lista de links por canal.
3. En la bio de la red poné el link de ese canal con la campaña del video del día. Lo cambiás cada vez.
   Los videos no traen audio: en Instagram y TikTok elegí un tema sin letra de la propia app al subirlos (los que ya están habilitados para uso comercial), y en Shorts lo mismo.
4. Respondé todos los comentarios las primeras horas. Ahí está buena parte del alcance.
5. Anotá en una hoja qué publicaste y cuándo, para cruzarlo con `leads:stats`.

## Comunidades (una por semana, no todas juntas)

Mostrar el trabajo, no vender. Antes de postear, leé las reglas de cada
comunidad: casi todas limitan la autopromoción y algunas tienen un hilo semanal
para mostrar proyectos. Participá un par de días antes respondiendo dudas.

- **Reddit** (r/webdev, r/reactjs, r/threejs, r/web_design): "Hice un template scrollytelling en React + GSAP, ¿qué opinan del scroll?" con el video. Un subreddit por semana.
- **Hacker News**: "Show HN: Scroll-driven website templates in React + GSAP". Tiene que poder probarse: las demos son públicas.
- **Codrops y medios de creative dev**: un tutorial de una técnica de una demo, por ejemplo el héroe con máscara por letra de CHAPTERS. Revisá cómo se envían colaboraciones.
- **Discords y grupos de devs de LatAm**: mostrar una demo cuando alguien pregunta por animaciones en scroll.
- **Mensajes directos a estudios y freelancers**: 10 por semana, con la demo que mejor les cierra y el link con `utm_source=dm`. Es lo más lento y lo que más convierte.

## El "cómo está hecho" de la semana 4

Un hilo o carrusel corto: una técnica, 3 capturas, el código de 10 líneas y el
link. Muestra la calidad del código antes de que compren, que era la duda que
más frena a un dev.

Borrador listo (sale de un bug real del héroe de CHAPTERS, `HeroKinetic.jsx`).
Capturas: el video `chapters/16x9-es.mp4` en el segundo 0 al 2, y una captura
del "storv" si la tenés de antes del arreglo.

**Hilo en español (X / LinkedIn)**

1. Bug de la semana: mi héroe decía «storv». La cola de la «y» en cursiva quedaba cortada 🧵
2. Causa: con `SplitText` de GSAP, `mask: 'chars'` recorta cada letra a la altura de su línea. Con `line-height: .82` esa caja es más baja que el glifo.
3. El arreglo (agrandar la máscara hacia abajo; el margen negativo deja el layout igual):

   ```js
   const split = new SplitText('[data-hero-line]', { type: 'chars', mask: 'chars' })

   for (const mask of split.masks) {
     mask.style.paddingBottom = '0.2em'
     mask.style.marginBottom = '-0.2em'
   }

   gsap.from(split.chars, { yPercent: 135, duration: 1.3, ease: 'power4.out', stagger: 0.03 })
   ```

4. ¿Por qué `135` y no `100`? Con la máscara más alta, al 100% se asoma un pedazo de la letra antes de que arranque la animación.
5. Ese héroe es de CHAPTERS, un template scrollytelling en React + GSAP con código fuente. Demo y 10% en tu primera compra: https://www.scrolllab.com.ar/?utm_source=x&utm_medium=social&utm_campaign=como-esta-hecho#cupon

**Thread in English**

1. Bug of the week: my hero read "storv". The tail of the italic "y" was clipped 🧵
2. Cause: GSAP `SplitText` with `mask: 'chars'` clips each letter to its line's height. With `line-height: .82` that box is shorter than the glyph.
3. The fix (grow the mask downward; the negative margin keeps the layout the same): same snippet as above.
4. Why `135` and not `100`? With the taller mask, at 100% a sliver of the letter peeks in before the animation starts.
5. That hero ships in CHAPTERS, a scrollytelling template in React + GSAP with full source code. Demo and 10% off your first purchase: https://www.scrolllab.com.ar/?utm_source=x&utm_medium=social&utm_campaign=como-esta-hecho#cupon

El hilo en inglés recién sirve cuando exista el cobro en dólares (punto 6 de
"Antes de publicar").

## Qué mirar cada semana

```bash
npm run leads:stats
```

Muestra mails y cupones canjeados por canal y por campaña. Cuatro números:

1. Mails por canal.
2. Cupones canjeados (compras) por canal.
3. Qué demo trae más mails (`utm_campaign`).
4. Cuántos mails llegaron "directo" (sin UTM): son los que no supiste rastrear.

Reglas de corte:

- Un canal que en 3 semanas no trae ningún mail se abandona.
- El que trae, se duplica: más frecuencia y más variantes.
- Con datos de 3 a 4 semanas se puede decidir si vale sumar plata (Fase 2).

## Cuándo sumar plata (Fase 2)

Cuando ya sepas cuántos mails por semana trae lo orgánico y qué porcentaje
canjea. Recién ahí, retargeting a quien visitó una demo y no se anotó: US$3 a 5
por día, con un tope y un criterio de corte definidos de antemano.

## Regenerar el contenido

- Cambió una demo: `npm run build && npm run preview` y `npm run video:demos -- --skus nocturne`.
- Cambió una descripción en los textos: `npm run copy:social`.
- Los videos se graban frame a frame (no dependen de la velocidad de la máquina) y tardan unos 2 a 3 minutos por demo.
- Quiero cambiar un texto o el diseño del video sin volver a grabar: `npm run video:demos -- --skus chapters --keep` una vez (guarda los frames) y después `-- --skus chapters --reuse` (re-arma en un minuto).
- Una demo 3D pesada (fizz) tarda mucho: agregá `--gpu` para que use la placa de video (Windows).
