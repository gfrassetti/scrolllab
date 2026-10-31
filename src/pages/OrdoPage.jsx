import Site from '../components/sections/ordo/Site'

/**
 * Template model — "ORDO"
 *
 * World: a drafter's sheet of paper. An architecture and interiors studio in Lisbon whose page is the plan on the
 * table: paper with grain, black ink and a single colour, the rust of the slab on its logo. The hero draws a shop
 * piece by piece, from the raw shell to the photograph of the finished space, and then turns back into a sketch as it
 * leaves; the projects open as horizontal strips with parallax.
 *
 * The page itself (loader, cursor, ruler, route between the home and a project) lives in
 * `sections/ordo/Site.jsx`, so the packaged App.jsx only needs this wrapper.
 */
export default function OrdoPage() {
  return <Site />
}
