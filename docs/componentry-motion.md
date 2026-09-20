# Componentry + Motion

> Micro-interacciones de **componente** (texto, botones, cards sueltas). No es scroll
> storytelling — eso sigue siendo GSAP + Lenis, ver [`docs/motion-cookbook.md`](motion-cookbook.md).
> Regla 8 de `AGENTS.md`.

## Qué es cada cosa

| Pieza | Qué es | Dónde |
|---|---|---|
| [Componentry](https://componentry.dev) | Librería de componentes UI "copy-paste" (React + Tailwind, filosofía shadcn) | repo [harshjdhv/componentry](https://github.com/harshjdhv/componentry) |
| [Motion](https://motion.dev/docs/react) | Motor de animación (ex Framer Motion) — dependencia de algunos componentes de Componentry | paquete npm `motion` |
| `cn()` | Helper `clsx` + `tailwind-merge`, convención shadcn | `src/lib/utils.js` |

Instalados hoy: `motion`, `clsx`, `tailwind-merge` (deps) y `src/components/ui/text-morph.jsx`
(componente `TextMorph`, ver su JSDoc para props). `text-morph` en particular **no** usa
`motion` — es rAF + filtro SVG puro —, pero queda instalado para los próximos componentes
de Componentry que sí lo requieran.

## Gotcha: el CLI de shadcn no funciona en sandboxes remotos

`npx shadcn@latest add @componentry/<nombre>` resuelve el namespace `@componentry` contra
`ui.shadcn.com/r/registries.json`. En un entorno de Claude Code on the web (proxy de egress
por whitelist), **`ui.shadcn.com`, `componentry.dev` y `motion.dev` están bloqueados** —
confirmado corriendo el comando, no es un supuesto. El CLI falla con `connect_rejected`.

`raw.githubusercontent.com` **sí** funciona ahí. Como Componentry es "copy-paste" (el
código vive en el repo, no en un paquete npm), el flujo manual es:

1. Ubicar el componente en el repo: `github.com/harshjdhv/componentry` →
   `packages/ui/src/components/<nombre>.tsx` (buscar por nombre en
   `packages/ui/src/components/`).
2. Bajar el archivo real con `curl` a `raw.githubusercontent.com/harshjdhv/componentry/main/<path>`
   — **no** con WebFetch: WebFetch resume/parafrasea el contenido en vez de devolverlo
   literal, y un componente parafraseado no es el mismo código.
3. Adaptar a las convenciones de este repo (es JS, no TS — no hay `tsconfig`):
   - Sacar `"use client"` (directiva de Next.js App Router, no aplica en Vite).
   - Sacar tipos: `interface Props`, anotaciones `: Tipo`, genéricos (`useRef<T>()` →
     `useRef()`), non-null assertion (`valor!` → `valor`).
   - `import { cn } from "@workspace/ui/lib/utils"` → `import { cn } from '<ruta relativa a src/lib/utils>'`.
4. Guardar en `src/components/ui/<nombre>.jsx`.

Si en algún momento se corre esto en local (no en un sandbox con proxy) o el proxy suma
esos dominios al whitelist, el CLI (`npx shadcn@latest add @componentry/<nombre>`) hace
todo esto solo y es preferible — este proceso manual es el fallback, no la regla.

## Cuándo usar Motion vs GSAP

- **GSAP + ScrollTrigger** (`docs/motion-cookbook.md`): scroll storytelling cinematográfico,
  pin/scrub, todo lo que vende un template/LAB. No se toca.
- **Motion**: animación de un componente de UI aislado que no vive en el scroll narrativo
  (ej. un botón, un badge, un widget de Componentry). Chrome del market en general sigue
  siendo Emil Kowalski + tokens de easing en `src/index.css` (regla 2 de `AGENTS.md`); Motion
  entra solo cuando el componente de Componentry ya lo trae como dependencia.
