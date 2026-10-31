import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../index.css'
import OrdoPage from '../../pages/OrdoPage'

/**
 * Entrada propia de elStudio para publicar solo esta página (`npm run build:elstudio`):
 * sin el market, sin el API y sin el resto de los templates. En el repo la ruta
 * `/estudio/elstudio` sigue existiendo solo en local (src/App.jsx).
 * A diferencia del market, acá se respeta «reducir movimiento» del dispositivo.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OrdoPage />
  </StrictMode>,
)
