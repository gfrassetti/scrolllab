/**
 * Íconos de la ficha técnica de un template (ProductPage): un solo trazo de
 * 1.5 en una caja de 20, todos con `currentColor`. Una clave por dato de
 * `productSpecs` (src/lib/productPages.js); una clave nueva sin dibujo cae en
 * el punto.
 */
const PATHS = {
  stack: (
    <>
      <path d="M7 6 3 10l4 4" />
      <path d="m13 6 4 4-4 4" />
      <path d="m11.5 4-3 12" />
    </>
  ),
  motion: (
    <>
      <path d="M2.5 13.5c2.5 0 3-7 5.5-7s3 7 5.5 7 2.5-3.5 4-3.5" />
    </>
  ),
  webgl: (
    <>
      <path d="m10 2.5 6.5 3.75v7.5L10 17.5l-6.5-3.75v-7.5Z" />
      <path d="m3.5 6.25 6.5 3.75 6.5-3.75" />
      <path d="M10 10v7.5" />
    </>
  ),
  responsive: (
    <>
      <rect x="2.5" y="4" width="11" height="8" rx="1" />
      <path d="M5.5 15h5" />
      <rect x="14" y="7.5" width="4" height="8" rx="1" />
    </>
  ),
  sections: (
    <>
      <rect x="3" y="3" width="14" height="4" rx="1" />
      <rect x="3" y="9" width="14" height="3" rx="1" />
      <rect x="3" y="14" width="14" height="3" rx="1" />
    </>
  ),
  form: (
    <>
      <rect x="2.5" y="4" width="15" height="4.5" rx="1" />
      <rect x="2.5" y="11" width="15" height="4.5" rx="1" />
      <path d="M5 13.25h4" />
    </>
  ),
  docs: (
    <>
      <path d="M5 2.5h6.5L15 6v11.5H5Z" />
      <path d="M11.5 2.5V6H15" />
      <path d="M7.5 10h5M7.5 13h5" />
    </>
  ),
  builder: (
    <>
      <path d="m10 3 7 3.5-7 3.5-7-3.5Z" />
      <path d="m3 10 7 3.5 7-3.5" />
      <path d="m3 13.5 7 3.5 7-3.5" />
    </>
  ),
  calm: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M8 7.5v5M12 7.5v5" />
    </>
  ),
  check: <path d="m4 10.5 4 4 8-9" />,
  share: (
    <>
      <path d="M8.5 11.5a3 3 0 0 0 4.24 0l2.83-2.83a3 3 0 0 0-4.24-4.24l-.7.7" />
      <path d="M11.5 8.5a3 3 0 0 0-4.24 0l-2.83 2.83a3 3 0 0 0 4.24 4.24l.7-.7" />
    </>
  ),
}

export default function SpecIcon({ name, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name] || <circle cx="10" cy="10" r="2" />}
    </svg>
  )
}
