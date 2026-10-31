/**
 * Self-drawing SVG, shared by Process (the plan) and Services (the figure of each plate).
 *
 *   <Line d="…" />      a stroke that is drawn from its start to its end (`pathLength` 1 + dash offset)
 *   <Dim d="…" />       a dashed or hatched line: it cannot take a dash offset, so it fades in
 *   <Fill d="…" />      a filled shape (the rust slab): it fades in
 *   <Note x y>…</Note>  a small label: it fades in
 *
 * `hideDrawn(root)` puts everything in a group at its starting point and `drawTimeline(root)` returns a timeline that
 * brings it in. Without calling them (reduce motion) the drawing is simply there, complete.
 */

export const Line = ({ d, className = '', ...rest }) => <path d={d} pathLength="1" data-draw className={className} {...rest} />
export const Dim = ({ d, className = '', ...rest }) => <path d={d} data-fade className={`od-dim-line ${className}`} {...rest} />
export const Fill = ({ d, className = '', ...rest }) => <path d={d} data-fade className={`od-fill ${className}`} {...rest} />
export const Note = ({ x, y, children, anchor = 'start', className = '' }) => (
  <text x={x} y={y} textAnchor={anchor} data-fade className={`od-note ${className}`}>
    {children}
  </text>
)
