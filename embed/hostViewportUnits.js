/*
 * Paso del build del frame (embed/vite.config.js). Módulo aparte para testearlo
 * con `node --test` sin levantar Vite.
 */

/**
 * `vh` / `svh` / `dvh` / `lvh` dentro del iframe miden el IFRAME, que en FLOW
 * mide lo que su contenido: una sección con `pt-[30svh]` se retroalimentaba y
 * crecía sin fin (ManifestoType en desktop pasaba los 4000px y seguía). Se
 * reescriben a `calc(var(--sl-vh,1vh)*N)` y el frame fija `--sl-vh` con el
 * alto del viewport del SITIO (se lo pasa el loader): miden lo mismo que en una
 * página común. Solo dentro de `{…}` (declaraciones): los selectores
 * (`.pt-\[30svh\]`) no se tocan. Sin `--sl-vh` (frame abierto suelto) queda
 * `1vh`, que ahí sí es la ventana.
 */
const HOST_VH_RE = /(^|[^\w.\\-])(-?(?:\d+\.\d+|\d+|\.\d+))(?:svh|dvh|lvh|vh)(?![\w-])/g
export function hostViewportUnits(css) {
  return css.replace(
    /\{([^{}]*)\}/g,
    (_, body) =>
      `{${body.replace(HOST_VH_RE, (_m, pre, n) => `${pre}calc(var(--sl-vh,1vh)*${n})`)}}`,
  )
}
