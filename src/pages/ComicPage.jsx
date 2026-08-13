import SmoothScrollProvider from '../components/SmoothScrollProvider'
import TemplateBuyPill from '../components/TemplateBuyPill'
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
      <div id="top" className="bg-[#1f1c19] text-white">
        <NavComic />
        <ChapterRail />

        <main>
          <ChapterDusty />
          <ChapterBond />
          <ChapterFork />
          <ChapterWorlds />
        </main>

        <FooterComic />
        <TemplateBuyPill sku="comic" name="COMIC" />
      </div>
    </SmoothScrollProvider>
  )
}
