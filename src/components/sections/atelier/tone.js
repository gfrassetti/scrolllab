import { mixHex } from '../../../lib/themeVars'

/**
 * El degradé de una tarjeta (lo que se ve sin foto, o detrás mientras carga)
 * a partir de un solo color: oscuro → el color → claro, como los de la demo.
 * @param {string} color `#rrggbb`
 */
export function cardTone(color) {
  return {
    backgroundImage: `linear-gradient(to bottom right, ${mixHex(color, '#000000', 0.55)}, ${color}, ${mixHex(color, '#ffffff', 0.65)})`,
  }
}
