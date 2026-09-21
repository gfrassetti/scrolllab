# Motion for React + Componentry — toolkit de templates inmersivas

> Qué es: dos herramientas nuevas en el stack para construir **immersive
> scrolling templates**. Ninguna reemplaza a GSAP — se reparten el trabajo.
> Instaladas el 2026-09-20.

## Reparto de responsabilidades (regla principal)

| Capa | Herramienta | Por qué |
|---|---|---|
| **Scroll / storytelling** | **GSAP + ScrollTrigger + Lenis** | Sigue siendo el motor. Todos los primitivos P1–P14 y Beat corren acá. No migrar. |
| **Micro-interacción de componente** | **Motion for React** (`motion`) | Enter/exit, layout animations, gestos, springs. Lo que en GSAP es incómodo dentro de React. |
| **Piezas listas para copiar** | **Componentry** (`componentry.dev`) | Componentes MIT copy-paste. El código queda en el repo, no es dependencia. |

**Cuándo NO usar Motion:** cualquier cosa atada al scroll. Si el efecto se
scrubea con el scroll, es GSAP/ScrollTrigger. Mezclar los dos motores en el
mismo elemento pelea por el `transform`.

## Motion for React (motion.dev)

Sucesor de Framer Motion. Instalado: `motion@13`.

```js
import { motion, AnimatePresence } from 'motion/react'

<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
/>
```

Instalación (ya hecha): `npm install motion` · import desde `motion/react`.

Lo que aporta a las templates inmersivas:

- **`AnimatePresence`** — animaciones de salida cuando React desmonta. GSAP no
  puede hacerlo solo (el nodo ya no existe).
- **Layout animations** (`layout`, `layoutId`) — shared element transitions
  entre secciones sin calcular posiciones a mano.
- **`useReducedMotion`** — respeta la preferencia del sistema.
- **`LazyMotion`** — baja el bundle a ~4.6 kb si el template usa poco.

Docs: <https://motion.dev/docs/react> · Instalación: <https://motion.dev/docs/react-installation>

### AI Kit — docs de Motion dentro del agente

```bash
npx motion-ai
```

Instala skills + un MCP server con la documentación de Motion **siempre
actualizada**, para que el agente (Claude Code, Cursor, etc.) la consulte sola
en vez de inventar API vieja de Framer Motion. La búsqueda de docs es gratis y
no pide token ni cuenta. Es **interactivo**: pregunta si instalar por proyecto o
global y qué agentes configurar → **lo corre el usuario**, no el agente.

Actualizar: `npx motion-ai@latest`. Docs: <https://motion.dev/docs/ai-kit-install>

## Componentry (componentry.dev)

Registro shadcn de componentes interactivos. MIT, hechos con React + Tailwind
(+ Framer Motion en varios). **No es una dependencia**: el CLI copia el código
al repo y a partir de ahí es nuestro.

```bash
npx shadcn@latest add @componentry/<componente>
```

### Cómo traer un componente nuevo

`shadcn init` **no** se corrió (tocaría la config de Tailwind v4 y los tokens de
`src/index.css`), pero hay `components.json` + alias `@/`, así que el CLI de
`add` funciona directo y —por `tsx: false`— ya convierte el componente a `.jsx`.

```bash
npx shadcn@latest add @componentry/<componente> --dry-run   # 1) ver qué escribiría
npx shadcn@latest add @componentry/<componente>             # 2) traerlo
```

Después, tres retoques (el registro está pensado para proyectos Next/TS):

1. **`framer-motion` → `motion/react`.** Si el CLI lista `framer-motion` como
   dependencia, cambiá el import del archivo nuevo por `motion/react` y corré
   `npm uninstall framer-motion`. Es la misma librería (`motion` es su sucesora);
   dejar los dos duplica el motor de animación en el bundle.
2. **`motion.span` → `Motion.span`** (`import { motion as Motion } …`): la regla
   `no-unused-vars` del repo sólo reconoce como usados los identificadores que
   empiezan en mayúscula.
3. Correr `npx eslint <archivo>` y `npm test`.

Sin el CLI, el camino manual sigue valiendo: bajar
`https://componentry.dev/r/<componente>.json`, sacar `files[].content`, convertir
TSX → JSX y guardarlo en `src/components/ui/<Nombre>.jsx`.

### Ya instalado

| Componente | Archivo | Dependencias |
|---|---|---|
| `text-morph` | `src/components/ui/TextMorph.jsx` | `clsx`, `tailwind-merge` |
| `kinetic-text-reveal` | `src/components/ui/KineticTextReveal.jsx` | `motion` (era `framer-motion`), `clsx`, `tailwind-merge` — **usado en los beats de PLUM** |

> **Hay dos `TextMorph` en el repo.** `src/components/ui/TextMorph.jsx` es el port
> fiel de Componentry (filtro SVG de umbral = efecto "gooey") y hoy **no lo usa
> nadie**. El hero del home usa `src/components/TextMorph.jsx`, una versión propia
> más simple (blur + fade, "inspirada en" Componentry). Si se unifican, decidir
> cuál queda y borrar la otra.

`ui/TextMorph` hace una transición fluida entre palabras con un filtro SVG de
umbral y dos capas cruzándose (sin librería de animación). Uso:

```jsx
import { TextMorph } from '../components/ui/TextMorph'

<TextMorph words={['SCROLL', 'STORY', 'SHIP']} interval={2600} />
```

