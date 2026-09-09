import { useEffect, useState } from 'react'
import SmoothScrollProvider from '../components/SmoothScrollProvider'
import NavPlum from '../components/sections/plum/NavPlum'
import FilmScroll from '../components/sections/plum/FilmScroll'
import PlumFooter from '../components/sections/plum/PlumFooter'

/**
 * Template model — "PLUM"
 *
 * One continuous cinematic film. The whole story is told through a
 * scroll-scrubbed webp sequence on a fixed canvas — imagery flows chapter to
 * chapter (grove → pick → line → table → …) with text beats, colour washes,
 * mp4 clips and marks layered over the SAME canvas. A wordmark footer closes
 * the page. Every frame, line and mark is one entry in `public/plum/story.json`,
 * fetched here once and shared.
 */
export default function PlumPage() {
  const [story, setStory] = useState(null)

  useEffect(() => {
    let ok = true
    fetch('/plum/story.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => ok && setStory(j))
      .catch(() => ok && setStory(null))
    return () => {
      ok = false
    }
  }, [])

  return (
    <SmoothScrollProvider>
      <div id="top" className="plum-world bg-plum-void text-plum-mist">
        <a
          href="#end"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-plum-mist focus:px-4 focus:py-2 focus:text-plum-void"
        >
          Skip the film
        </a>
        <NavPlum story={story} />
        <main>
          <FilmScroll story={story} />
        </main>
        <div id="end">
          <PlumFooter story={story} />
        </div>
      </div>
    </SmoothScrollProvider>
  )
}
