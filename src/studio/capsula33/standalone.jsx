import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../index.css'
import { bootMotionOverride } from '../../lib/motionOverride'
import Capsula33Page from './Capsula33Page'

/**
 * Entrada propia de cāpsula33 para publicar solo esta página (`npm run build:capsula33`):
 * sin el market, sin el API y sin el resto de los templates. En el repo la ruta
 * `/estudio/capsula33` sigue existiendo solo en local (src/App.jsx).
 */
bootMotionOverride()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Capsula33Page />
  </StrictMode>,
)
