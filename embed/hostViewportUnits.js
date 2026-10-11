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

/**
 * Lo mismo para un `style=""` inline (`minHeight: 'calc(100svh + 9rem)'`,
 * `height: \`${n * 100}vh\``, `'--gap': '12svh'`): el build solo ve el CSS, y
 * esos valores también medían el iframe. Lo usa el frame sobre cada `style`
 * que escribe una sección. Sin fallback a `1vh` a propósito: así el resultado
 * ya no tiene unidades de viewport y reescribirlo de nuevo no cambia nada (el
 * frame siempre fija `--sl-vh` antes de montar la sección).
 */
export function hostViewportUnitsInline(style) {
  return String(style).replace(HOST_VH_RE, (_m, pre, n) => `${pre}calc(var(--sl-vh)*${n})`)
}
