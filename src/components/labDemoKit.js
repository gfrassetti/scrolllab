/**
 * Tokens compartidos por los demos animados de LAB (LabDemo, LabDemoSync,
 * BuilderDemo). La paleta vive en src/index.css como `--ld-*` sobre :root y
 * html.dark — así los demos flipean con el tema del sitio.
 */

// Chico: los demos de /lab, dos por fila.
export const LD_STAGE_CLASS =
  'relative h-[360px] w-full overflow-hidden rounded-xl border border-[var(--ld-line2)] bg-[var(--ld-bg)] sm:h-[420px]'

// Grande: el demo del Builder en la home, uno solo y centrado (~1300×720 en
// desktop).
export const LD_STAGE_CLASS_HERO =
  'relative h-[440px] w-full overflow-hidden rounded-xl border border-[var(--ld-line2)] bg-[var(--ld-bg)] md:h-[560px] lg:h-[660px] xl:h-[720px]'

// Estilo inline del puntero falso (SVG). Vars → flipea con el tema.
export const LD_CURSOR_STYLE = {
  fill: 'var(--ld-ink)',
  stroke: 'var(--ld-surface)',
  strokeWidth: 1.5,
}
