import SmoothScrollProvider from '../components/SmoothScrollProvider'
import ScrollRail from '../components/ScrollRail'
import NavComic from '../components/sections/comic/NavComic'
import ChapterRail from '../components/sections/comic/ChapterRail'
import ChapterDusty from '../components/sections/comic/ChapterDusty'
import ChapterBond from '../components/sections/comic/ChapterBond'
import ChapterFork from '../components/sections/comic/ChapterFork'
import ChapterWorlds from '../components/sections/comic/ChapterWorlds'
import FooterComic from '../components/sections/comic/FooterComic'

/**
 * Template model — "COMIC"
 * Comic-book scrollytelling: torn paper panels, layered scenes,
 * chapter rail, hotspot cards. All copy is generic placeholder.
 */
export default function ComicPage() {
  return (
    <SmoothScrollProvider>
      <div id="top" className="tpl-world bg-[#1f1c19] text-white selection:bg-comic-flare selection:text-white">
        <ScrollRail trackClassName="bg-white/10" fillClassName="bg-comic-flare" />
        <NavComic />
        <ChapterRail />

        <main>
          <ChapterDusty />
          <ChapterFork />
          <ChapterBond />
          <ChapterWorlds />
        </main>

        <FooterComic />
      </div>
    </SmoothScrollProvider>
  )
}
