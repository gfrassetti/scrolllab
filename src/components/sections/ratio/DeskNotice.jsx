/**
 * Mobile gate — this scrollytelling is a desktop template.
 * Same beat as the GRIDS model: mark + word, three lines, one black slab.
 */
export default function DeskNotice({
  brand = 'RATIO',
  line1 = 'Rotate your device',
  line2 = 'for the best experience.',
  line3 = 'This template is built for desktop.',
}) {
  return (
    <div
      data-desk-notice
      role="region"
      aria-label="Desktop only"
      className="fixed inset-0 z-[80] flex flex-col bg-white text-[#111] lg:hidden"
    >
      <div className="flex flex-1 flex-col px-5 pt-8 sm:px-6">
        <p className="flex items-center gap-3 font-grotesk text-[clamp(2.4rem,12vw,3.5rem)] font-medium leading-none tracking-[-0.045em] uppercase">
          <span aria-hidden="true" className="size-[0.78em] shrink-0 bg-[#111]" />
          {brand}
        </p>
        <p className="mt-8 max-w-[24ch] text-[15px] leading-[1.35] tracking-[-0.012em]">
          {line1}
          <br />
          {line2}
          <br />
          {line3}
        </p>
        <div className="mt-10 h-[min(22vh,11rem)] w-full bg-[#111]" />
      </div>
    </div>
  )
}
