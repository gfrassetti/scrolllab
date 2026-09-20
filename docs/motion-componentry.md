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

### Ojo: este repo no tiene shadcn inicializado

No hay `components.json` ni alias `@/`, y el repo es **JSX, no TypeScript**. Los
componentes del registro vienen en `.tsx` e importan `cn` desde `@/lib/utils`.
Correr `shadcn init` tocaría la config de Tailwind v4 (que tiene tokens propios
en `src/index.css`), así que el flujo es **manual**:

1. Bajar el JSON del registro: `https://componentry.dev/r/<componente>.json`
2. Sacar `files[].content`, convertir TSX → JSX (borrar tipos)
3. Guardar en `src/components/ui/<Nombre>.jsx`
4. Cambiar `from "@/lib/utils"` por `from '../../lib/utils'`
5. Instalar lo que liste `dependencies` del JSON

### Ya instalado

| Componente | Archivo | Dependencias |
|---|---|---|
| `text-morph` | `src/components/ui/TextMorph.jsx` | `clsx`, `tailwind-merge` |

`TextMorph` hace una transición fluida entre palabras con un filtro SVG de
umbral y dos capas cruzándose (sin librería de animación). Uso:

```jsx
import { TextMorph } from '../components/ui/TextMorph'

<TextMorph words={['SCROLL', 'STORY', 'SHIP']} interval={2600} />
```

Helper compartido: `src/lib/utils.js` exporta `cn()` (clsx + tailwind-merge),
que es lo que esperan todos los componentes de registros shadcn.

## Efecto en el ZIP que se vende

El `package.json` del template **se genera a partir de los imports del código**
(ver `server/packaging.js`). O sea:

- Si una sección importa `motion/react`, el comprador recibe `motion` en sus
  dependencias automáticamente. No hay que tocar nada.
- Los componentes de Componentry viajan como **código fuente** dentro del ZIP
  (son archivos del repo), así que no suman dependencia ni problema de licencia
  — MIT permite redistribuir.

Después de usar cualquiera de los dos en un template, correr:

```bash
npm test          # incluye packaging.test.js (arma el ZIP y verifica imports)
npm run check     # invariantes cruzadas
```