Helper compartido: `src/lib/utils.js` exporta `cn()` (clsx + tailwind-merge),
que es lo que esperan todos los componentes de registros shadcn.

## Uso en PLUM: revelado de títulos (`KineticTextReveal`)

Cada beat de `story.json` (sin `<em>`) revela su título línea por línea con blur
suave al entrar. Reparto para que GSAP y Motion **no compartan ningún nodo**:

| Quién | Qué toca |
|---|---|
| `FilmScroll` (GSAP ticker) | opacidad + `translateY` del **contenedor** del beat, según el scroll |
| `KineticTextReveal` (Motion) | los **segmentos de texto de adentro** (`opacity`, `blur`, `y`) |

- `autoPlay={false}` + ref imperativo: `layoutBeats()` llama `play()` al entrar el
  beat y `reset()` al salir. Ver `titleRefs` / `beatActiveRef` en `FilmScroll.jsx`.
- **Histéresis** (entra con opacidad > 0.35, se rearma por debajo de 0.12): con el
  scroll parado justo en el umbral no se re-dispara en loop.
- Los títulos con `<em>` (cara script) mantienen el render clásico
  (`renderTitle`) porque el componente sólo acepta texto plano.
- **Verificar sin ver la pantalla:** con la pestaña oculta el navegador congela
  `requestAnimationFrame` y la animación no se ve. En DEV,
  `window.__plum.info.reveal` cuenta los disparos (`{ play, reset }`):
  `window.__plum.seek(0.08)` → `play: 1`; repetir el mismo `seek` no suma.

## MCP de Componentry (shadcn)

Sirve para que el agente busque/traiga componentes del registro en lenguaje
natural ("agregá el kinetic text reveal"). Está configurado **sin correr
`shadcn init`** (que toca la config de Tailwind v4):

| Archivo | Para qué |
|---|---|
| `components.json` | registro `@componentry`, `tsx: false`, css `src/index.css` |
| `jsconfig.json` | alias `@/*` → `src/*` (el CLI lo exige para arrancar) |
| `vite.config.js` | mismo alias `@` para que resuelva en build |
| `.mcp.json` | servidor `npx shadcn@latest mcp` |

- **Alias `@/`: sólo para `src/components/ui/*` y `src/lib/*`.** No lo uses en
  `src/components/sections/*`: esas carpetas se copian verbatim al ZIP y el
  proyecto del comprador no tiene el alias.
- El primer arranque de `npx` en Windows tarda más de 30 s → Claude Code marca
  `CONNECT_TIMEOUT`. Con el paquete ya en caché el saludo de protocolo responde en
  ~4 s. Es un servidor de **proyecto**: se reconecta con `/mcp` (lo hace el
  usuario) y la primera vez pide aprobarlo.
- El registro completo también se consulta sin MCP:
  `npx shadcn@latest search @componentry -q "text"` o
  `https://componentry.dev/r/registry.json` (54 componentes).

### Evaluados para PLUM

PLUM es **una sola película** — nada de secciones apiladas. Sólo sirve lo que se
superpone al canvas.

| Componente | Veredicto |
|---|---|
| `kinetic-text-reveal` | ✅ **conectado** — expone `play()`/`reset()`, encaja con beats controlados por scroll |
| `text-morph` | port fiel en `ui/` sin usar (el home usa su propia versión simple); candidato para PLUM: rotar palabras en el kicker del hero |
| `scroll-based-velocity` | candidato: texto que se inclina según la velocidad del scroll; falta probar con Lenis |
| `grain-gradient` | candidato: grano/luz sobre el canvas (sin dependencias); falta medir costo en GPU |
| `letter-cascade`, `text-repel`, `annotated-text` | descartados por ahora: no aportan al relato del film |
| Bloques de sección (`pricing-*`, `hero-*`, `sticky-scroll-cards`, `scroll-split-card`…) | ❌ rompen la regla de "una sola película continua" |

## Efecto en el ZIP que se vende (verificado en `server/packaging.js`)

El empaquetador copia **sólo**: la lista fija `SHARED`, la carpeta de la sección
del modelo y los archivos WebGL si hacen falta (`needsWebgl`). **No sigue
imports relativos.** Y el `package.json` del ZIP se arma con lo que importan los
archivos *que sí se copian* (las versiones salen del `package.json` raíz).

Consecuencia: un componente de `src/components/ui/` (o `src/lib/utils.js`)
importado desde una sección **no viaja** en el ZIP, y sus dependencias
(`motion`, `clsx`, `tailwind-merge`) tampoco se agregan.

> **Bloqueante antes de vender PLUM.** `FilmScroll` importa
> `../../ui/KineticTextReveal` (→ `../../lib/utils`). Hoy no afecta a nadie
> porque PLUM está en `LOCAL_ONLY_SKUS`, pero un ZIP de PLUM saldría roto.
> Salidas: (1) sumar esos dos archivos al pack con el patrón de
> `WEBGL_FILES`/`needsWebgl`, o (2) co-ubicarlos en `src/components/sections/plum/`.
> `npm test` (`packaging.test.js`) lo va a marcar al liberar PLUM.

**Regla para los templates que se venden hoy:** no importar `components/ui/*` ni
`lib/utils` desde sus secciones.

Después de usar cualquiera de los dos en un template, correr:

```bash
npm test          # incluye packaging.test.js (arma el ZIP y verifica imports)
npm run check     # invariantes cruzadas (hoy falla sólo por plum/signal, esperado)
```
