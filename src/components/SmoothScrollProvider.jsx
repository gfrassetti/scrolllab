import { useLenis } from '../hooks/useLenis'

/**
 * Wrap the whole page once. Everything inside scrolls through Lenis,
 * and every ScrollTrigger stays in sync automatically.
 */
export default function SmoothScrollProvider({ children }) {
  useLenis()
  return children
}
